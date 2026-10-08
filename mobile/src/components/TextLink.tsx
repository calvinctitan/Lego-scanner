import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { fonts, useTheme } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  /** "danger" for destructive actions like removing a scan. */
  tone?: 'link' | 'danger';
};

/** A tappable line of text with an icon, for secondary actions. */
export function TextLink({ label, onPress, icon, tone = 'link' }: Props) {
  const t = useTheme();
  const color = tone === 'danger' ? t.danger : t.link;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={tone === 'danger' ? 'button' : 'link'}
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={19} color={color} /> : null}
      <Text style={[styles.text, { color }]}>{label}</Text>
      {tone === 'link' ? <Ionicons name="chevron-forward" size={16} color={color} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, alignSelf: 'flex-start' },
  pressed: { opacity: 0.55 },
  text: { fontFamily: fonts.bodyHeavy, fontSize: 16, flexShrink: 1 },
});
