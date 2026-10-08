import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useNavigation } from 'expo-router';
import type { BottomTabNavigationProp } from 'expo-router/tabs';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionBar } from '../../components/ActionBar';
import { Baseplate } from '../../components/Baseplate';
import { BrickButton } from '../../components/BrickButton';
import { Logo } from '../../components/Logo';
import { ResultCard } from '../../components/ResultCard';
import { ScanHistory } from '../../components/ScanHistory';
import { StackingBricks } from '../../components/StackingBricks';
import { TextLink } from '../../components/TextLink';
import { Tile } from '../../components/Tile';
import { findFigureForScan } from '../../data/figures';
import { analyzePhoto, ScanCancelledError, scanningIsSetUp } from '../../lib/api';
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
  | {
      kind: 'result';
      photoUri: string;
      result: ScanResult;
      estimatedAt: string;
      savedId?: string;
      /** True right after scanning (not when reopened from "My scans"). */
      fresh?: boolean;
      /** The offer to replace an earlier scan of this figure has gone away. */
      offerClosed?: boolean;
    }
  | { kind: 'notFigure'; photoUri: string }
  | { kind: 'error'; message: string; photo?: PreparedPhoto; attempt?: number };

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

// The bar at the bottom (Undo, or Replace) stays until the person does something else, or this long.
// With VoiceOver on it has no time limit.
const BAR_MS = 30000;
// A failed retry still shows the "Looking closely" screen this long, so it's clear it tried again.
const MIN_ATTEMPT_MS = 900;

export default function ScanScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const photoHeight = usePhotoHeight();
  // Without a server address the app never sends photos anywhere (so it can't cost anything).
  const scanningOn = scanningIsSetUp();
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

  // VoiceOver users get as long as they need to reach the bar's button. (Browsers always say a
  // screen reader is on, so the web version doesn't ask.)
  const screenReader = useRef(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((on) => (screenReader.current = on))
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (on) => (screenReader.current = on));
    return () => subscription.remove();
  }, []);

  // Going to another tab counts as moving on, so a removal can no longer be undone.
  useEffect(() => navigation.addListener('blur', finishRemoval), [navigation]);

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
    // With scanning off, go back to the start, where the notice explains why.
    if (!scanningOn) {
      goHome();
      return;
    }
    if (preparing.current) return;
    finishRemoval();
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

  async function analyze(photo: PreparedPhoto, attempt = 1) {
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
        show({ kind: 'result', photoUri: photo.uri, result, estimatedAt: new Date().toISOString(), fresh: true });
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
      show({ kind: 'error', message, photo, attempt });
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
    if (state.kind === 'error' && state.photo) analyze(state.photo, (state.attempt ?? 1) + 1);
    else startScan(lastSource.current);
  }

  function openSavedScan(scan: SavedScan) {
    finishRemoval();
    show({ kind: 'result', photoUri: scanPhotoUri(scan), result: scan.result, estimatedAt: scan.createdAt, savedId: scan.id });
    scrollToTop();
  }

  /** Takes scans out of "My scans". Undo stays at the bottom until the person moves on (or BAR_MS passes). */
  async function removeFromHistory(ids: string[], message: string) {
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
    if (!screenReader.current) undoTimer.current = setTimeout(finishRemoval, BAR_MS);
    announce(`${message}. Undo is at the bottom of the screen.`);
  }

  /** The chance to undo has passed (or the person moved on): delete the removed scans' photos and hide the Undo bar. */
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
    // Undoing a replace means "keep both", so don't ask about replacing again.
    setState((prev) => (prev.kind === 'result' ? { ...prev, offerClosed: true } : prev));
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
  const replaceEarlier = () =>
    removeFromHistory(
      earlier.map((s) => s.id),
      earlier.length === 1 ? 'Replaced your earlier scan' : `Replaced ${earlier.length} earlier scans`,
    );

  // Right after scanning a figure that's already in "My scans", ask at the bottom of the screen
  // (where it can't be missed) whether to replace the earlier scan, so the total doesn't count it twice.
  const offerFor =
    state.kind === 'result' && state.fresh && !state.offerClosed && earlier.length > 0 && !undoMessage ? state.savedId : undefined;
  useEffect(() => {
    if (!offerFor) return;
    announce('Already in My scans. You can replace the earlier scan with the button at the bottom of the screen.');
    if (screenReader.current) return;
    const timer = setTimeout(
      () => setState((prev) => (prev.kind === 'result' && prev.savedId === offerFor ? { ...prev, offerClosed: true } : prev)),
      BAR_MS,
    );
    return () => clearTimeout(timer);
  }, [offerFor]);

  return (
    <Baseplate>
      <ScrollView
        ref={scrollRef}
        // Extra room at the bottom while a bar is showing, so it never hides the last scan.
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }, undoMessage || offerFor ? styles.roomForBar : null]}
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
            {scanningOn ? null : (
              <View style={[styles.offNotice, { backgroundColor: t.warningBackground }]}>
                <Ionicons name="flask-outline" size={20} color={t.warningText} />
                <View style={styles.offText}>
                  <Text style={[styles.offTitle, { color: t.warningText }]}>Test version: scanning is off</Text>
                  <Text style={[styles.offBody, { color: t.warningText }]}>
                    Scanning needs a Legará server, and each scan costs a few cents, so it’s switched off in this test
                    version and nothing can be charged. Everything else works, so try the Marketplace.
                  </Text>
                </View>
              </View>
            )}
            <View style={styles.buttons}>
              <BrickButton label="Scan a minifigure" icon="camera" color={brand.red} variant="large" disabled={busy || !scanningOn} onPress={() => startScan('camera')} />
              <BrickButton label="Choose from photos" icon="images" color={brand.yellow} disabled={busy || !scanningOn} onPress={() => startScan('library')} />
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
              onReplaceEarlier={replaceEarlier}
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
            {state.attempt && state.attempt > 1 ? (
              <Text style={[styles.attempts, { color: t.text }]}>Tried {state.attempt} times.</Text>
            ) : null}
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
        <TextLink icon="information-circle-outline" label="About Legará and legal notices" onPress={() => router.push('/about')} />
      </ScrollView>
      {undoMessage ? (
        <ActionBar message={undoMessage} actionLabel="Undo" onAction={undoRemoval} />
      ) : offerFor ? (
        <ActionBar message="Already in My scans. Replace the earlier scan?" actionLabel="Replace" onAction={replaceEarlier} />
      ) : null}
    </Baseplate>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 20 },
  roomForBar: { paddingBottom: 100 },
  logo: { alignItems: 'center' },
  hero: { gap: 8 },
  title: { fontFamily: fonts.title, fontSize: 30, lineHeight: 34 },
  subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22 },
  buttons: { gap: 14, marginTop: 12 },
  offNotice: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 12, marginTop: 4 },
  offText: { flex: 1, gap: 2 },
  offTitle: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  offBody: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
  centered: { alignItems: 'center', gap: 14 },
  photo: { width: '100%', borderRadius: 12 },
  errorPhoto: { width: '100%', height: 140, borderRadius: 12 },
  status: { fontFamily: fonts.title, fontSize: 21, textAlign: 'center' },
  help: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  attempts: { fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center' },
  stop: { minWidth: 140 },
  fullWidth: { alignSelf: 'stretch' },
  resultBlock: { gap: 12 },
  disclaimerBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  disclaimer: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
});
