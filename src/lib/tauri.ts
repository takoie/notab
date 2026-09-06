/**
 * Thin wrappers around Tauri APIs that degrade to no-ops in a plain browser
 * (so `npm run dev:web` works without the desktop shell).
 */

export const inTauri =
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export async function windowControls() {
  if (!inTauri) {
    return {
      minimize: async () => {},
      toggleMaximize: async () => {},
      close: async () => {},
      startDragging: async () => {},
    };
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const w = getCurrentWindow();
  return {
    minimize: () => w.minimize(),
    toggleMaximize: () => w.toggleMaximize(),
    close: () => w.close(),
    startDragging: () => w.startDragging(),
  };
}

export type ResizeDir =
  | 'North'
  | 'South'
  | 'East'
  | 'West'
  | 'NorthEast'
  | 'NorthWest'
  | 'SouthEast'
  | 'SouthWest';

/** Begin an interactive resize of the current window from the given edge/corner. */
export async function startResize(dir: ResizeDir) {
  if (!inTauri) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  // ResizeDirection enum values are the same PascalCase strings
  await getCurrentWindow().startResizeDragging(dir as never);
}

export async function openPinnedWindow(opts: {
  kind: 'note' | 'tab' | 'board';
  id: string;
  title: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  if (!inTauri) {
    window.open(
      `${location.pathname}?window=pin&kind=${opts.kind}&id=${encodeURIComponent(opts.id)}`,
      `pin-${opts.id}`,
      'width=320,height=400',
    );
    return;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_pinned_window', opts);
}

export async function closePinnedWindow(kind: 'note' | 'tab' | 'board', id: string) {
  if (!inTauri) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('close_pinned_window', { kind, id });
}

/** Open a URL in the user's default browser (or a new tab on the web). */
export async function openExternal(url: string) {
  if (!inTauri) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function focusMainWindow() {
  if (!inTauri) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('focus_main_window');
}

/* ---- cross-window events (lock broadcast) ---- */

export async function emitAppEvent(event: string, payload?: unknown) {
  if (!inTauri) return;
  const { emit } = await import('@tauri-apps/api/event');
  await emit(event, payload);
}

export async function listenAppEvent<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<() => void> {
  if (!inTauri) return () => {};
  const { listen } = await import('@tauri-apps/api/event');
  return listen<T>(event, (e) => handler(e.payload));
}

/* ---- persistent store (PIN hash, popup geometry, settings) ---- */

type StoreLike = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
};

let storePromise: Promise<StoreLike> | null = null;

export function appStore(): Promise<StoreLike> {
  if (!storePromise) {
    storePromise = (async () => {
      if (!inTauri) return browserStore();
      try {
        const { load } = await import('@tauri-apps/plugin-store');
        return (await load('notab.store.json', { autoSave: true })) as unknown as StoreLike;
      } catch {
        return browserStore();
      }
    })();
  }
  return storePromise;
}

function browserStore(): StoreLike {
  const prefix = 'notab.store.';
  return {
    async get<T>(key: string) {
      try {
        const raw = localStorage.getItem(prefix + key);
        return raw ? (JSON.parse(raw) as T) : undefined;
      } catch {
        return undefined;
      }
    },
    async set(key, value) {
      try {
        localStorage.setItem(prefix + key, JSON.stringify(value));
      } catch {
        /* ignore */
      }
    },
    async delete(key) {
      localStorage.removeItem(prefix + key);
      return true;
    },
    async save() {},
  };
}
