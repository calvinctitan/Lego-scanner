import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, formatRange } from '../lib/format';
import { scanPhotoUri } from '../lib/scanHistory';
import type { SavedScan } from '../lib/types';
import { brand, fonts, useTheme } from '../theme';
import { Tile } from './Tile';

type Props = {
  scans: SavedScan[];
  onOpen: (scan: SavedScan) => void;
};

/** The "My scans" list: past scans saved on this phone. */
export function ScanHistory({ scans, onOpen }: Props) {
  const t = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.heading, { color: t.text }]}>My scans</Text>
      {scans.length === 0 ? (
        <Tile>
          <Text style={[styles.empty, { color: t.textMuted }]}>Your scans will show up here.</Text>
        </Tile>
      ) : (
        scans.map((scan) => (
          <Pressable
            key={scan.id}
            onPress={() => onOpen(scan)}
            accessibilityRole="button"
            accessibilityLabel={`${scan.result.name}, used price ${formatRange(scan.result.valueUsed)}`}
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
                  <Text style={[styles.price, { color: t.scheme === 'dark' ? '#4FBF77' : brand.green }]} numberOfLines={1}>
                    <Text style={[styles.priceLabel, { color: t.textMuted }]}>Used </Text>
                    {formatRange(scan.result.valueUsed)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
              </Tile>
            )}
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { fontFamily: fonts.title, fontSize: 24, marginBottom: 2 },
  empty: { fontFamily: fonts.bodySemiBold, fontSize: 15, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  info: { flex: 1, gap: 1 },
  name: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
  meta: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  priceLabel: { fontFamily: fonts.bodyBold, fontSize: 13 },
  price: { fontFamily: fonts.title, fontSize: 17 },
});
