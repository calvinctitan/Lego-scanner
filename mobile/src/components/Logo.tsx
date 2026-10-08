import { StyleSheet, Text, View } from 'react-native';

import { brand, fonts, textOn } from '../theme';
import { Brick } from './Brick';

const LETTERS: [string, string][] = [
  ['L', brand.red],
  ['e', brand.yellow],
  ['g', brand.blue],
  ['a', brand.green],
  ['r', brand.red],
  ['á', brand.yellow],
];

/** The "Legará" logo: each letter on its own 1x1 brick with one stud. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.row, { gap: Math.round(size * 0.1) }]} accessible accessibilityRole="header" accessibilityLabel="Legará">
      {LETTERS.map(([letter, color], i) => (
        <Brick
          key={i}
          color={color}
          studs={1}
          size={size >= 36 ? 'sm' : 'xs'}
          style={{ width: size }}
          contentStyle={[styles.face, { height: size }]}
        >
          <Text
            style={[styles.letter, { color: textOn(color), fontSize: size * 0.66, lineHeight: size * 0.95 }]}
            maxFontSizeMultiplier={1}
          >
            {letter}
          </Text>
        </Brick>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  face: { alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.title, textAlign: 'center' },
});
