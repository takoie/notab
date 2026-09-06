const KEY = 'notab.view';

export type ViewMode = 'notes' | 'calendar';

class ViewStore {
  mode = $state<ViewMode>('notes');

  init() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'notes' || saved === 'calendar') this.mode = saved;
    } catch {
      /* ignore */
    }
  }

  set(mode: ViewMode) {
    this.mode = mode;
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* ignore */
    }
  }

  toggle() {
    this.set(this.mode === 'notes' ? 'calendar' : 'notes');
  }
}

export const view = new ViewStore();
