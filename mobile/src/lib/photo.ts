import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

// Claude doesn't need a full 12-megapixel photo. Shrinking it makes uploads fast and cheap.
const MAX_SIDE = 1280;

export type PreparedPhoto = {
  /** Local file of the shrunken JPEG (shown on screen and saved to "My scans"). */
  uri: string;
  /** The same JPEG as base64 text, which is what we send to the backend. */
  base64: string;
};

/** Opens the camera or photo library. Returns null if the user cancels. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PreparedPhoto | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'To scan a minifigure, allow Legará (or Expo Go) to use the camera in Settings.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return null;
    }
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }

  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return shrink(asset.uri, asset.width, asset.height);
}

async function shrink(uri: string, width: number, height: number): Promise<PreparedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  if (!width || !height) context.resize({ width: MAX_SIDE });
  else if (Math.max(width, height) > MAX_SIDE) context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });

  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error('Couldn’t read that photo. Please try another one.');
  return { uri: saved.uri, base64: saved.base64 };
}
