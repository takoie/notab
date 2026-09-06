export interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error' | 'success';
  action?: ToastAction;
  /** Sticky toasts stay until dismissed (or replaced); they never auto-expire. */
  sticky?: boolean;
}

export interface ToastOptions {
  tone?: Toast['tone'];
  ms?: number;
  action?: ToastAction;
  sticky?: boolean;
}

let nextId = 1;

class Toasts {
  items = $state<Toast[]>([]);

  push(message: string, toneOrOpts: Toast['tone'] | ToastOptions = 'info', ms = 3500) {
    const opts: ToastOptions =
      typeof toneOrOpts === 'string' ? { tone: toneOrOpts, ms } : { ms, ...toneOrOpts };
    const id = nextId++;
    this.items = [...this.items, { id, message, tone: opts.tone ?? 'info', action: opts.action, sticky: opts.sticky }];
    if (!opts.sticky) {
      setTimeout(() => this.dismiss(id), opts.ms ?? ms);
    }
    return id;
  }

  error(message: string) {
    return this.push(message, 'error', 5000);
  }
  success(message: string) {
    return this.push(message, 'success');
  }

  /** Update the message/tone/action of an existing toast in place. */
  update(id: number, patch: Partial<Omit<Toast, 'id'>>) {
    this.items = this.items.map((t) => (t.id === id ? { ...t, ...patch } : t));
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
