import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Baseplate } from '../../components/Baseplate';
import { BrickButton } from '../../components/BrickButton';
import { Logo } from '../../components/Logo';
import { ResultCard } from '../../components/ResultCard';
import { ScanHistory } from '../../components/ScanHistory';
import { StackingBricks } from '../../components/StackingBricks';
import { Tile } from '../../components/Tile';
import { analyzePhoto, ScanCancelledError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { ebaySearchUrl, openInAppBrowser } from '../../lib/links';
import { pickPhoto, type PreparedPhoto } from '../../lib/photo';
import { recordScan } from '../../lib/scanCounter';
import { loadScans, saveScan, scanPhotoUri } from '../../lib/scanHistory';
import type { SavedScan, ScanResult } from '../../lib/types';
import { brand, fonts, useTheme } from '../../theme';

type ScanState =
  | { kind: 'idle' }
  | { kind: 'analyzing'; scanId: number; photoUri: string }
  | { kind: 'result'; photoUri: string; result: ScanResult }
  | { kind: 'notFigure'; photoUri: string }
  | { kind: 'error'; message: string };

/** "$8 to $15", read out by VoiceOver. */
function spokenRange([low, high]: [number, number]): string {
  return low === high ? formatPrice(low) : `${formatPrice(low)} to ${formatPrice(high)}`;
}

/** Tells VoiceOver users what just happened, since the screen changes without them tapping. */
function announce(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

export default function ScanScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [scans, setScans] = useState<SavedScan[]>([]);

  // Scans still waiting for an answer. A scan keeps running if the person looks at an
  // older scan meanwhile; it is still saved to "My scans" when it finishes.
  const running = useRef(new Map<number, AbortController>());
  const [inProgress, setInProgress] = useState(0);
  const nextScanId = useRef(0);
  // The scan whose progress is on screen right now (null when showing something else).
  const watchingScanId = useRef<number | null>(null);
  // True from tapping a scan button until the photo is ready, so a second tap can't start another scan.
  const preparing = useRef(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadScans().then(setScans);
    const scansInFlight = running.current;
    return () => scansInFlight.forEach((controller) => controller.abort());
  }, []);

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  function show(next: ScanState) {
    watchingScanId.current = next.kind === 'analyzing' ? next.scanId : null;
    setState(next);
  }

  async function startScan(source: 'camera' | 'library') {
    if (preparing.current) return;
    preparing.current = true;
    setBusy(true);
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
    if (!photo) return; // the user closed the camera or photo picker

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
        show({ kind: 'result', photoUri: photo.uri, result });
        announce(
          `${result.name}. Used ${spokenRange(result.valueUsed)}. New ${spokenRange(result.valueNew)}.` +
            (result.confidence === 'low' ? ' Not sure about this one. Try a clearer photo on a plain background.' : ''),
        );
      }
      try {
        await saveScan(photo.uri, result);
        setScans(await loadScans());
      } catch {
        // Saving to "My scans" failed; the result is still on screen, so carry on.
      }
    } catch (e) {
      if (e instanceof ScanCancelledError || controller.signal.aborted || !stillWatching()) return;
      const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      show({ kind: 'error', message });
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

  function reset() {
    show({ kind: 'idle' });
    scrollToTop();
  }

  function openSavedScan(scan: SavedScan) {
    show({ kind: 'result', photoUri: scanPhotoUri(scan), result: scan.result });
    scrollToTop();
  }

  return (
    <Baseplate>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logo}>
          <Logo size={42} />
        </View>

        <Tile style={styles.hero}>
          <Text style={[styles.title, { color: t.text }]}>What’s your minifigure worth?</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>
            Stand your figure on a plain background and take a photo.
          </Text>
          {state.kind === 'idle' ? (
            <View style={styles.buttons}>
              <BrickButton label="Scan a minifigure" icon="camera" color={brand.red} variant="large" disabled={busy} onPress={() => startScan('camera')} />
              <BrickButton label="Choose from photos" icon="images" color={brand.yellow} disabled={busy} onPress={() => startScan('library')} />
            </View>
          ) : null}
        </Tile>

        {state.kind === 'analyzing' ? (
          <Tile style={styles.centered}>
            <Image source={{ uri: state.photoUri }} style={[styles.photo, { backgroundColor: t.photoBackground }]} resizeMode="contain" />
            <StackingBricks />
            <Text style={[styles.status, { color: t.text }]}>
              Looking closely at your figure…
            </Text>
            <BrickButton label="Stop" icon="stop-circle" color={t.neutralBrick} variant="small" onPress={stopScan} style={styles.stop} />
          </Tile>
        ) : null}

        {state.kind === 'result' ? (
          <View style={styles.resultBlock}>
            <ResultCard
              photoUri={state.photoUri}
              result={state.result}
              onFindForSale={() => openInAppBrowser(ebaySearchUrl(state.result.name))}
              onScanAnother={reset}
            />
            <Text style={[styles.disclaimer, { color: t.textMuted }]}>
              Estimates only. Check recent sold listings for exact prices.
            </Text>
          </View>
        ) : null}

        {state.kind === 'notFigure' ? (
          <Tile style={styles.centered}>
            <Image source={{ uri: state.photoUri }} style={[styles.photo, { backgroundColor: t.photoBackground }]} resizeMode="contain" />
            <Ionicons name="help-buoy" size={36} color={brand.red} />
            <Text style={[styles.status, { color: t.text }]}>That doesn’t look like a minifigure</Text>
            <Text style={[styles.help, { color: t.textMuted }]}>
              Make sure the figure fills most of the photo and stands on a plain background.
            </Text>
            <BrickButton label="Try again" icon="refresh" color={brand.red} onPress={reset} style={styles.fullWidth} />
          </Tile>
        ) : null}

        {state.kind === 'error' ? (
          <Tile style={styles.centered}>
            <Ionicons name="alert-circle" size={36} color={brand.red} />
            <Text style={[styles.status, { color: t.text }]}>Oops, that didn’t work</Text>
            <Text style={[styles.help, { color: t.textMuted }]}>{state.message}</Text>
            <BrickButton label="Try again" icon="refresh" color={brand.red} onPress={reset} style={styles.fullWidth} />
          </Tile>
        ) : null}

        <ScanHistory
          scans={scans}
          onOpen={openSavedScan}
          backgroundScans={state.kind === 'analyzing' ? inProgress - 1 : inProgress}
        />
      </ScrollView>
    </Baseplate>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 20 },
  logo: { alignItems: 'center' },
  hero: { gap: 8 },
  title: { fontFamily: fonts.title, fontSize: 30, lineHeight: 34 },
  subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22 },
  buttons: { gap: 14, marginTop: 12 },
  centered: { alignItems: 'center', gap: 14 },
  photo: { width: '100%', height: 240, borderRadius: 12 },
  status: { fontFamily: fonts.title, fontSize: 21, textAlign: 'center' },
  help: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  stop: { minWidth: 140 },
  fullWidth: { alignSelf: 'stretch' },
  resultBlock: { gap: 10 },
  disclaimer: { fontFamily: fonts.bodySemiBold, fontSize: 13, textAlign: 'center', paddingHorizontal: 12 },
});
