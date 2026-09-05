const KEY = 'notab.session';

interface Persisted {
  userId: string;
  username: string;
  token: string;
}

function read(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    if (p && p.userId && p.username) return p;
  } catch {
    /* ignore */
  }
  return null;
}

class Session {
  userId = $state<string | null>(null);
  username = $state<string | null>(null);
  token = $state<string | null>(null);

  get signedIn() {
    return this.userId !== null;
  }

  load() {
    const p = read();
    if (p) {
      this.userId = p.userId;
      this.username = p.username;
      this.token = p.token;
    }
  }

  set(p: Persisted) {
    this.userId = p.userId;
    this.username = p.username;
    this.token = p.token;
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  }

  clear() {
    this.userId = null;
    this.username = null;
    this.token = null;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

export const session = new Session();
