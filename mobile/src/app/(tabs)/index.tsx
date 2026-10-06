import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/tabs';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Baseplate } from '../../components/Baseplate';
import { BrickButton } from '../../components/BrickButton';
import { Logo } from '../../components/Logo';
import { ResultCard } from '../../components/ResultCard';
import { ScanHistory } from '../../components/ScanHistory';
import { StackingBricks } from '../../components/StackingBricks';
import { TextLink } from '../../components/TextLink';
import { Tile } from '../../components/Tile';
import { UndoBar } from '../../components/UndoBar';
import { findFigureForScan } from '../../data/figures';
import { analyzePhoto, ScanCancelledError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { usePhotoHeight } from '../../lib/layout';
import { ebaySearchUrl, ebaySoldUrl, openInAppBrowser } from '../../lib/links';
import { pickPhoto, type PreparedPhoto } from '../../lib/photo';
import { recordScan } from '../../lib/scanCounter';
import { cleanUpPhotos, deletePhotos, loadScans, removeScans, restoreScans, saveScan, scanPhotoUri } from '../../lib/scanHistory';
import type { SavedScan, ScanResult } from '../../lib/types';
import { brand, fonts, useTheme } from '../../theme';

type PhotoSource = 'camera' | 'library';

type ScanState =
  | { kind: 'idle' }
  | { kind: 'analyzing'; scanId: number; photoUri: string }
  | { kind: 'result'; photoUri: string; result: ScanResult; estimatedAt: string; savedId?: string }
  | { kind: 'notFigure'; photoUri: string }
  | { kind: 'error'; message: string; photo?: PreparedPhoto };

/** "$8 to $15", read out by VoiceOver. */
function spokenRange([low, high]: [number, number]): string {
  return low === high ? formatPrice(low) : `${formatPrice(low)} to ${formatPrice(high)}`;
}

/** Tells VoiceOver users what just happened, since the screen changes without them tapping. */
function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

/** True when two scans have the same figure name, ignoring capital letters and spaces. */
function sameFigure(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

// Long enough to notice a mistake; VoiceOver users get longer to reach the Undo button.
const UNDO_MS = 6000;
const UNDO_MS_SCREEN_READER = 15000;
// A failed retry still shows the "Looking closely" screen this long, so it's clear it tried again.
const MIN_ATTEMPT_MS = 900;

export default function ScanScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const photoHeight = usePhotoHeight();
  const navigation = useNavigation<BottomTabNavigationProp<Record<string, undefined>>>();
  const scrollRef = useRef<ScrollView>(null);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [scans, setScans] = useState<SavedScan[]>([]);

  // Scans still waiting for an answer. A scan keeps running if the person looks at something
  // else meanwhile; it is still saved to "My scans" when it finishes.
  const running = useRef(new Map<number, AbortController>());
  const [inProgress, setInProgress] = useState(0);
  const nextScanId = useRef(0);
  // The scan whose progress is on screen right now (null when showing something else).
  const watchingScanId = useRef<number | null>(null);
  // True from tapping a scan button until the photo is ready, so a second tap can't start another scan.
  const preparing = useRef(false);
  const [busy, setBusy] = useState(false);
  // "Scan another" and "Try again" reopen whichever the person used last: the camera or their photos.
  const lastSource = useRef<PhotoSource>('camera');
  // Scans just removed from "My scans". Their photos are kept until the chance to undo has passed.
  const pendingRemoval = useRef<SavedScan[]>([]);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [undoMessage, setUndoMessage] = useState<string | null>(null);

  useEffect(() => {
    loadScans().then((saved) => {
      setScans(saved);
      cleanUpPhotos(saved);
    });
    const scansInFlight = running.current;
    const removal = pendingRemoval;
    return () => {
      scansInFlight.forEach((controller) => controller.abort());
      clearTimeout(undoTimer.current);
      deletePhotos(removal.current);
    };
  }, []);

  // Tapping the Scan tab while already on it goes back to the start.
  useEffect(
    () =>
      navigation.addListener('tabPress', () => {
        if (navigation.isFocused()) goHome();
      }),
    [navigation],
  );

  function scrollToTop() {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function show(next: ScanState) {
    watchingScanId.current = next.kind === 'analyzing' ? next.scanId : null;
    setState(next);
  }

  function goHome() {
    show({ kind: 'idle' });
    scrollToTop();
  }

  async function startScan(source: PhotoSource) {
    if (preparing.current) return;
    preparing.current = true;
    setBusy(true);
    lastSource.current = source;
    let photo: PreparedPhoto | null;
    try {
      photo = await pickPhoto(source);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Couldn’t open that photo.';
      show({ kind: 'error', message });
      announce(message);
      return;
    } finally {
      preparing.current = false;
      setBusy(false);
    }
    if (photo) await analyze(photo);
  }

  async function analyze(photo: PreparedPhoto) {
    const startedAt = Date.now();
    const scanId = ++nextScanId.current;
    const controller = new AbortController();
    running.current.set(scanId, controller);
    setInProgress(running.current.size);
    show({ kind: 'analyzing', scanId, photoUri: photo.uri });
    announce('Looking closely at your figure.');
    scrollToTop();

    const stillWatching = () => watchingScanId.current === scanId;

    try {
      const result = await analyzePhoto(photo.base64, controller.signal);
      recordScan(); // quietly counts today's scans (for a future daily limit)

      if (!result.isMinifigure) {
        if (stillWatching()) {
          show({ kind: 'notFigure', photoUri: photo.uri });
          announce('That doesn’t look like a minifigure.');
        }
        return;
      }
      if (stillWatching()) {
        show({ kind: 'result', photoUri: photo.uri, result, estimatedAt: new Date().toISOString() });
        announce(
          `${result.name}. Used ${spokenRange(result.valueUsed)}. New ${spokenRange(result.valueNew)}.` +
            (result.confidence === 'low' ? ' Not sure about this one. Try a clearer photo on a plain background.' : ''),
        );
      }
      try {
        const saved = await saveScan(photo.uri, result);
        setScans(await loadScans());
        // Once saved, the open result can offer "Remove from My scans".
        setState((prev) =>
          prev.kind === 'result' && prev.photoUri === photo.uri && !prev.savedId ? { ...prev, savedId: saved.id } : prev,
        );
      } catch {
        // Saving to "My scans" failed; the result is still on screen, so carry on.
      }
    } catch (e) {
      if (e instanceof ScanCancelledError || controller.signal.aborted || !stillWatching()) return;
      // With no signal a retry fails instantly; pause so the person can see it really tried again.
      const wait = MIN_ATTEMPT_MS - (Date.now() - startedAt);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (controller.signal.aborted || !stillWatching()) return;
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      // Keep the photo so "Try again" can send it again once the connection is back.
      show({ kind: 'error', message, photo });
      announce(message);
    } finally {
      running.current.delete(scanId);
      setInProgress(running.current.size);
    }
  }

  function stopScan() {
    const scanId = watchingScanId.current;
    if (scanId !== null) running.current.get(scanId)?.abort();
    show({ kind: 'idle' });
    announce('Scan stopped.');
  }

  function tryAgain() {
    if (state.kind === 'error' && state.photo) analyze(state.photo);
    else startScan(lastSource.current);
  }

  function openSavedScan(scan: SavedScan) {
    show({ kind: 'result', photoUri: scanPhotoUri(scan), result: scan.result, estimatedAt: scan.createdAt, savedId: scan.id });
    scrollToTop();
  }

  /** Takes scans out of "My scans", with a few seconds to undo it. */
  async function removeFromHistory(ids: string[], message: string) {
    // (Browsers always answer yes to this check, so the web version skips it.)
    const screenReader = Platform.OS !== 'web' && (await AccessibilityInfo.isScreenReaderEnabled().catch(() => false));
    let result: { kept: SavedScan[]; removed: SavedScan[] };
    try {
      result = await removeScans(ids);
    } catch {
      return;
    }
    finishRemoval(); // an earlier removal can no longer be undone
    setScans(result.kept);
    // If the scan on screen was removed, go back to the start.
    setState((prev) => (prev.kind === 'result' && prev.savedId && ids.includes(prev.savedId) ? { kind: 'idle' } : prev));
    pendingRemoval.current = result.removed;
    setUndoMessage(message);
    undoTimer.current = setTimeout(finishRemoval, screenReader ? UNDO_MS_SCREEN_READER : UNDO_MS);
    announce(`${message}. Undo is available for a few seconds.`);
  }

  /** The chance to undo has passed: delete the removed scans' photos and hide the Undo bar. */
  function finishRemoval() {
    clearTimeout(undoTimer.current);
    deletePhotos(pendingRemoval.current);
    pendingRemoval.current = [];
    setUndoMessage(null);
  }

  async function undoRemoval() {
    clearTimeout(undoTimer.current);
    const removed = pendingRemoval.current;
    pendingRemoval.current = [];
    setUndoMessage(null);
    try {
      setScans(await restoreScans(removed));
      announce('Put back in My scans.');
    } catch {
      // Couldn't put them back; the leftover photos are tidied up next time the app opens.
    }
  }

  const match = state.kind === 'result' ? findFigureForScan(state.result.name, state.result.theme) : undefined;
  // Older saved scans of the figure on screen, so a re-scan (say, in better light) can replace them.
  const shown = state.kind === 'result' && state.savedId ? scans.find((scan) => scan.id === state.savedId) : undefined;
  const earlier = shown
    ? scans.filter((s) => s.id !== shown.id && s.createdAt < shown.createdAt && sameFigure(s.result.name, shown.result.name))
    : [];

  return (
    <Baseplate>
      <ScrollView
        ref={scrollRef}
        // Extra room at the bottom while the Undo bar is showing, so it never hides the last scan.
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }, undoMessage ? styles.roomForUndo : null]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <Logo size={42} />
        </View>

        {state.kind === 'idle' ? (
          <Tile style={styles.hero}>
            <Text style={[styles.title, { color: t.text }]}>What’s your minifigure worth?</Text>
            <Text style={[styles.subtitle, { color: t.textMuted }]}>
              Stand your figure on a plain background and take a photo.
            </Text>
            <View style={styles.buttons}>
              <BrickButton label="Scan a minifigure" icon="camera" color={brand.red} variant="large" disabled={busy} onPress={() => startScan('camera')} />
              <BrickButton label="Choose from photos" icon="images" color={brand.yellow} disabled={busy} onPress={() => startScan('library')} />
            </View>
          </Tile>
        ) : null}

        {state.kind === 'analyzing' ? (
          <Tile style={styles.centered}>
            <Image source={{ uri: state.photoUri }} style={[styles.photo, { height: photoHeight, backgroundColor: t.photoBackground }]} resizeMode="contain" />
            <StackingBricks />
            <Text style={[styles.status, { color: t.text }]}>Looking closely at your figure…</Text>
            <BrickButton label="Stop" icon="stop-circle" color={t.neutralBrick} variant="small" onPress={stopScan} style={styles.stop} />
          </Tile>
        ) : null}

        {state.kind === 'result' ? (
          <View style={styles.resultBlock}>
            <ResultCard
              photoUri={state.photoUri}
              result={state.result}
              estimatedAt={state.estimatedAt}
              onFindForSale={() => openInAppBrowser(ebaySearchUrl(state.result.name))}
              onSeeSoldPrices={() => openInAppBrowser(ebaySoldUrl(state.result.name))}
              onScanAnother={() => startScan(lastSource.current)}
              onClose={goHome}
              marketplaceName={match?.name}
              onOpenMarketplace={match ? () => router.push(`/figure/${match.id}`) : undefined}
              onRemove={state.savedId ? () => removeFromHistory([state.savedId!], `Removed ${state.result.name}`) : undefined}
              earlierScans={earlier.length}
              onReplaceEarlier={() =>
                removeFromHistory(
                  earlier.map((s) => s.id),
                  earlier.length === 1 ? 'Replaced your earlier scan' : `Replaced ${earlier.length} earlier scans`,
                )
              }
            />
            <View style={[styles.disclaimerBox, { backgroundColor: t.card }]}>
              <Ionicons name="information-circle-outline" size={18} color={t.textMuted} />
              <Text style={[styles.disclaimer, { color: t.text }]}>
                Estimates only. Check recent sold listings for exact prices.
              </Text>
            </View>
          </View>
        ) : null}

        {state.kind === 'notFigure' ? (
          <Tile style={styles.centered}>
            <Image source={{ uri: state.photoUri }} style={[styles.photo, { height: photoHeight, backgroundColor: t.photoBackground }]} resizeMode="contain" />
            <Ionicons name="help-buoy" size={36} color={brand.red} />
            <Text style={[styles.status, { color: t.text }]}>That doesn’t look like a minifigure</Text>
            <Text style={[styles.help, { color: t.textMuted }]}>
              Make sure the figure fills most of the photo and stands on a plain background.
            </Text>
            <BrickButton label="Try again" icon="refresh" color={brand.red} onPress={tryAgain} style={styles.fullWidth} />
            <TextLink label="Back to start" onPress={goHome} />
          </Tile>
        ) : null}

        {state.kind === 'error' ? (
          <Tile style={styles.centered}>
            {state.photo ? (
              <Image source={{ uri: state.photo.uri }} style={[styles.errorPhoto, { backgroundColor: t.photoBackground }]} resizeMode="contain" />
            ) : null}
            <Ionicons name="alert-circle" size={36} color={brand.red} />
            <Text style={[styles.status, { color: t.text }]}>Oops, that didn’t work</Text>
            <Text style={[styles.help, { color: t.textMuted }]}>{state.message}</Text>
            <BrickButton label="Try again" icon="refresh" color={brand.red} onPress={tryAgain} style={styles.fullWidth} />
            <TextLink label={state.photo ? 'Use a different photo' : 'Back to start'} onPress={goHome} />
          </Tile>
        ) : null}

        <ScanHistory
          scans={scans}
          onOpen={openSavedScan}
          onDelete={(scan) => removeFromHistory([scan.id], `Removed ${scan.result.name}`)}
          backgroundScans={state.kind === 'analyzing' ? inProgress - 1 : inProgress}
        />
      </ScrollView>
      {undoMessage ? <UndoBar message={undoMessage} onUndo={undoRemoval} /> : null}
    </Baseplate>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 20 },
  roomForUndo: { paddingBottom: 100 },
  logo: { alignItems: 'center' },
  hero: { gap: 8 },
  title: { fontFamily: fonts.title, fontSize: 30, lineHeight: 34 },
  subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22 },
  buttons: { gap: 14, marginTop: 12 },
  centered: { alignItems: 'center', gap: 14 },
  photo: { width: '100%', borderRadius: 12 },
  errorPhoto: { width: '100%', height: 140, borderRadius: 12 },
  status: { fontFamily: fonts.title, fontSize: 21, textAlign: 'center' },
  help: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  stop: { minWidth: 140 },
  fullWidth: { alignSelf: 'stretch' },
  resultBlock: { gap: 12 },
  disclaimerBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  disclaimer: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
});
