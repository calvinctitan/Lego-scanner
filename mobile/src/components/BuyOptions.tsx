import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Figure } from '../data/figures';
import { brickLinkSearchUrl, ebaySearchUrl, openInAppBrowser } from '../lib/links';
import { brand, fonts, useTheme } from '../theme';
import { BrickButton } from './BrickButton';

/** Said wherever someone can leave the app to buy, so it's clear Legará isn't the seller. */
export const BUYING_NOTE =
  'You buy on that website, from its sellers, under its rules. Legará doesn’t sell anything, doesn’t take payments, and isn’t part of BrickLink or eBay. Under 18? Ask a parent before you buy.';

/** The two store buttons, each saying where it goes, plus the note that buying happens on the store's website. */
export function BuyOptions({ figure }: { figure: Figure }) {
  const t = useTheme();
  // Ignores a quick second tap while the store is opening.
  const opening = useRef(false);

  // The store opens straight from the tap (no waiting first), so a web browser doesn't block it as a pop-up.
  const open = (url: string) => {
    if (opening.current) return;
    opening.current = true;
    openInAppBrowser(url)
      .catch(() => {})
      // On the web the store opens instantly, so wait a moment before allowing another tap.
      .finally(() => setTimeout(() => (opening.current = false), 800));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.withCaption}>
        <BrickButton
          label="Buy on BrickLink"
          icon="cart"
          color={brand.blue}
          accessibilityHint="Opens a BrickLink search for this figure. You buy on BrickLink, not in Legará."
          onPress={() => open(brickLinkSearchUrl(figure.name))}
        />
        <Text style={[styles.caption, { color: t.textMuted }]}>Searches BrickLink, a website just for LEGO® sets and figures</Text>
      </View>
      <View style={styles.withCaption}>
        <BrickButton
          label="Buy on eBay"
          icon="pricetag"
          color={brand.yellow}
          accessibilityHint="Opens an eBay search for this figure. You buy on eBay, not in Legará."
          onPress={() => open(ebaySearchUrl(figure.name))}
        />
        <Text style={[styles.caption, { color: t.textMuted }]}>Searches eBay, a website that sells everything</Text>
      </View>
      <View style={[styles.note, { backgroundColor: t.photoBackground }]}>
        <Ionicons name="information-circle-outline" size={18} color={t.textMuted} />
        <Text style={[styles.noteText, { color: t.text }]}>{BUYING_NOTE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  withCaption: { gap: 6 },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 13, textAlign: 'center' },
  note: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12 },
  noteText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
});
