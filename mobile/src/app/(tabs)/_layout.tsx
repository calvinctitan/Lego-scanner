import { Tabs } from 'expo-router';

import { BrickTabBar } from '../../components/BrickTabBar';
import { useTheme } from '../../theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BrickTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.baseplate } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Scan' }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Marketplace' }} />
    </Tabs>
  );
}
