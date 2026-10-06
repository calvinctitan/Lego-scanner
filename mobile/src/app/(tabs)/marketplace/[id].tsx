import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Baseplate } from '../../../components/Baseplate';
import { BrickButton } from '../../../components/BrickButton';
import { FigureArt } from '../../../components/FigureArt';
import { PriceBrick } from '../../../components/PriceBrick';
import { RarityBadge } from '../../../components/RarityBadge';
import { Tile } from '../../../components/Tile';
import { getFigure } from '../../../data/figures';
import { formatPrice, themeAndYear } from '../../../lib/format';
import { brickLinkSearchUrl, ebaySearchUrl, openInAppBrowser } from '../../../lib/links';
import { brand, fonts, useTheme } from '../../../theme';

export default function FigureDetailScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const figure = getFigure(id);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/marketplace'));

  return (
    <Baseplate>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
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

        {!figure ? (
          <Tile>
            <Text style={[styles.name, { color: t.text }]}>Figure not found</Text>
            <Text style={[styles.note, { color: t.textMuted }]}>It may have been removed from the list.</Text>
          </Tile>
        ) : (
          <>
            <FigureArt name={figure.name} theme={figure.theme} big />

            <Tile style={styles.card}>
              <View style={styles.titleBlock}>
                <Text style={[styles.name, { color: t.text }]}>{figure.name}</Text>
                <Text style={[styles.subtitle, { color: t.textMuted }]}>{themeAndYear(figure.theme, figure.year)}</Text>
                <RarityBadge rarity={figure.rarity} />
              </View>

              <PriceBrick label="Typical price, used" value={formatPrice(figure.priceUsed)} color={brand.green} big />

              <Text style={[styles.note, { color: t.text }]}>{figure.note}</Text>

              <View style={styles.actions}>
                <BrickButton
                  label="Buy on BrickLink"
                  icon="cart"
                  color={brand.blue}
                  onPress={() => openInAppBrowser(brickLinkSearchUrl(figure.name))}
                />
                <BrickButton
                  label="Buy on eBay"
                  icon="pricetag"
                  color={brand.yellow}
                  onPress={() => openInAppBrowser(ebaySearchUrl(figure.name))}
                />
              </View>
              <Text style={[styles.fine, { color: t.textMuted }]}>You’ll finish buying on the seller’s website.</Text>
            </Tile>
          </>
        )}
      </ScrollView>
    </Baseplate>
  );
}

const styles = StyleSheet.create({
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
  actions: { gap: 12 },
  fine: { fontFamily: fonts.bodySemiBold, fontSize: 13, textAlign: 'center' },
});
