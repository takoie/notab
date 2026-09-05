export interface Toast {
  id: number;
  message: string;
  tone: 'info' | 'error' | 'success';
}

let nextId = 1;

class Toasts {
  items = $state<Toast[]>([]);

  push(message: string, tone: Toast['tone'] = 'info', ms = 3500) {
    const id = nextId++;
    this.items = [...this.items, { id, message, tone }];
    setTimeout(() => this.dismiss(id), ms);
  }

  error(message: string) {
    this.push(message, 'error', 5000);
  }
  success(message: string) {
    this.push(message, 'success');
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
