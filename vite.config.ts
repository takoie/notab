/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';

const host = process.env.TAURI_DEV_HOST;
const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const pkg = createRequire(import.meta.url)('./package.json') as { version: string };

export default defineConfig({
  plugins: [svelte()],
  resolve: { alias: { $lib: r('./src/lib') } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },

  clearScreen: false,
  // mathlive is a large but lazily-loaded chunk — the warning isn't actionable
  build: { chunkSizeWarningLimit: 900 },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],

  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,svelte.ts}',
      'convex/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
    globals: true,
  },
});
