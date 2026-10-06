import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { THEMES, themeColor } from '../data/figures';
import { brand, fonts, shade, textOn, useTheme } from '../theme';

export const ALL_THEMES = 'All';
const OPTIONS = [ALL_THEMES, ...THEMES];

type Props = {
  value: string;
  onChange: (theme: string) => void;
};

// The sideways "peek" that shows the row scrolls plays once per app launch.
let peekShown = false;

/** A sideways-scrolling row of theme filters. The selected chip takes on the theme's brick color. */
export function ThemeChips({ value, onChange }: Props) {
  const t = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (peekShown) return;
    peekShown = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduceMotion) => {
        if (reduceMotion) return;
        timers.push(setTimeout(() => scrollRef.current?.scrollTo({ x: 110, animated: true }), 700));
        timers.push(setTimeout(() => scrollRef.current?.scrollTo({ x: 0, animated: true }), 1400));
      });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
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
            {selected ? <Ionicons name="checkmark" size={16} color={textOn(color)} /> : null}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
