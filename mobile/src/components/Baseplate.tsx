import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { useTheme } from '../theme';

const SPACING = 22; // distance between stud centers
const RADIUS = 6.5;

/** Full-screen background that looks like a grey LEGO baseplate covered in round studs. */
export function Baseplate({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  // Each baseplate needs its own pattern id (React ids contain ":" which SVG ids don't like).
  const patternId = `studs-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const c = SPACING / 2;

  return (
    <View style={[styles.root, { backgroundColor: t.baseplate }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          <Pattern id={patternId} x={0} y={0} width={SPACING} height={SPACING} patternUnits="userSpaceOnUse">
            <Circle cx={c + 0.8} cy={c + 1.2} r={RADIUS} fill={t.studShadow} />
            <Circle cx={c} cy={c} r={RADIUS} fill={t.stud} />
            <Circle cx={c - 1} cy={c - 1} r={RADIUS - 2.5} fill={t.studHighlight} />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
