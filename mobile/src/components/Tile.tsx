import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressed?: boolean;
  /** Stretch to fill the parent's height (used for grid cards so a row lines up). */
  fill?: boolean;
};

/** A card shaped like a flat LEGO tile: smooth top, rounded corners, darker bottom edge. */
export function Tile({ children, style, pressed, fill }: Props) {
  const t = useTheme();
  const depth = 5;
  const travel = pressed ? 3 : 0;
  const grow = fill ? { flex: 1 } : null;
  return (
    <View style={[{ paddingTop: travel }, grow]}>
      <View style={[{ backgroundColor: t.cardEdge, borderRadius: 18, paddingBottom: depth - travel }, grow]}>
        <View style={[{ backgroundColor: t.card, borderRadius: 18, padding: 16 }, grow, style]}>{children}</View>
      </View>
    </View>
  );
}
