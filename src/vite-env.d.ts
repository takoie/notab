/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_CONVEX_SITE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** App version, injected from package.json at build time (see vite.config.ts). */
declare const __APP_VERSION__: string;
