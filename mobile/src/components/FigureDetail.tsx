import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFigure, PRICES_CHECKED } from '../data/figures';
import { formatPrice, themeAndYear } from '../lib/format';
import { ebaySoldUrl, openInAppBrowser } from '../lib/links';
import { brand, fonts, useTheme } from '../theme';
import { Baseplate } from './Baseplate';
import { BuyOptions } from './BuyOptions';
import { BuySheet } from './BuySheet';
import { FigureArt } from './FigureArt';
import { PriceBrick } from './PriceBrick';
import { RarityBadge } from './RarityBadge';
import { TextLink } from './TextLink';
import { Tile } from './Tile';

type Props = {
  /** True when shown over the tabs (opened from a scan), so the page also leaves room for the home bar. */
  fullScreen?: boolean;
};

/** A Marketplace figure's page: price, note, and links to buy it on BrickLink or eBay. */
export function FigureDetail({ fullScreen = false }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const figure = getFigure(id);
  // Tapping the big picture opens the same "where to buy" sheet as the Marketplace list.
  const [buyOpen, setBuyOpen] = useState(false);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/marketplace'));

  return (
    <Baseplate>
      {/* The Back button stays at the top while the page scrolls. */}
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
      <ScrollView
        contentContainerStyle={[styles.content, fullScreen && { paddingBottom: 32 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {!figure ? (
          <Tile>
            <Text style={[styles.name, { color: t.text }]}>Figure not found</Text>
            <Text style={[styles.note, { color: t.textMuted }]}>It may have been removed from the list.</Text>
          </Tile>
        ) : (
          <>
            <Pressable
              onPress={() => setBuyOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Buy ${figure.name}`}
              accessibilityHint="Shows where to buy it."
              style={({ pressed }) => pressed && styles.artPressed}
            >
              <FigureArt name={figure.name} theme={figure.theme} big />
            </Pressable>
            <BuySheet figure={buyOpen ? figure : null} onClose={() => setBuyOpen(false)} />

            <Tile style={styles.card}>
              <View style={styles.titleBlock}>
                <Text style={[styles.name, { color: t.text }]}>{figure.name}</Text>
                <Text style={[styles.subtitle, { color: t.textMuted }]}>{themeAndYear(figure.theme, figure.year)}</Text>
                <RarityBadge rarity={figure.rarity} />
              </View>

              <View style={styles.priceBlock}>
                <PriceBrick label="Typical price, used" value={formatPrice(figure.priceUsed)} color={brand.green} big />
                <Text style={[styles.caption, { color: t.textMuted }]}>
                  A rough estimate ({PRICES_CHECKED}) of what a complete, used one has sold for on eBay and BrickLink. It isn’t a
                  live price or an offer to sell, so check recent sales.
                </Text>
                <TextLink icon="trending-up" label="Recent sold prices on eBay" onPress={() => openInAppBrowser(ebaySoldUrl(figure.name))} />
              </View>

              <Text style={[styles.note, { color: t.text }]}>{figure.note}</Text>

              <BuyOptions figure={figure} />
            </Tile>
          </>
        )}
      </ScrollView>
    </Baseplate>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 18 },
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
  card: { gap: 18 },
  titleBlock: { gap: 6 },
  name: { fontFamily: fonts.title, fontSize: 30, lineHeight: 34 },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  note: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  artPressed: { transform: [{ translateY: 2 }] },
  priceBlock: { gap: 6 },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
});
