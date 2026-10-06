import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { THEMES, themeColor } from '../data/figures';
import { brand, fonts, shade, textOn, useTheme } from '../theme';

export const ALL_THEMES = 'All';
const OPTIONS = [ALL_THEMES, ...THEMES];

type Props = {
  value: string;
  onChange: (theme: string) => void;
};

/** A sideways-scrolling row of theme filters. The selected chip takes on the theme's brick color. */
export function ThemeChips({ value, onChange }: Props) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {OPTIONS.map((theme) => {
        const selected = theme === value;
        const color = theme === ALL_THEMES ? brand.blue : themeColor(theme);
        return (
          <Pressable
            key={theme}
            onPress={() => onChange(theme)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              selected
                ? { backgroundColor: color, borderColor: color, borderBottomColor: shade(color, -0.3) }
                : { backgroundColor: t.card, borderColor: t.border, borderBottomColor: t.cardEdge },
            ]}
          >
            <Text style={[styles.label, { color: selected ? textOn(color) : t.text }]}>{theme}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
