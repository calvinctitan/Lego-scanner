import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/tabs';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand, fonts, useTheme } from '../theme';
import { Brick } from './Brick';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Keys are the route file names in src/app/(tabs).
const TABS: Record<string, { label: string; icon: IconName; iconIdle: IconName; color: string }> = {
  index: { label: 'Scan', icon: 'camera', iconIdle: 'camera-outline', color: brand.red },
  marketplace: { label: 'Marketplace', icon: 'bag-handle', iconIdle: 'bag-handle-outline', color: brand.blue },
};

/** Bottom tab bar. The active tab's icon sits on a small colored brick with two studs. */
export function BrickTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { backgroundColor: t.tabBar, borderTopColor: t.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
          >
            <View style={styles.iconSlot}>
              {focused ? (
                <Brick color={tab.color} studs={2} size="xs" style={{ width: 46 }} contentStyle={styles.iconBrick}>
                  <Ionicons name={tab.icon} size={18} color="#FFFFFF" maxFontSizeMultiplier={1} />
                </Brick>
              ) : (
                <Ionicons name={tab.iconIdle} size={24} color={t.textMuted} maxFontSizeMultiplier={1} />
              )}
            </View>
            <Text style={[styles.label, { color: focused ? t.text : t.textMuted }]} maxFontSizeMultiplier={1.3}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconSlot: {
    height: 36,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  iconBrick: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.title,
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
