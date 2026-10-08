import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Pressable as GesturePressable } from 'react-native-gesture-handler';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { formatDate, formatRange } from '../lib/format';
import { scanPhotoUri } from '../lib/scanHistory';
import type { SavedScan } from '../lib/types';
import { brand, fonts, useTheme } from '../theme';
import { Tile } from './Tile';

type Props = {
  scans: SavedScan[];
  onOpen: (scan: SavedScan) => void;
  onDelete: (scan: SavedScan) => void;
  /** Scans still being checked while something else is on screen. */
  backgroundScans?: number;
};

/** The "My scans" list: past scans saved on this phone. Swipe a row left to delete it. */
export function ScanHistory({ scans, onOpen, onDelete, backgroundScans = 0 }: Props) {
  const t = useTheme();
  const total = scans.reduce<[number, number]>(
    ([low, high], scan) => [low + scan.result.valueUsed[0], high + scan.result.valueUsed[1]],
    [0, 0],
  );
  // The total is only as sure as its least sure scan.
  const unsure = scans.filter((scan) => scan.result.confidence === 'low').length;

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: t.text }]}>My scans</Text>
        {scans.length > 1 ? (
          <View
            style={[styles.totalPill, { backgroundColor: t.card, borderColor: t.border }]}
            accessible
            accessibilityLabel={`Total value of your scans, used: ${unsure ? 'about ' : ''}${formatRange(total)}${
              unsure ? `, including ${unsure} you’re not sure about` : ''
            }`}
          >
            <Text style={[styles.totalText, { color: t.text }]}>
              Total value: <Text style={{ color: t.priceText }}>{unsure ? '≈ ' : ''}{formatRange(total)}</Text> used
            </Text>
          </View>
        ) : null}
      </View>

      {scans.length > 1 && unsure ? (
        <Text style={[styles.totalNote, { color: t.textMuted }]}>
          ≈ The total includes {unsure === 1 ? '1 scan' : `${unsure} scans`} marked “Not sure”.
        </Text>
      ) : null}

      {backgroundScans > 0 ? (
        <View style={[styles.pending, { backgroundColor: t.card }]} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={t.textMuted} />
          <Text style={[styles.pendingText, { color: t.text }]}>
            {backgroundScans === 1 ? 'One scan is' : `${backgroundScans} scans are`} still being checked. It’ll appear here when it’s done.
          </Text>
        </View>
      ) : null}

      {scans.length === 0 && backgroundScans === 0 ? (
        <Tile>
          <Text style={[styles.empty, { color: t.textMuted }]}>Your scans will show up here.</Text>
        </Tile>
      ) : (
        scans.map((scan) => <ScanRow key={scan.id} scan={scan} onOpen={onOpen} onDelete={onDelete} />)
      )}
    </View>
  );
}

/** One saved scan. Swipe left to reveal Delete; tap to open it. */
function ScanRow({ scan, onOpen, onDelete }: { scan: SavedScan; onOpen: (scan: SavedScan) => void; onDelete: (scan: SavedScan) => void }) {
  const t = useTheme();
  const swipeable = useRef<SwipeableMethods>(null);
  const isOpen = useRef(false);
  // True from the start of a swipe until the row settles, so lifting the finger
  // at the end of a swipe isn't also taken as a tap that opens the scan.
  const swiping = useRef(false);

  return (
    <Swipeable
      ref={swipeable}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableOpenStartDrag={() => (swiping.current = true)}
      onSwipeableCloseStartDrag={() => (swiping.current = true)}
      onSwipeableOpen={() => {
        isOpen.current = true;
        swiping.current = false;
      }}
      onSwipeableClose={() => {
        isOpen.current = false;
        swiping.current = false;
      }}
      renderRightActions={() => (
        <View style={styles.actionWrap}>
          <GesturePressable
            onPress={() => onDelete(scan)}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${scan.result.name}`}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
          >
            <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            <Text style={styles.deleteText}>Delete</Text>
          </GesturePressable>
        </View>
      )}
    >
      {/* The gesture library's Pressable cooperates with the swipe on iPhone and on the web. */}
      <GesturePressable
        onPress={() => {
          if (swiping.current) return;
          if (isOpen.current) swipeable.current?.close();
          else onOpen(scan);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${scan.result.name}, used price ${formatRange(scan.result.valueUsed)}${
          scan.result.confidence === 'low' ? ', not sure' : ''
        }`}
        accessibilityHint="Opens this scan. Swipe left to delete."
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'delete') onDelete(scan);
        }}
      >
        {({ pressed }) => (
          <Tile pressed={pressed} style={styles.row}>
            <Image source={{ uri: scanPhotoUri(scan) }} style={[styles.thumb, { backgroundColor: t.photoBackground }]} />
            <View style={styles.info}>
              <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                {scan.result.name}
              </Text>
              <Text style={[styles.meta, { color: t.textMuted }]} numberOfLines={1}>
                {[scan.result.theme, formatDate(scan.createdAt)].filter(Boolean).join(' · ')}
              </Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: t.priceText }]} numberOfLines={1}>
                  <Text style={[styles.priceLabel, { color: t.textMuted }]}>Used </Text>
                  {formatRange(scan.result.valueUsed)}
                </Text>
                {scan.result.confidence === 'low' ? (
                  <View style={[styles.notSure, { backgroundColor: t.warningBackground }]}>
                    <Text style={[styles.notSureText, { color: t.warningText }]}>Not sure</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
          </Tile>
        )}
      </GesturePressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  heading: { fontFamily: fonts.title, fontSize: 24 },
  totalPill: { borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 5 },
  totalText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  totalNote: { fontFamily: fonts.bodySemiBold, fontSize: 13, marginTop: -6 },
  empty: { fontFamily: fonts.bodySemiBold, fontSize: 15, textAlign: 'center' },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 12 },
  pendingText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  info: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  price: { fontFamily: fonts.title, fontSize: 17, flexShrink: 1 },
  notSure: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  notSureText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  actionWrap: { width: 104, paddingLeft: 10, paddingBottom: 5 },
  deleteButton: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: brand.red,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  deleteText: { color: '#FFFFFF', fontFamily: fonts.title, fontSize: 15 },
  pressed: { opacity: 0.7 },
});
