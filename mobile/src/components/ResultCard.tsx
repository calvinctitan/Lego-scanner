import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, formatRange, themeAndYear } from '../lib/format';
import { usePhotoHeight } from '../lib/layout';
import type { ScanResult } from '../lib/types';
import { brand, fonts, useTheme } from '../theme';
import { BrickButton } from './BrickButton';
import { PriceBrick, priceFontSize } from './PriceBrick';
import { RarityBadge } from './RarityBadge';
import { TextLink } from './TextLink';
import { Tile } from './Tile';

type Props = {
  photoUri: string;
  result: ScanResult;
  /** When the estimate was made (ISO date). */
  estimatedAt: string;
  onFindForSale: () => void;
  onSeeSoldPrices: () => void;
  onScanAnother: () => void;
  onClose: () => void;
  /** Set when the Marketplace lists this figure. */
  marketplaceName?: string;
  onOpenMarketplace?: () => void;
  /** Set when the scan is saved in "My scans". */
  onRemove?: () => void;
};

export function ResultCard(props: Props) {
  const { photoUri, result, estimatedAt, marketplaceName } = props;
  const t = useTheme();
  const photoHeight = usePhotoHeight();
  const subtitle = themeAndYear(result.theme, result.year);

  // When Claude isn't sure, mark the prices as rough. Both bricks use one font size so they match.
  const rough = result.confidence === 'low' ? '≈ ' : '';
  const used = rough + formatRange(result.valueUsed);
  const fresh = rough + formatRange(result.valueNew);
  const fontSize = Math.min(priceFontSize(used), priceFontSize(fresh));

  return (
    <Tile style={styles.card}>
      <View>
        <Image source={{ uri: photoUri }} style={[styles.photo, { height: photoHeight, backgroundColor: t.photoBackground }]} resizeMode="contain" />
        <Pressable
          onPress={props.onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={({ pressed }) => [styles.close, { backgroundColor: t.card, borderColor: t.border }, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={22} color={t.text} />
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.name, { color: t.text }]}>{result.name}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text> : null}
        <RarityBadge rarity={result.rarity} />
      </View>

      {result.confidence === 'low' ? (
        <View style={[styles.warning, { backgroundColor: t.warningBackground }]}>
          <Ionicons name="help-circle" size={20} color={t.warningText} />
          <Text style={[styles.warningText, { color: t.warningText }]}>
            Not sure about this one. Try a clearer photo on a plain background.
          </Text>
        </View>
      ) : null}

      <View style={styles.prices}>
        <PriceBrick label="Used" value={used} fontSize={fontSize} color={brand.green} style={styles.price} />
        <PriceBrick label="New" value={fresh} fontSize={fontSize} color={brand.blue} style={styles.price} />
      </View>
      <View style={styles.explain}>
        <Text style={[styles.caption, { color: t.textMuted }]}>
          Used: complete, with its usual accessories. New: never opened. Estimated by AI on {formatDate(estimatedAt)}.
        </Text>
        <TextLink icon="trending-up" label="Recent sold prices on eBay" onPress={props.onSeeSoldPrices} />
      </View>

      {result.note ? <Text style={[styles.note, { color: t.text }]}>{result.note}</Text> : null}

      <View style={styles.actions}>
        <View style={styles.withCaption}>
          <BrickButton label="Find it for sale" icon="pricetag" color={brand.yellow} onPress={props.onFindForSale} />
          <Text style={[styles.buttonCaption, { color: t.textMuted }]}>Searches eBay for this figure</Text>
        </View>
        <BrickButton label="Scan another" icon="camera" color={brand.red} onPress={props.onScanAnother} />
      </View>

      {marketplaceName && props.onOpenMarketplace ? (
        <TextLink icon="storefront-outline" label={`See ${marketplaceName} in the Marketplace`} onPress={props.onOpenMarketplace} />
      ) : null}
      {props.onRemove ? <TextLink icon="trash-outline" label="Remove from My scans" tone="danger" onPress={props.onRemove} /> : null}
    </Tile>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16 },
  photo: { width: '100%', borderRadius: 12 },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  titleBlock: { gap: 6 },
  name: { fontFamily: fonts.title, fontSize: 28, lineHeight: 32 },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  warning: { flexDirection: 'row', gap: 8, alignItems: 'center', borderRadius: 12, padding: 12 },
  warningText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  prices: { flexDirection: 'row', gap: 12 },
  price: { flex: 1 },
  explain: { gap: 2, marginTop: -6 },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
  note: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  actions: { gap: 12 },
  withCaption: { gap: 6 },
  buttonCaption: { fontFamily: fonts.bodySemiBold, fontSize: 13, textAlign: 'center' },
});
