import type { Note, Tab } from '../types';

export interface Versioned {
  id: string;
  updatedAt: number;
  deleted: boolean;
}

/**
 * Whole-record last-write-wins. Ties (equal `updatedAt`) keep the remote copy,
 * since the server clock is authoritative and a tie almost always means "this is
 * the row we just pushed and got back".
 */
export function pickWinner<T extends Versioned>(
  local: T | undefined,
  remote: T | undefined,
): T | undefined {
  if (!local) return remote;
  if (!remote) return local;
  return remote.updatedAt >= local.updatedAt ? remote : local;
}

export interface MergeResult<T> {
  /** rows to write into the local store (already the winning version) */
  toWrite: T[];
  /** ids whose local version is newer than the server — need re-push */
  localWins: string[];
}

/**
 * Merge a batch of remote rows into the local set. `local` is the full current
 * local set for the scope (e.g. one tab's notes); `remote` is what the server
 * returned. Rows absent from `remote` are left untouched (delta sync).
 */
export function mergeBatch<T extends Versioned>(
  local: T[],
  remote: T[],
): MergeResult<T> {
  const localById = new Map(local.map((r) => [r.id, r]));
  const toWrite: T[] = [];
  const localWins: string[] = [];

  for (const r of remote) {
    const l = localById.get(r.id);
    const winner = pickWinner(l, r);
    if (!winner) continue;
    if (winner === r && (!l || l.updatedAt !== r.updatedAt || l.deleted !== r.deleted)) {
      toWrite.push(r);
    } else if (winner === l && l.updatedAt > r.updatedAt) {
      localWins.push(l.id);
    }
  }

  return { toWrite, localWins };
}

export interface WireTab {
  kind: 'tab';
  id: string;
  name: string;
  color: string | null;
  sortMode: Tab['sortMode'];
  orderKey: string;
  deleted: boolean;
  clientUpdatedAt: number;
}

export interface WireNote {
  kind: 'note';
  id: string;
  tabId: string;
  noteKind: Note['kind'];
  title: string;
  body: string;
  images: string[];
  done: boolean;
  importance: Note['importance'];
  dueDate: number | null;
  orderKey: string;
  deleted: boolean;
  clientUpdatedAt: number;
}

export type WireOp = WireTab | WireNote;

/** Strip client-only bookkeeping before sending a row to the server. */
export function tabToWire(t: Tab): Omit<WireTab, 'kind'> {
  return {
    id: t.id,
    name: t.name,
    color: t.color,
    sortMode: t.sortMode,
    orderKey: t.orderKey,
    deleted: t.deleted,
    clientUpdatedAt: t.updatedAt,
  };
}

export function noteToWire(n: Note): Omit<WireNote, 'kind'> {
  return {
    id: n.id,
    tabId: n.tabId,
    noteKind: n.kind ?? 'small',
    title: n.title,
    body: n.body,
    images: n.images ?? [],
    done: n.done,
    importance: n.importance,
    dueDate: n.dueDate,
    orderKey: n.orderKey,
    deleted: n.deleted,
    clientUpdatedAt: n.updatedAt,
  };
}
