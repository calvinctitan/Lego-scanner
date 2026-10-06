// Importing each weight separately keeps unused font files out of the app.
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one/400Regular';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_600SemiBold } from '@expo-google-fonts/nunito/600SemiBold';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { brand, useTheme } from '../theme';

// Keep the splash screen up until the fonts are ready, so text never flashes in the wrong font.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const t = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    LilitaOne_400Regular,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.baseplate).catch(() => {});
  }, [t.baseplate]);

  if (!fontsLoaded && !fontError) return null;

  const base = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, primary: brand.blue, background: t.baseplate, card: t.card, text: t.text, border: t.border },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.baseplate } }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
