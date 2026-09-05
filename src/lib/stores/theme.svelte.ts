const KEY = 'notab.theme';
export type ThemePref = 'light' | 'dark' | 'system';

function systemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

class Theme {
  pref = $state<ThemePref>('system');
  resolved = $state<'light' | 'dark'>('light');

  init() {
    try {
      const saved = localStorage.getItem(KEY) as ThemePref | null;
      if (saved === 'light' || saved === 'dark' || saved === 'system') this.pref = saved;
    } catch {
      /* ignore */
    }
    this.#apply();
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.pref === 'system') this.#apply();
    });
  }

  set(pref: ThemePref) {
    this.pref = pref;
    try {
      localStorage.setItem(KEY, pref);
    } catch {
      /* ignore */
    }
    this.#apply();
  }

  toggle() {
    this.set(this.resolved === 'dark' ? 'light' : 'dark');
  }

  #apply() {
    const dark = this.pref === 'dark' || (this.pref === 'system' && systemDark());
    this.resolved = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
  }
}

export const theme = new Theme();
