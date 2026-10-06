import { StyleSheet, Text, View } from 'react-native';

import type { Rarity } from '../lib/types';
import { brand, fonts, shade, textOn } from '../theme';

const RARITY_COLORS: Record<Rarity, string> = {
  Common: '#A0A5A9',
  Uncommon: brand.green,
  Rare: brand.blue,
  'Very rare': '#E4AD1C',
};

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  const bg = RARITY_COLORS[rarity] ?? RARITY_COLORS.Common;
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderBottomColor: shade(bg, -0.3) }]}>
      <Text style={[styles.text, { color: textOn(bg) }]}>
        {rarity === 'Very rare' ? '★ ' : ''}
        {rarity}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderBottomWidth: 2,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  text: {
    fontFamily: fonts.bodyHeavy,
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
