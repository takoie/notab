/**
 * Third-party software bundled into NotaB!. Kept as a hand-curated list of the
 * libraries that actually ship in the app (runtime dependencies + the build
 * toolchain that leaves code in the bundle) — update it when dependencies change.
 */

export interface LicenseEntry {
  name: string;
  license: string;
  url: string;
  note?: string;
}

export const LICENSES: LicenseEntry[] = [
  { name: 'Svelte', license: 'MIT', url: 'https://github.com/sveltejs/svelte' },
  {
    name: 'Tauri',
    license: 'MIT / Apache-2.0',
    url: 'https://github.com/tauri-apps/tauri',
    note: 'Desktop shell + @tauri-apps/api and the opener / process / store / updater plugins',
  },
  { name: 'Tailwind CSS', license: 'MIT', url: 'https://github.com/tailwindlabs/tailwindcss' },
  {
    name: 'Lucide (@lucide/svelte)',
    license: 'ISC',
    url: 'https://github.com/lucide-icons/lucide',
    note: 'Icon set',
  },
  {
    name: 'Convex (convex)',
    license: 'Apache-2.0',
    url: 'https://github.com/get-convex/convex-js',
    note: 'Sync backend client',
  },
  {
    name: 'idb',
    license: 'ISC',
    url: 'https://github.com/jakearchibald/idb',
    note: 'IndexedDB wrapper (local storage)',
  },
  {
    name: 'svelte-dnd-action',
    license: 'MIT',
    url: 'https://github.com/isaacHagoel/svelte-dnd-action',
    note: 'Drag-and-drop for notes and tabs',
  },
  {
    name: 'fractional-indexing',
    license: 'CC0-1.0',
    url: 'https://github.com/rocicorp/fractional-indexing',
    note: 'Order keys for manual sorting',
  },
  { name: 'clsx', license: 'MIT', url: 'https://github.com/lukeed/clsx' },
  { name: 'tailwind-merge', license: 'MIT', url: 'https://github.com/dcastil/tailwind-merge' },
];
