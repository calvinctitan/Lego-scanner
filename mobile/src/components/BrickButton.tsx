import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, textOn } from '../theme';
import { Brick } from './Brick';

type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  label: string;
  color: string;
  onPress: () => void;
  icon?: IconName;
  /** "large" is for the main actions on a screen. */
  variant?: 'large' | 'regular' | 'small';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A button that looks like a brick and presses down when tapped. Text is dark on light colors like yellow. */
export function BrickButton({ label, color, onPress, icon, variant = 'regular', disabled, style }: Props) {
  const fg = textOn(color);
  const v = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[disabled && styles.disabled, style]}
    >
      {({ pressed }) => (
        <Brick color={color} size={variant === 'small' ? 'sm' : 'md'} pressed={pressed} contentStyle={[styles.face, { minHeight: v.height }]}>
          {icon ? <Ionicons name={icon} size={v.icon} color={fg} /> : null}
          <Text style={[styles.label, { color: fg, fontSize: v.font }]} numberOfLines={1}>
            {label}
          </Text>
        </Brick>
      )}
    </Pressable>
  );
}

const VARIANTS = {
  large: { height: 62, font: 22, icon: 26 },
  regular: { height: 52, font: 19, icon: 22 },
  small: { height: 40, font: 16, icon: 18 },
};

const styles = StyleSheet.create({
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  label: {
    fontFamily: fonts.title,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
