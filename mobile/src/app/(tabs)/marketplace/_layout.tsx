import { Stack } from 'expo-router';

import { useTheme } from '../../../theme';

// The Marketplace tab has its own stack so the detail screen slides in and the tab bar stays visible.
export default function MarketplaceLayout() {
  const t = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.baseplate } }} />;
}
