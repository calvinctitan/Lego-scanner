import { StyleSheet, Text } from 'react-native';

import { fonts, useTheme } from '../theme';

/** Shown under the logo on both tabs (and so on the first screen of the website): Legará is a fan project, not a LEGO product. */
export const FAN_NOTICE =
  'Unofficial fan project. LEGO® is a trademark of the LEGO Group of companies, which does not sponsor, authorize or endorse Legará.';

export function FanNotice() {
  const t = useTheme();
  return <Text style={[styles.text, { color: t.textMuted }]}>{FAN_NOTICE}</Text>;
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 8, maxWidth: 360 },
});
