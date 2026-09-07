import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Tab, Note, CalendarEvent, OutboxOp, MetaRow } from '../types';

interface NotabDB extends DBSchema {
  tabs: { key: string; value: Tab };
  notes: { key: string; value: Note; indexes: { by_tab: string } };
  events: { key: string; value: CalendarEvent; indexes: { by_tab: string } };
  outbox: { key: number; value: OutboxOp; indexes: { by_next: number } };
  meta: { key: string; value: MetaRow };
}

let dbp: Promise<IDBPDatabase<NotabDB>> | null = null;

export function db(): Promise<IDBPDatabase<NotabDB>> {
  if (!dbp) {
    dbp = openDB<NotabDB>('notab', 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('tabs', { keyPath: 'id' });
          const notes = database.createObjectStore('notes', { keyPath: 'id' });
          notes.createIndex('by_tab', 'tabId');
          const outbox = database.createObjectStore('outbox', {
            keyPath: 'seq',
            autoIncrement: true,
          });
          outbox.createIndex('by_next', 'nextAttemptAt');
          database.createObjectStore('meta', { keyPath: 'key' });
        }
        if (oldVersion < 2) {
          const events = database.createObjectStore('events', { keyPath: 'id' });
          events.createIndex('by_tab', 'tabId');
        }
      },
    });
  }
  return dbp;
}

/* ---------- tabs ---------- */

export async function getAllTabs(): Promise<Tab[]> {
  return (await db()).getAll('tabs');
}

export async function getTab(id: string): Promise<Tab | undefined> {
  return (await db()).get('tabs', id);
}

export async function putTab(tab: Tab): Promise<void> {
  await (await db()).put('tabs', tab);
}

export async function putTabs(tabs: Tab[]): Promise<void> {
  const tx = (await db()).transaction('tabs', 'readwrite');
  await Promise.all([...tabs.map((t) => tx.store.put(t)), tx.done]);
}

/* ---------- notes ---------- */

export async function getNotesForTab(tabId: string): Promise<Note[]> {
  return (await db()).getAllFromIndex('notes', 'by_tab', tabId);
}

export async function getAllNotes(): Promise<Note[]> {
  return (await db()).getAll('notes');
}

export async function getNote(id: string): Promise<Note | undefined> {
  return (await db()).get('notes', id);
}

export async function putNote(note: Note): Promise<void> {
  await (await db()).put('notes', note);
}

export async function putNotes(notes: Note[]): Promise<void> {
  if (notes.length === 0) return;
  const tx = (await db()).transaction('notes', 'readwrite');
  await Promise.all([...notes.map((n) => tx.store.put(n)), tx.done]);
}

export async function hardDeleteNote(id: string): Promise<void> {
  await (await db()).delete('notes', id);
}

export async function hardDeleteTabCascade(tabId: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(['tabs', 'notes'], 'readwrite');
  await tx.objectStore('tabs').delete(tabId);
  const idx = tx.objectStore('notes').index('by_tab');
  let cursor = await idx.openCursor(tabId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

/* ---------- calendar events ---------- */

export async function getAllEvents(): Promise<CalendarEvent[]> {
  return (await db()).getAll('events');
}

export async function getEvent(id: string): Promise<CalendarEvent | undefined> {
  return (await db()).get('events', id);
}

export async function putEvent(ev: CalendarEvent): Promise<void> {
  await (await db()).put('events', ev);
}

export async function putEvents(evs: CalendarEvent[]): Promise<void> {
  if (evs.length === 0) return;
  const tx = (await db()).transaction('events', 'readwrite');
  await Promise.all([...evs.map((e) => tx.store.put(e)), tx.done]);
}

/* ---------- outbox ---------- */

export async function enqueueOp(op: OutboxOp): Promise<void> {
  await (await db()).add('outbox', op);
}

export async function allOps(): Promise<OutboxOp[]> {
  return (await db()).getAll('outbox');
}

export async function deleteOp(seq: number): Promise<void> {
  await (await db()).delete('outbox', seq);
}

export async function putOp(op: OutboxOp): Promise<void> {
  await (await db()).put('outbox', op);
}

export async function clearOutbox(): Promise<void> {
  await (await db()).clear('outbox');
}

/* ---------- meta ---------- */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await (await db()).get('meta', key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', { key, value });
}

export async function deleteMeta(key: string): Promise<void> {
  await (await db()).delete('meta', key);
}

/** Test helper — wipe every store. */
export async function _resetForTests(): Promise<void> {
  const database = await db();
  await Promise.all([
    database.clear('tabs'),
    database.clear('notes'),
    database.clear('events'),
    database.clear('outbox'),
    database.clear('meta'),
  ]);
}
