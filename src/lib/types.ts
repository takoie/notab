export type Importance = 'none' | 'low' | 'med' | 'high';

export type NoteKind = 'small' | 'large' | 'divider';

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
  /** optional accent/background colour for the note card (hex), or null */
  color: string | null;
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

/**
 * A calendar event that is independent of any note. It may be linked to a tab —
 * when it is, it rides that tab's sync channel so collaborators see it too;
 * an unlinked event stays local to this device.
 */
export interface CalendarEvent {
  id: string;
  title: string;
  /** start-of-day epoch ms */
  startDate: number;
  /** start-of-day epoch ms, inclusive (== startDate for a single-day event) */
  endDate: number;
  /**
   * The event's container. Exactly one of `tabId` / `calId` is set; when both
   * are null the event is personal (syncs via the owner channel).
   */
  tabId: string | null;
  /** shared-calendar this event belongs to, or null */
  calId: string | null;
  color: string | null;
  createdAt: number;
  updatedAt: number;
  createdBy: string | null;
  deleted: boolean;
  syncedAt: number;
}

/**
 * A shared calendar: a named, colour-coded set of events shared by code, layered
 * onto the calendar view. Never appears in the tab strip; holds no notes.
 */
export interface SharedCalendar {
  id: string;
  name: string;
  color: string | null;
  /** null = local-only draft; set once synced/joined */
  ownerId: string | null;
  /** present on the owner's copy once a share code is active */
  shareCode: string | null;
  /** true → any member may edit events; false → members are read-only */
  allowMemberEdit: boolean;
  /** true when this device joined someone else's calendar (not the owner) */
  joined: boolean;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
  syncedAt: number;
}

export type OutboxOpType =
  | 'upsertTab'
  | 'deleteTab'
  | 'upsertNote'
  | 'deleteNote'
  | 'upsertEvent'
  | 'deleteEvent'
  | 'upsertCalendar'
  | 'deleteCalendar';

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
