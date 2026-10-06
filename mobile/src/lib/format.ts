const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** 1800 → "$1,800" */
export function formatPrice(value: number): string {
  return dollars.format(Math.round(value));
}

/** [40, 60] → "$40–$60". Shows a dash when there's no estimate. */
export function formatRange([low, high]: [number, number]): string {
  if (!low && !high) return '—';
  if (Math.round(low) === Math.round(high)) return formatPrice(low);
  return `${formatPrice(low)}–${formatPrice(high)}`;
}

/** "Star Wars · 2003" (skips whatever is missing) */
export function themeAndYear(theme: string, year: number | null): string {
  return [theme, year ? String(year) : ''].filter(Boolean).join(' · ');
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
