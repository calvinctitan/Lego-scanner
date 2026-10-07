import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Baseplate } from '../components/Baseplate';
import { Tile } from '../components/Tile';
import { fonts, useTheme } from '../theme';

/** About Legará: what it is and isn't, privacy, trademarks, and credits for the open-source parts. */
export default function AboutScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Baseplate>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.back,
            { backgroundColor: t.card, borderColor: t.border, borderBottomColor: t.cardEdge },
            pressed && { transform: [{ translateY: 2 }] },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={t.text} />
          <Text style={[styles.backText, { color: t.text }]}>Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}>
        <Tile style={styles.card}>
          <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
            About Legará
          </Text>

          <Section title="What Legará is">
            Legará is an independent test app made by a fan. It is not made, sponsored or endorsed by the LEGO Group,
            BrickLink, eBay or any other company named in it.
          </Section>

          <Section title="Buying">
            Legará doesn’t sell anything and doesn’t take payments. The Buy buttons open BrickLink or eBay, where you buy
            from independent sellers under that website’s own rules. Legará isn’t part of that purchase.
          </Section>

          <Section title="Prices">
            Prices are rough estimates for information only. Scan prices are an AI estimate (made by Claude, Anthropic’s AI)
            based on past eBay and BrickLink sales, not live prices, and they can be wrong. Check recent sold listings before
            you buy or sell.
          </Section>

          <Section title="Privacy">
            Your scans and their photos are saved only on this phone. When you scan, the photo is sent to Claude (Anthropic’s
            AI) to estimate the price. Legará itself doesn’t keep or share it anywhere else, and has no accounts, ads or
            tracking. Websites you open from the app have their own privacy rules.
          </Section>

          <Section title="Trademarks">
            LEGO® is a trademark of the LEGO Group of companies, which does not sponsor, authorize or endorse this app. Star
            Wars, Harry Potter, Marvel, DC, The Lord of the Rings, NINJAGO, BrickLink, eBay, Claude and all character and
            product names are trademarks of their owners, who don’t sponsor or endorse this app. Names are used only to
            identify the figures and websites described.
          </Section>

          <Section title="Credits">
            Fonts: Lilita One, copyright 2011 Juan Montoreano, and Nunito, copyright 2014 The Nunito Project Authors, both
            under the SIL Open Font License 1.1. Icons: Ionicons by Ionic (MIT License), via @expo/vector-icons (MIT License).
            Built with Expo and React Native (MIT License). The app icon and brick artwork are original to Legará.
          </Section>
        </Tile>
      </ScrollView>
    </Baseplate>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: t.text }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[styles.body, { color: t.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingLeft: 8,
    paddingRight: 14,
    paddingVertical: 7,
  },
  backText: { fontFamily: fonts.title, fontSize: 17 },
  content: { paddingHorizontal: 16 },
  card: { gap: 18 },
  title: { fontFamily: fonts.title, fontSize: 30, lineHeight: 34 },
  section: { gap: 4 },
  sectionTitle: { fontFamily: fonts.bodyHeavy, fontSize: 17 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
});
