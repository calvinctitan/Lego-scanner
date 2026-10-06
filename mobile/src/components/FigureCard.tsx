import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Figure } from '../data/figures';
import { formatPrice } from '../lib/format';
import { fonts, useTheme } from '../theme';
import { FigureArt } from './FigureArt';
import { RarityBadge } from './RarityBadge';
import { Tile } from './Tile';

type Props = {
  figure: Figure;
  width: number;
  onPress: () => void;
};

export function FigureCard({ figure, width, onPress }: Props) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ width }}
      accessibilityRole="button"
      accessibilityLabel={`${figure.name}, ${figure.theme}, about ${formatPrice(figure.priceUsed)} used`}
    >
      {({ pressed }) => (
        <Tile pressed={pressed} fill style={styles.card}>
          <FigureArt name={figure.name} theme={figure.theme} />
          <Text style={[styles.name, { color: t.text }]} numberOfLines={2}>
            {figure.name}
          </Text>
          <Text style={[styles.theme, { color: t.textMuted }]} numberOfLines={1}>
            {figure.theme}
          </Text>
          {/* Pushes the badge and price to the bottom so cards in a row line up. */}
          <View style={styles.spacer} />
          {figure.rarity !== 'Common' ? <RarityBadge rarity={figure.rarity} /> : null}
          <Text style={[styles.price, { color: t.priceText }]}>
            {formatPrice(figure.priceUsed)}
            <Text style={[styles.used, { color: t.textMuted }]}> used</Text>
          </Text>
        </Tile>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, gap: 4 },
  name: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 19, marginTop: 8 },
  theme: { fontFamily: fonts.bodySemiBold, fontSize: 13 },
  spacer: { flex: 1, minHeight: 6 },
  price: { fontFamily: fonts.title, fontSize: 22, marginTop: 2 },
  used: { fontFamily: fonts.bodyBold, fontSize: 14 },
});
