import { useWindowDimensions } from 'react-native';

/** Photo height that still leaves the price on screen on small phones like the iPhone SE. */
export function usePhotoHeight(): number {
  const { height } = useWindowDimensions();
  return height < 740 ? 180 : 240;
}
