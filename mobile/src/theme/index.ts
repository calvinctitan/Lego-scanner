import { useColorScheme } from 'react-native';

export { brand, shade, textOn, darkText, lightText } from './colors';

// Font names come from @expo-google-fonts and are loaded in src/app/_layout.tsx.
export const fonts = {
  title: 'LilitaOne_400Regular',
  body: 'Nunito_400Regular',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;

export type Palette = {
  scheme: 'light' | 'dark';
  baseplate: string;
  stud: string;
  studHighlight: string;
  studShadow: string;
  card: string;
  cardEdge: string;
  border: string;
  text: string;
  textMuted: string;
  input: string;
  placeholder: string;
  photoBackground: string;
  tabBar: string;
  neutralBrick: string;
  warningBackground: string;
  warningText: string;
  backdrop: string;
  /** Tappable text such as "Recent sold prices on eBay". */
  link: string;
  /** Text for destructive actions such as "Remove from My scans". */
  danger: string;
  /** Prices shown as plain text (green that stays readable on the card). */
  priceText: string;
  /** The bar at the bottom with one button, such as Undo. */
  toast: string;
};

const light: Palette = {
  scheme: 'light',
  baseplate: '#E3E5E8',
  stud: '#D9DCE0',
  studHighlight: '#EDEFF1',
  studShadow: '#CACED3',
  card: '#FFFFFF',
  cardEdge: '#CDD1D6',
  border: '#D3D7DC',
  text: '#1B1F23',
  textMuted: '#5A626B',
  input: '#FFFFFF',
  placeholder: '#8A929B',
  photoBackground: '#F1F2F4',
  tabBar: '#FFFFFF',
  neutralBrick: '#6C6E68',
  warningBackground: '#FFF4CC',
  warningText: '#5C4700',
  backdrop: 'rgba(0,0,0,0.35)',
  link: '#0055BF',
  danger: '#B30E10',
  priceText: '#237841',
  toast: '#1B1F23',
};

const dark: Palette = {
  scheme: 'dark',
  baseplate: '#2C2F33',
  stud: '#33373B',
  studHighlight: '#3C4045',
  studShadow: '#25272B',
  card: '#1C1E21',
  cardEdge: '#111214',
  border: '#3A3E43',
  text: '#F1F3F5',
  textMuted: '#A9B0B8',
  input: '#1C1E21',
  placeholder: '#7D858E',
  photoBackground: '#26292D',
  tabBar: '#1C1E21',
  neutralBrick: '#6C6E68',
  warningBackground: '#3D3510',
  warningText: '#F5DE8A',
  backdrop: 'rgba(0,0,0,0.6)',
  link: '#7FB2FF',
  danger: '#FF8A8A',
  priceText: '#4FBF77',
  toast: '#454A50',
};

/** Returns the light or dark palette, following the phone's appearance setting. */
export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
