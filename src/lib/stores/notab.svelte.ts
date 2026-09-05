import type { Importance, Note, OutboxOp, SortMode, Tab } from '../types';
import { newId } from '../ids';
import { orderKeyAfter, orderKeyBetween, sortNotes } from '../order';
import * as local from '../db/local';
import { noteToWire, tabToWire } from '../sync/reconcile';
import { emit, emitCrossOnly, on } from '../sync/bus';
import { session } from './session.svelte';

function now() {
  return Date.now();
}

function freshTab(name: string, orderKey: string): Tab {
  const t = now();
  return {
    id: newId(),
    name: name.trim() || 'Ny fane',
    color: null,
    sortMode: 'manual',
    orderKey,
    ownerId: session.userId,
    shareCode: null,
    joined: false,
    createdAt: t,
    updatedAt: t,
    deleted: false,
    syncedAt: 0,
  };
}

function freshNote(tabId: string, title: string, orderKey: string): Note {
  const t = now();
  return {
    id: newId(),
    tabId,
    title: title.trim(),
    body: '',
    done: false,
    importance: 'med',
    dueDate: null,
    orderKey,
    pinned: false,
    createdAt: t,
    updatedAt: t,
    createdBy: session.userId,
    deleted: false,
    syncedAt: 0,
  };
}

class NotabStore {
  tabs = $state<Tab[]>([]);
  notes = $state<Note[]>([]);
  loaded = $state(false);
  activeTabId = $state<string | null>(null);
  /** Set to a tab id right after it is created; the note composer consumes it to autofocus. */
  focusComposerFor = $state<string | null>(null);

  #byId = new Map<string, Note>();

  visibleTabs = $derived(
    this.tabs
      .filter((t) => !t.deleted)
      .sort((a, b) => (a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0)),
  );

  activeTab = $derived(this.visibleTabs.find((t) => t.id === this.activeTabId) ?? null);

  async init() {
    await this.reload();
    this.loaded = true;
    if (!this.activeTabId && this.visibleTabs.length) {
      this.activeTabId = this.visibleTabs[0].id;
    }
    on((evt) => {
      if (evt.kind === 'remote-change') void this.reload();
    });
  }

  async reload() {
    const [tabs, notes] = await Promise.all([local.getAllTabs(), local.getAllNotes()]);
    this.tabs = tabs;
    this.notes = notes;
    this.#byId = new Map(notes.map((n) => [n.id, n]));
    if (this.activeTabId && !tabs.some((t) => t.id === this.activeTabId && !t.deleted)) {
      this.activeTabId = this.visibleTabs[0]?.id ?? null;
    }
  }

  notesForTab(tabId: string): Note[] {
    const tab = this.tabs.find((t) => t.id === tabId);
    const mode: SortMode = tab?.sortMode ?? 'manual';
    return sortNotes(
      this.notes.filter((n) => n.tabId === tabId && !n.deleted),
      mode,
    );
  }

  pinnedNotes = $derived(this.notes.filter((n) => n.pinned && !n.deleted));

  getNote(id: string): Note | undefined {
    return this.#byId.get(id);
  }

  getTab(id: string): Tab | undefined {
    return this.tabs.find((t) => t.id === id);
  }

  /* ---------------- persistence plumbing ---------------- */

  async #commitTab(tab: Tab, opType: 'upsertTab' | 'deleteTab' = 'upsertTab') {
    tab.updatedAt = now();
    this.tabs = upsert(this.tabs, tab);
    await local.putTab(tab);
    await this.#enqueue({
      type: opType,
      tabId: tab.id,
      entityId: tab.id,
      payload: tabToWire(tab),
      clientUpdatedAt: tab.updatedAt,
      tries: 0,
      nextAttemptAt: 0,
    });
    emit({ kind: 'local-change' });
    emitCrossOnly({ kind: 'remote-change', tabId: tab.id });
  }

  async #commitNote(note: Note, opType: 'upsertNote' | 'deleteNote' = 'upsertNote') {
    note.updatedAt = now();
    this.notes = upsert(this.notes, note);
    this.#byId.set(note.id, note);
    await local.putNote(note);
    await this.#enqueue({
      type: opType,
      tabId: note.tabId,
      entityId: note.id,
      payload: noteToWire(note),
      clientUpdatedAt: note.updatedAt,
      tries: 0,
      nextAttemptAt: 0,
    });
    emit({ kind: 'local-change' });
    emitCrossOnly({ kind: 'remote-change', tabId: note.tabId });
  }

  async #enqueue(op: OutboxOp) {
    // only queue ops for tabs that participate in sync (shared / owned-and-synced)
    await local.enqueueOp(op);
  }

  /* ---------------- tab commands ---------------- */

  async createTab(name: string): Promise<Tab> {
    const lastKey = this.visibleTabs.at(-1)?.orderKey ?? null;
    const tab = freshTab(name, orderKeyAfter(lastKey));
    await this.#commitTab(tab);
    this.activeTabId = tab.id;
    this.focusComposerFor = tab.id;
    return tab;
  }

  async renameTab(id: string, name: string) {
    const tab = this.getTab(id);
    if (!tab) return;
    await this.#commitTab({ ...tab, name: name.trim() || tab.name });
  }

  async setSortMode(id: string, mode: SortMode) {
    const tab = this.getTab(id);
    if (!tab || tab.sortMode === mode) return;
    await this.#commitTab({ ...tab, sortMode: mode });
  }

  async setTabColor(id: string, color: string | null) {
    const tab = this.getTab(id);
    if (!tab) return;
    await this.#commitTab({ ...tab, color });
  }

  async deleteTab(id: string) {
    const tab = this.getTab(id);
    if (!tab) return;
    await this.#commitTab({ ...tab, deleted: true }, 'deleteTab');
    // tombstone the notes locally too (no per-note ops needed; server cascades)
    const kids = this.notes.filter((n) => n.tabId === id && !n.deleted);
    for (const n of kids) {
      const dead = { ...n, deleted: true, updatedAt: now() };
      this.notes = upsert(this.notes, dead);
      this.#byId.set(dead.id, dead);
      await local.putNote(dead);
    }
    if (this.activeTabId === id) this.activeTabId = this.visibleTabs[0]?.id ?? null;
  }

  async reorderTabs(orderedIds: string[]) {
    const keys = spreadKeys(orderedIds.length);
    for (let i = 0; i < orderedIds.length; i++) {
      const tab = this.getTab(orderedIds[i]);
      if (tab && tab.orderKey !== keys[i]) {
        await this.#commitTab({ ...tab, orderKey: keys[i] });
      }
    }
  }

  /* ---------------- note commands ---------------- */

  async addNote(
    tabId: string,
    title: string,
    opts: { dueDate?: number | null; importance?: Importance } = {},
  ): Promise<Note | null> {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const siblings = this.notesForTab(tabId);
    const lastKey =
      [...siblings].sort((a, b) => (a.orderKey < b.orderKey ? -1 : 1)).at(-1)?.orderKey ??
      null;
    const note = freshNote(tabId, trimmed, orderKeyAfter(lastKey));
    if (opts.dueDate !== undefined) note.dueDate = opts.dueDate;
    if (opts.importance) note.importance = opts.importance;
    await this.#commitNote(note);
    return note;
  }

  async updateNote(
    id: string,
    patch: Partial<Pick<Note, 'title' | 'body' | 'importance' | 'dueDate' | 'done'>>,
  ) {
    const note = this.#byId.get(id);
    if (!note) return;
    await this.#commitNote({ ...note, ...patch });
  }

  async toggleDone(id: string) {
    const note = this.#byId.get(id);
    if (!note) return;
    await this.#commitNote({ ...note, done: !note.done });
  }

  async setImportance(id: string, importance: Importance) {
    await this.updateNote(id, { importance });
  }

  async deleteNote(id: string) {
    const note = this.#byId.get(id);
    if (!note) return;
    await this.#commitNote({ ...note, deleted: true, pinned: false }, 'deleteNote');
  }

  async setPinned(id: string, pinned: boolean) {
    const note = this.#byId.get(id);
    if (!note) return;
    // pin state is local-only UI; still persist + bump so popups react
    const next = { ...note, pinned };
    this.notes = upsert(this.notes, next);
    this.#byId.set(id, next);
    await local.putNote(next);
    emitCrossOnly({ kind: 'remote-change', tabId: note.tabId });
  }

  /** Reorder within a tab in manual mode. `orderedIds` = full new order. */
  async reorderNotes(orderedIds: string[]) {
    const keys = spreadKeys(orderedIds.length);
    for (let i = 0; i < orderedIds.length; i++) {
      const note = this.#byId.get(orderedIds[i]);
      if (note && note.orderKey !== keys[i]) {
        await this.#commitNote({ ...note, orderKey: keys[i] });
      }
    }
  }

  /** Move a single note between two neighbours (used by drag-drop). */
  async moveNoteBetween(id: string, beforeKey: string | null, afterKey: string | null) {
    const note = this.#byId.get(id);
    if (!note) return;
    await this.#commitNote({ ...note, orderKey: orderKeyBetween(beforeKey, afterKey) });
  }
}

function upsert<T extends { id: string }>(list: T[], row: T): T[] {
  const i = list.findIndex((x) => x.id === row.id);
  if (i === -1) return [...list, row];
  const copy = [...list];
  copy[i] = row;
  return copy;
}

/** Evenly spaced fractional keys for a full reorder of n items. */
function spreadKeys(n: number): string[] {
  const keys: string[] = [];
  let prev: string | null = null;
  for (let i = 0; i < n; i++) {
    prev = orderKeyBetween(prev, null);
    keys.push(prev);
  }
  return keys;
}

export const notab = new NotabStore();
