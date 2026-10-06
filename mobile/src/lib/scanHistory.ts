import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { SavedScan, ScanResult } from './types';

const STORAGE_KEY = 'legara.scans.v1';
const MAX_SCANS = 50;

// Photos live in the app's Documents folder, which iOS keeps until the app is deleted.
// We store only the file name, because the full folder path can change when the app updates.
function scansFolder(): Directory {
  return new Directory(Paths.document, 'scans');
}

export function scanPhotoUri(scan: SavedScan): string {
  if (Platform.OS === 'web') return scan.photoFile;
  return new File(scansFolder(), scan.photoFile).uri;
}

export async function loadScans(): Promise<SavedScan[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedScan[]) : [];
  } catch {
    return [];
  }
}

/** Saves a finished scan (and a copy of its photo) to the phone. Newest first. */
export async function saveScan(tempPhotoUri: string, result: ScanResult): Promise<SavedScan> {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  let photoFile = tempPhotoUri;

  if (Platform.OS !== 'web') {
    const folder = scansFolder();
    folder.create({ intermediates: true, idempotent: true });
    photoFile = `${id}.jpg`;
    await new File(tempPhotoUri).copy(new File(folder, photoFile));
  }

  const scan: SavedScan = { id, createdAt: new Date().toISOString(), photoFile, result };
  const all = [scan, ...(await loadScans())];
  const kept = all.slice(0, MAX_SCANS);

  // Clean up photos of scans that fell off the end of the list.
  if (Platform.OS !== 'web') {
    for (const old of all.slice(MAX_SCANS)) {
      try {
        const file = new File(scansFolder(), old.photoFile);
        if (file.exists) file.delete();
      } catch {
        // A missing file is fine.
      }
    }
  }

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
  return scan;
}
