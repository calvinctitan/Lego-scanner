import { StyleSheet, Text } from 'react-native';

import { initials, themeColor } from '../data/figures';
import { fonts, textOn } from '../theme';
import { Brick } from './Brick';

/** The figure "artwork": a brick in the theme's color with the figure's initials on it. */
export function FigureArt({ name, theme, big }: { name: string; theme: string; big?: boolean }) {
  const color = themeColor(theme);
  return (
    <Brick
      color={color}
      studs={big ? 4 : 2}
      size={big ? 'lg' : 'sm'}
      contentStyle={[styles.face, { height: big ? 170 : 84 }]}
    >
      <Text style={[styles.initials, { color: textOn(color), fontSize: big ? 72 : 36 }]}>{initials(name)}</Text>
    </Brick>
  );
}

const styles = StyleSheet.create({
  face: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.title, letterSpacing: 1 },
});
