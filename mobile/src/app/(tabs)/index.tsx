import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Baseplate } from '../../components/Baseplate';
import { BrickButton } from '../../components/BrickButton';
import { Logo } from '../../components/Logo';
import { ResultCard } from '../../components/ResultCard';
import { ScanHistory } from '../../components/ScanHistory';
import { StackingBricks } from '../../components/StackingBricks';
import { Tile } from '../../components/Tile';
import { analyzePhoto, ScanCancelledError } from '../../lib/api';
import { ebaySearchUrl, openInAppBrowser } from '../../lib/links';
import { pickPhoto, type PreparedPhoto } from '../../lib/photo';
import { recordScan } from '../../lib/scanCounter';
import { loadScans, saveScan, scanPhotoUri } from '../../lib/scanHistory';
import type { SavedScan, ScanResult } from '../../lib/types';
import { brand, fonts, useTheme } from '../../theme';

type ScanState =
  | { kind: 'idle' }
  | { kind: 'analyzing'; photoUri: string }
  | { kind: 'result'; photoUri: string; result: ScanResult }
  | { kind: 'notFigure'; photoUri: string }
  | { kind: 'error'; message: string };

export default function ScanScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [scans, setScans] = useState<SavedScan[]>([]);

  useEffect(() => {
    loadScans().then(setScans);
    return () => abortRef.current?.abort();
  }, []);

  const scrollToTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });

  async function startScan(source: 'camera' | 'library') {
    let photo: PreparedPhoto | null;
    try {
      photo = await pickPhoto(source);
    } catch (e) {
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Couldn’t open that photo.' });
      return;
    }
    if (!photo) return; // the user closed the camera or photo picker

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: 'analyzing', photoUri: photo.uri });
    scrollToTop();

    try {
      const result = await analyzePhoto(photo.base64, controller.signal);
      recordScan(); // quietly counts today's scans (for a future daily limit)

      if (!result.isMinifigure) {
        setState({ kind: 'notFigure', photoUri: photo.uri });
        return;
      }
      setState({ kind: 'result', photoUri: photo.uri, result });
      try {
        await saveScan(photo.uri, result);
        setScans(await loadScans());
      } catch {
        // Saving to "My scans" failed; the result is still on screen, so carry on.
      }
    } catch (e) {
      if (e instanceof ScanCancelledError || controller.signal.aborted) return;
      setState({ kind: 'error', message: e instanceof Error ? e.message : 'Something went wrong. Please try again.' });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function stopScan() {
    abortRef.current?.abort();
    setState({ kind: 'idle' });
  }

  function reset() {
    setState({ kind: 'idle' });
    scrollToTop();
  }

  function openSavedScan(scan: SavedScan) {
    abortRef.current?.abort();
    setState({ kind: 'result', photoUri: scanPhotoUri(scan), result: scan.result });
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
              <BrickButton label="Scan a minifigure" icon="camera" color={brand.red} variant="large" onPress={() => startScan('camera')} />
              <BrickButton label="Choose from photos" icon="images" color={brand.yellow} onPress={() => startScan('library')} />
            </View>
          ) : null}
        </Tile>

        {state.kind === 'analyzing' ? (
          <Tile style={styles.centered}>
            <Image source={{ uri: state.photoUri }} style={[styles.photo, { backgroundColor: t.photoBackground }]} resizeMode="contain" />
            <StackingBricks />
            <Text style={[styles.status, { color: t.text }]} accessibilityLiveRegion="polite">
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

        <ScanHistory scans={scans} onOpen={openSavedScan} />
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
