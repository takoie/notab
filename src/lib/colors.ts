/** Shared accent palette for tabs and notes. `null` = no colour. */
export const PALETTE: (string | null)[] = [
  '#6c63e8', // indigo
  '#8b5cf6', // violet
  '#4b9fe0', // blue
  '#0ea5e9', // sky
  '#14b8a6', // teal
  '#3ab082', // green
  '#84cc16', // lime
  '#d69e2e', // amber
  '#f97316', // orange
  '#e0546c', // rose
  '#ec4899', // pink
  '#64748b', // slate
  null,
];

export function tint(hex: string, pct: number): string {
  return `color-mix(in srgb, ${hex} ${pct}%, transparent)`;
}
