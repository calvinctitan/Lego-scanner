export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Very rare';
export type Confidence = 'high' | 'medium' | 'low';

/** What the backend sends back after looking at a photo. Prices are in US dollars. */
export type ScanResult = {
  isMinifigure: boolean;
  name: string;
  theme: string;
  year: number | null;
  valueUsed: [number, number];
  valueNew: [number, number];
  rarity: Rarity;
  confidence: Confidence;
  note: string;
};

/** A scan saved on the phone for the "My scans" list. */
export type SavedScan = {
  id: string;
  createdAt: string;
  /** File name inside the app's "scans" folder (or a full URI on web). */
  photoFile: string;
  result: ScanResult;
};
