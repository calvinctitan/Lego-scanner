import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Baseplate } from '../../../components/Baseplate';
import { FigureCard } from '../../../components/FigureCard';
import { Logo } from '../../../components/Logo';
import { SortMenu, type SortKey } from '../../../components/SortMenu';
import { ALL_THEMES, ThemeChips } from '../../../components/ThemeChips';
import { Tile } from '../../../components/Tile';
import { FIGURES, fold, type Figure } from '../../../data/figures';
import { fonts, useTheme } from '../../../theme';

const PADDING = 16;
const GAP = 12;

function filterAndSort(figures: Figure[], query: string, theme: string, sort: SortKey): Figure[] {
  const q = fold(query.trim());
  const matches = figures.filter(
    (f) => (theme === ALL_THEMES || f.theme === theme) && (!q || fold(f.name).includes(q) || fold(f.theme).includes(q)),
  );
  return matches.sort((a, b) => {
    if (sort === 'az') return a.name.localeCompare(b.name);
    if (sort === 'least') return a.priceUsed - b.priceUsed || a.name.localeCompare(b.name);
    return b.priceUsed - a.priceUsed || a.name.localeCompare(b.name);
  });
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState(ALL_THEMES);
  const [sort, setSort] = useState<SortKey>('most');

  const figures = useMemo(() => filterAndSort(FIGURES, query, theme, sort), [query, theme, sort]);
  const cardWidth = Math.floor((width - PADDING * 2 - GAP) / 2);

  return (
    <Baseplate>
      <FlatList
        data={figures}
        keyExtractor={(f) => f.id}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        // Passed as an element (not a function) so the search box keeps focus while typing.
        ListHeaderComponent={
          <MarketplaceHeader
            query={query}
            onQuery={setQuery}
            theme={theme}
            onTheme={setTheme}
            sort={sort}
            onSort={setSort}
            count={figures.length}
          />
        }
        ListEmptyComponent={<EmptyState onReset={() => { setQuery(''); setTheme(ALL_THEMES); }} />}
        renderItem={({ item }) => (
          <FigureCard figure={item} width={cardWidth} onPress={() => router.push(`/marketplace/${item.id}`)} />
        )}
      />
    </Baseplate>
  );
}

type HeaderProps = {
  query: string;
  onQuery: (q: string) => void;
  theme: string;
  onTheme: (t: string) => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  count: number;
};

function MarketplaceHeader({ query, onQuery, theme, onTheme, sort, onSort, count }: HeaderProps) {
  const t = useTheme();
  return (
    <View style={styles.header}>
      <View style={styles.padded}>
        <View style={styles.logo}>
          <Logo size={34} />
        </View>
        <Tile style={styles.hero}>
          <Text style={[styles.title, { color: t.text }]}>Marketplace</Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]}>Browse typical prices, then buy from trusted sellers.</Text>

          <View style={[styles.search, { backgroundColor: t.photoBackground, borderColor: t.border }]}>
            <Ionicons name="search" size={18} color={t.placeholder} />
            <TextInput
              value={query}
              onChangeText={onQuery}
              placeholder="Search minifigures"
              placeholderTextColor={t.placeholder}
              style={[styles.searchInput, { color: t.text }]}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
              accessibilityLabel="Search minifigures"
            />
          </View>
        </Tile>
      </View>

      <ThemeChips value={theme} onChange={onTheme} />

      <View style={[styles.padded, styles.sortRow]}>
        <Text style={[styles.count, { color: t.text }]}>
          {count} {count === 1 ? 'figure' : 'figures'}
        </Text>
        <SortMenu value={sort} onChange={onSort} />
      </View>
    </View>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  const t = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, { color: t.textMuted }]}>No figures match your search.</Text>
      <Pressable onPress={onReset} accessibilityRole="button">
        <Text style={[styles.emptyLink, { color: t.text }]}>Clear filters</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 32, gap: GAP },
  columns: { gap: GAP, paddingHorizontal: PADDING },
  header: { gap: 14, marginBottom: 2 },
  padded: { paddingHorizontal: PADDING },
  logo: { alignItems: 'center', marginBottom: 20 },
  hero: { gap: 4 },
  title: { fontFamily: fonts.title, fontSize: 30 },
  subtitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, marginBottom: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, paddingVertical: 12 },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 40 },
  emptyText: { fontFamily: fonts.bodySemiBold, fontSize: 16 },
  emptyLink: { fontFamily: fonts.bodyHeavy, fontSize: 16, textDecorationLine: 'underline' },
});
