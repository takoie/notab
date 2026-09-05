/**
 * Tiny cross-cutting event bus. Decouples the data store (producer of local
 * mutations) from the sync engine (consumer) and from other windows.
 */

type BusEvent =
  | { kind: 'local-change' } // this window mutated something → flush outbox
  | { kind: 'remote-change'; tabId?: string } // pulled new data → reload store
  | { kind: 'lock' }
  | { kind: 'unlock' };

const target = new EventTarget();

let channel: BroadcastChannel | null = null;
try {
  channel = new BroadcastChannel('notab');
} catch {
  channel = null;
}

if (channel) {
  channel.onmessage = (e: MessageEvent<BusEvent>) => {
    target.dispatchEvent(new CustomEvent('bus', { detail: e.data }));
  };
}

/** Emit locally and (optionally) to other windows. */
export function emit(evt: BusEvent, crossWindow = true): void {
  target.dispatchEvent(new CustomEvent('bus', { detail: evt }));
  if (crossWindow && channel) {
    try {
      channel.postMessage(evt);
    } catch {
      /* ignore */
    }
  }
}

/** Emit to other windows only — the current window already applied the change. */
export function emitCrossOnly(evt: BusEvent): void {
  if (channel) {
    try {
      channel.postMessage(evt);
    } catch {
      /* ignore */
    }
  }
}

export function on(handler: (evt: BusEvent) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<BusEvent>).detail);
  target.addEventListener('bus', listener);
  return () => target.removeEventListener('bus', listener);
}

export type { BusEvent };
