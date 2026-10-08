import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, fonts, useTheme } from '../theme';
import { Tile } from './Tile';

export type SortKey = 'most' | 'least' | 'az';

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'most', label: 'Most valuable' },
  { key: 'least', label: 'Least valuable' },
  { key: 'az', label: 'A to Z' },
];

type Props = {
  value: SortKey;
  onChange: (key: SortKey) => void;
};

/** A "Sort: Most valuable ▾" button that opens a small menu. */
export function SortMenu({ value, onChange }: Props) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.key === value) ?? SORT_OPTIONS[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${current.label}`}
        style={[styles.button, { backgroundColor: t.card, borderColor: t.border, borderBottomColor: t.cardEdge }]}
      >
        <Ionicons name="swap-vertical" size={16} color={t.text} />
        <Text style={[styles.buttonText, { color: t.text }]}>{current.label}</Text>
        <Ionicons name="chevron-down" size={16} color={t.textMuted} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: t.backdrop }]} onPress={() => setOpen(false)}>
          {/* This inner Pressable swallows taps on the menu so they don't reach the backdrop and close it. */}
          <Pressable style={styles.menuWrap} onPress={() => {}}>
            <Tile style={styles.menu}>
              <Text style={[styles.menuTitle, { color: t.text }]}>Sort by</Text>
              {SORT_OPTIONS.map((option) => {
                const selected = option.key === value;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => {
                      onChange(option.key);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [styles.option, { borderTopColor: t.border }, pressed && { opacity: 0.6 }]}
                  >
                    <Text style={[styles.optionText, { color: t.text }, selected && { color: t.scheme === 'dark' ? '#5B9BFF' : brand.blue }]}>
                      {option.label}
                    </Text>
                    {selected ? <Ionicons name="checkmark" size={20} color={t.scheme === 'dark' ? '#5B9BFF' : brand.blue} /> : null}
                  </Pressable>
                );
              })}
            </Tile>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderBottomWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  buttonText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 32 },
  menuWrap: { alignSelf: 'stretch' },
  menu: { paddingVertical: 8 },
  menuTitle: { fontFamily: fonts.title, fontSize: 20, paddingVertical: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontFamily: fonts.bodyBold, fontSize: 17 },
});
