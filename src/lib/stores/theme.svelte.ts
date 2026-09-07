import { appStore } from '../tauri';

const KEY = 'notab.theme';
const SKEY = 'theme';
export type ThemePref = 'light' | 'dark' | 'system';

function isPref(v: unknown): v is ThemePref {
  return v === 'light' || v === 'dark' || v === 'system';
}

function systemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

class Theme {
  // fresh install defaults to light; the user can switch to system/dark
  pref = $state<ThemePref>('light');
  resolved = $state<'light' | 'dark'>('light');

  async init() {
    // fast path — synchronous, no flash
    let local: ThemePref | null = null;
    try {
      const v = localStorage.getItem(KEY);
      if (isPref(v)) local = v;
    } catch {
      /* ignore */
    }
    if (local) this.pref = local;
    this.#apply();

    // durable fallback: the Tauri store survives a WebView data wipe / reinstall
    if (!local) {
      try {
        const stored = await (await appStore()).get<ThemePref>(SKEY);
        if (isPref(stored)) {
          this.pref = stored;
          this.#apply();
          this.#writeLocal(stored);
        }
      } catch {
        /* ignore */
      }
    }

    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.pref === 'system') this.#apply();
    });
  }

  set(pref: ThemePref) {
    this.pref = pref;
    this.#writeLocal(pref);
    void this.#writeStore(pref);
    this.#apply();
  }

  toggle() {
    this.set(this.resolved === 'dark' ? 'light' : 'dark');
  }

  #writeLocal(pref: ThemePref) {
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* ignore */
    }
  }

  async #writeStore(pref: ThemePref) {
    try {
      const s = await appStore();
      await s.set(SKEY, pref);
      await s.save();
    } catch {
      /* ignore */
    }
  }

  #apply() {
    const dark = this.pref === 'dark' || (this.pref === 'system' && systemDark());
    this.resolved = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
  }
}

export const theme = new Theme();
