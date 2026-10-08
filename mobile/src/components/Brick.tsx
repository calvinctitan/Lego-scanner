import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { shade } from '../theme';

export type BrickSize = 'xs' | 'sm' | 'md' | 'lg';

// Stud width/height, the dark bottom strip ("depth"), corner radius, and how far apart studs sit.
const SIZES: Record<BrickSize, { studW: number; studH: number; depth: number; radius: number; pitch: number }> = {
  xs: { studW: 7, studH: 3, depth: 3, radius: 5, pitch: 18 },
  sm: { studW: 12, studH: 5, depth: 4, radius: 8, pitch: 30 },
  md: { studW: 18, studH: 6, depth: 6, radius: 12, pitch: 46 },
  lg: { studW: 30, studH: 10, depth: 9, radius: 18, pitch: 70 },
};

type BrickProps = {
  color: string;
  /** How many studs on top. Leave it out to fit studs to the brick's width automatically. */
  studs?: number;
  size?: BrickSize;
  /** When true the brick is drawn pushed down (used by buttons while a finger is on them). */
  pressed?: boolean;
  /** Outer layout: width, flex, margins. */
  style?: StyleProp<ViewStyle>;
  /** The colored face: padding, height, alignment of children. */
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * A LEGO-style brick: a solid colored face with rounded corners, a darker strip
 * along the bottom edge, and a row of studs sticking out of the top.
 */
export function Brick({ color, studs, size = 'md', pressed = false, style, contentStyle, children }: BrickProps) {
  const s = SIZES[size];
  const [autoStuds, setAutoStuds] = useState(0);
  const studCount = studs ?? autoStuds;

  const onLayout =
    studs === undefined
      ? (e: LayoutChangeEvent) => setAutoStuds(Math.max(1, Math.round(e.nativeEvent.layout.width / s.pitch)))
      : undefined;

  // Pressing moves the face and studs down while the bottom edge stays put.
  const travel = pressed ? Math.max(1, s.depth - 2) : 0;
  const edgeColor = shade(color, -0.3);
  const studTop = shade(color, 0.22);

  return (
    <View style={[{ paddingTop: travel }, style]} onLayout={onLayout}>
      <View style={[styles.studRow, { height: s.studH, paddingHorizontal: s.radius + 2 }]}>
        {Array.from({ length: studCount }, (_, i) => (
          <View
            key={i}
            style={{
              width: s.studW,
              height: s.studH + 2,
              marginBottom: -2,
              backgroundColor: color,
              borderTopLeftRadius: s.studH,
              borderTopRightRadius: s.studH,
              borderTopWidth: size === 'xs' ? 1 : 1.5,
              borderTopColor: studTop,
            }}
          />
        ))}
      </View>
      <View style={{ backgroundColor: edgeColor, borderRadius: s.radius, paddingBottom: s.depth - travel }}>
        <View style={[{ backgroundColor: color, borderRadius: s.radius, overflow: 'hidden' }, contentStyle]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  studRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
  },
});
