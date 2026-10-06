import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { brand, fonts, useTheme } from '../theme';

type Props = {
  message: string;
  /** The button's word, like "Undo". */
  actionLabel: string;
  onAction: () => void;
};

/** A bar that floats at the bottom of the screen with one button, like "Removed Mr. Gold   Undo". */
export function ActionBar({ message, actionLabel, onAction }: Props) {
  const t = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(150)}
      style={[styles.bar, { backgroundColor: t.toast }]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel}. ${message}`}
        hitSlop={10}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText} maxFontSizeMultiplier={1.3}>
          {actionLabel}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  message: { flex: 1, color: '#FFFFFF', fontFamily: fonts.bodyBold, fontSize: 15 },
  action: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionText: { color: brand.yellow, fontFamily: fonts.title, fontSize: 18 },
  pressed: { opacity: 0.6 },
});
