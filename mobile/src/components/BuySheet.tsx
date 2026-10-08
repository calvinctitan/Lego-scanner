import { useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Figure } from '../data/figures';
import { formatPrice } from '../lib/format';
import { fonts, useTheme } from '../theme';
import { BuyOptions } from './BuyOptions';
import { TextLink } from './TextLink';
import { Tile } from './Tile';

type Props = {
  /** The figure to buy, or null when the sheet is closed. */
  figure: Figure | null;
  onClose: () => void;
  /** Set when there's a details page to go to (from the Marketplace list). */
  onMoreInfo?: (figure: Figure) => void;
};

/**
 * "Where do you want to buy it?" Opens when you tap a figure. Each button opens the store's own
 * website; the buying itself happens there, never in Legará.
 */
export function BuySheet({ figure, onClose, onMoreInfo }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Keeps showing the last figure while the sheet fades away.
  const last = useRef<Figure | null>(null);
  if (figure) last.current = figure;
  const shown = figure ?? last.current;

  return (
    <Modal visible={figure !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: t.backdrop, paddingBottom: insets.bottom + 16, paddingTop: insets.top + 16 }]}
        onPress={onClose}
        accessible={false}
      >
        {/* This inner Pressable swallows taps on the sheet so they don't reach the backdrop and close it. */}
        <Pressable style={styles.panelWrap} onPress={() => {}} accessible={false}>
          <View accessibilityViewIsModal onAccessibilityEscape={onClose}>
            <Tile style={styles.panel}>
              <ScrollView style={{ maxHeight: height * 0.85 }} contentContainerStyle={styles.content} bounces={false}>
                {shown ? (
                  <>
                    <View style={styles.titleBlock}>
                      <Text style={[styles.title, { color: t.text }]} accessibilityRole="header">
                        Buy {shown.name}
                      </Text>
                      <Text style={[styles.price, { color: t.priceText }]}>About {formatPrice(shown.priceUsed)} used</Text>
                    </View>
                    <BuyOptions figure={shown} />
                    {onMoreInfo ? (
                      <TextLink icon="reader-outline" label="More about this figure" onPress={() => onMoreInfo(shown)} />
                    ) : null}
                  </>
                ) : null}
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  hitSlop={6}
                  style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
                >
                  <Text style={[styles.cancelText, { color: t.link }]}>Cancel</Text>
                </Pressable>
              </ScrollView>
            </Tile>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16 },
  panelWrap: { alignSelf: 'center', width: '100%', maxWidth: 480 },
  panel: { paddingVertical: 4 },
  content: { gap: 16, paddingVertical: 12 },
  titleBlock: { gap: 2 },
  title: { fontFamily: fonts.title, fontSize: 24, lineHeight: 28 },
  price: { fontFamily: fonts.bodyHeavy, fontSize: 17 },
  cancel: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 24 },
  cancelText: { fontFamily: fonts.bodyHeavy, fontSize: 17 },
  pressed: { opacity: 0.55 },
});
