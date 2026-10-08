import { StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, textOn } from '../theme';
import { Brick } from './Brick';

type Props = {
  label: string;
  value: string;
  color: string;
  big?: boolean;
  /** Use the same size for bricks shown side by side. */
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** A colored brick showing a price, e.g. green "Used  $40–$60". */
/** Long ranges like "$1,500–$2,500" need a smaller font to fit in a half-width brick. */
export function priceFontSize(value: string): number {
  return value.length > 11 ? 17 : value.length > 8 ? 20 : 24;
}

export function PriceBrick({ label, value, color, big, fontSize: requestedSize, style }: Props) {
  const fg = textOn(color);
  const fontSize = big ? 34 : (requestedSize ?? priceFontSize(value));
  return (
    <Brick color={color} size={big ? 'md' : 'sm'} style={style} contentStyle={[styles.face, big && styles.faceBig]}>
      <Text style={[styles.label, { color: fg }]} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
      <Text
        style={[styles.value, { color: fg, fontSize, lineHeight: Math.round(fontSize * 1.25) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        maxFontSizeMultiplier={1.3}
      >
        {value}
      </Text>
    </Brick>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10 },
  faceBig: { paddingVertical: 16 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.9 },
  value: { fontFamily: fonts.title, marginTop: 4 },
});
