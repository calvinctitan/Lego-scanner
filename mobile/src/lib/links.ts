import * as WebBrowser from 'expo-web-browser';
import { Appearance } from 'react-native';

import { brand } from '../theme';

export function ebaySearchUrl(figureName: string): string {
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`LEGO ${figureName} minifigure`)}`;
}

export function brickLinkSearchUrl(figureName: string): string {
  return `https://www.bricklink.com/v2/search.page?q=${encodeURIComponent(figureName)}#T=M`;
}

/** Opens a web page in a browser that slides up inside the app. Buying happens on the seller's site. */
export async function openInAppBrowser(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    controlsColor: Appearance.getColorScheme() === 'dark' ? '#5B9BFF' : brand.blue,
    dismissButtonStyle: 'done',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
