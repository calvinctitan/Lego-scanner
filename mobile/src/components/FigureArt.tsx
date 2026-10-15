import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { initials, themeColor, type FigurePhoto } from '../data/figures';
import { fonts, textOn, useTheme } from '../theme';
import { Brick } from './Brick';

type Props = {
  name: string;
  theme: string;
  /** The figure's picture, if it has one (see figures.ts → "Figure pictures"). */
  photo?: FigurePhoto;
  big?: boolean;
  /** Called if the picture can't be loaded, so the brick is shown instead. */
  onPhotoError?: () => void;
};

// Same total height as the brick (studs + face + bottom edge), so cards in a row line up either way.
const HEIGHT = { small: 5 + 84 + 4, big: 10 + 170 + 9 };

/**
 * The figure's picture, shown unchanged in a plain white frame. Without one (or if it can't load),
 * the figure "artwork": a brick in the theme's color with the figure's initials on it.
 */
export function FigureArt({ name, theme, photo, big, onPhotoError }: Props) {
  const t = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (photo && failedUrl !== photo.url) {
    return (
      <View style={[styles.frame, { height: big ? HEIGHT.big : HEIGHT.small, borderColor: t.border }]}>
        <Image
          source={{ uri: photo.url }}
          style={styles.photo}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Picture of the ${name} minifigure`}
          onError={() => {
            setFailedUrl(photo.url);
            onPhotoError?.();
          }}
        />
      </View>
    );
  }

  const color = themeColor(theme);
  return (
    <Brick
      color={color}
      studs={big ? 4 : 2}
      size={big ? 'lg' : 'sm'}
      contentStyle={[styles.face, { height: big ? 170 : 84 }]}
    >
      <Text style={[styles.initials, { color: textOn(color), fontSize: big ? 72 : 36 }]} maxFontSizeMultiplier={1.3}>
        {initials(name)}
      </Text>
    </Brick>
  );
}

const styles = StyleSheet.create({
  // White in light and dark mode, because the pictures have white backgrounds.
  frame: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, padding: 6, overflow: 'hidden' },
  photo: { flex: 1, width: '100%' },
  face: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: fonts.title, letterSpacing: 1 },
});
