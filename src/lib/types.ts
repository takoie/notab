export type Importance = 'low' | 'med' | 'high';

export type NoteKind = 'small' | 'large';

export type SortMode = 'manual' | 'importance' | 'due' | 'done-last';

export const SORT_MODES: SortMode[] = ['manual', 'importance', 'due', 'done-last'];

/** A tab = a list. Owned locally; optionally mirrored/shared through Convex. */
export interface Tab {
  id: string;
  name: string;
  color: string | null;
  sortMode: SortMode;
  /** position of the tab in the tab bar (fractional index) */
  orderKey: string;
  /** null = local-only; set once shared or joined */
  ownerId: string | null;
  /** present on the owner's copy once a share code is active */
  shareCode: string | null;
  /** true when this device joined someone else's shared tab */
  joined: boolean;
  /** archived tabs are hidden from the tab bar but kept for restore */
  archived: boolean;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
  /** server timestamp of the last version we pulled/pushed successfully */
  syncedAt: number;
}

export interface Note {
  id: string;
  tabId: string;
  kind: NoteKind;
  title: string;
  /** main text — only meaningful for large notes */
  body: string;
  /** pasted images as downscaled data: URIs */
  images: string[];
  done: boolean;
  importance: Importance;
  /** epoch ms of the due date (start of day), or null */
  dueDate: number | null;
  /** fractional index for manual ordering */
  orderKey: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  createdBy: string | null;
  deleted: boolean;
  syncedAt: number;
}

export type OutboxOpType =
  | 'upsertTab'
  | 'deleteTab'
  | 'upsertNote'
  | 'deleteNote';

export interface OutboxOp {
  /** autoincrement key */
  seq?: number;
  type: OutboxOpType;
  tabId: string;
  entityId: string;
  /** the full local row at enqueue time (minus sync bookkeeping) */
  payload: Record<string, unknown>;
  clientUpdatedAt: number;
  tries: number;
  nextAttemptAt: number;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export type SyncState = 'offline' | 'syncing' | 'synced' | 'disabled' | 'error';
