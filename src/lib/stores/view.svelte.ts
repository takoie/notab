import { appStore } from '../tauri';

const KEY = 'notab.view';
const SKEY = 'view';

export type ViewMode = 'notes' | 'calendar';

function isMode(v: unknown): v is ViewMode {
  return v === 'notes' || v === 'calendar';
}

class ViewStore {
  mode = $state<ViewMode>('notes');

  async init() {
    let local: ViewMode | null = null;
    try {
      const v = localStorage.getItem(KEY);
      if (isMode(v)) local = v;
    } catch {
      /* ignore */
    }
    if (local) this.mode = local;

    if (!local) {
      try {
        const stored = await (await appStore()).get<ViewMode>(SKEY);
        if (isMode(stored)) {
          this.mode = stored;
          this.#writeLocal(stored);
        }
      } catch {
        /* ignore */
      }
    }
  }

  set(mode: ViewMode) {
    this.mode = mode;
    this.#writeLocal(mode);
    void this.#writeStore(mode);
  }

  toggle() {
    this.set(this.mode === 'notes' ? 'calendar' : 'notes');
  }

  #writeLocal(mode: ViewMode) {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
  }

  async #writeStore(mode: ViewMode) {
    try {
      const s = await appStore();
      await s.set(SKEY, mode);
      await s.save();
    } catch {
      /* ignore */
    }
  }
}

export const view = new ViewStore();
