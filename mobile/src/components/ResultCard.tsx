import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, Text, View } from 'react-native';

import { formatRange, themeAndYear } from '../lib/format';
import type { ScanResult } from '../lib/types';
import { brand, fonts, useTheme } from '../theme';
import { BrickButton } from './BrickButton';
import { PriceBrick } from './PriceBrick';
import { RarityBadge } from './RarityBadge';
import { Tile } from './Tile';

type Props = {
  photoUri: string;
  result: ScanResult;
  onFindForSale: () => void;
  onScanAnother: () => void;
};

export function ResultCard({ photoUri, result, onFindForSale, onScanAnother }: Props) {
  const t = useTheme();
  const subtitle = themeAndYear(result.theme, result.year);

  return (
    <Tile style={styles.card}>
      <Image source={{ uri: photoUri }} style={[styles.photo, { backgroundColor: t.photoBackground }]} resizeMode="contain" />

      <View style={styles.titleBlock}>
        <Text style={[styles.name, { color: t.text }]}>{result.name}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text> : null}
        <RarityBadge rarity={result.rarity} />
      </View>

      {result.confidence === 'low' ? (
        <View style={[styles.warning, { backgroundColor: t.warningBackground }]}>
          <Ionicons name="help-circle" size={20} color={t.warningText} />
          <Text style={[styles.warningText, { color: t.warningText }]}>
            Not sure about this one. Try a clearer photo on a plain background.
          </Text>
        </View>
      ) : null}

      <View style={styles.prices}>
        <PriceBrick label="Used" value={formatRange(result.valueUsed)} color={brand.green} style={styles.price} />
        <PriceBrick label="New" value={formatRange(result.valueNew)} color={brand.blue} style={styles.price} />
      </View>

      {result.note ? <Text style={[styles.note, { color: t.text }]}>{result.note}</Text> : null}

      <View style={styles.actions}>
        <BrickButton label="Find it for sale" icon="pricetag" color={brand.yellow} onPress={onFindForSale} />
        <BrickButton label="Scan another" icon="camera" color={brand.red} onPress={onScanAnother} />
      </View>
    </Tile>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  photo: { width: '100%', height: 260, borderRadius: 12 },
  titleBlock: { gap: 6 },
  name: { fontFamily: fonts.title, fontSize: 28, lineHeight: 32 },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  warning: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, padding: 12 },
  warningText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  prices: { flexDirection: 'row', gap: 12 },
  price: { flex: 1 },
  note: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  actions: { gap: 12 },
});
