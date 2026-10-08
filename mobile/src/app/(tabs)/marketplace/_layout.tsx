import { Stack } from 'expo-router';

import { useTheme } from '../../../theme';

// Even when a link opens a figure directly, the list sits underneath it, so Back and the tab lead to the list.
export const unstable_settings = { anchor: 'index' };

// The Marketplace tab has its own stack so the detail screen slides in and the tab bar stays visible.
export default function MarketplaceLayout() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.baseplate } }} />;
}
