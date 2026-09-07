import type { CalendarEvent, Importance, Note, OutboxOp, SortMode, Tab } from '../types';
import { newId } from '../ids';
import { orderKeyAfter, orderKeyBefore, orderKeyBetween, sortNotes } from '../order';
import { firstLine } from '../richtext';
import { startOfDay } from '../date';
import * as local from '../db/local';
import { eventToWire, noteToWire, tabToWire } from '../sync/reconcile';
import { emit, emitCrossOnly, on } from '../sync/bus';
import { session } from './session.svelte';

function now() {
  return Date.now();
}

/** Plain, proxy-free copy safe for IndexedDB structured-clone. */
function plainNote(n: Note): Note {
  return { ...n, images: [...(n.images ?? [])] };
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
    archived: false,
    createdAt: t,
    updatedAt: t,
    deleted: false,
    syncedAt: 0,
  };
}

function freshNote(
  tabId: string,
  title: string,
  orderKey: string,
  kind: Note['kind'] = 'small',
): Note {
  const t = now();
  return {
    id: newId(),
    tabId,
    kind,
    title: title.trim(),
    body: '',
    images: [],
    color: null,
    done: false,
    importance: 'none',
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
  events = $state<CalendarEvent[]>([]);
  loaded = $state(false);
  activeTabId = $state<string | null>(null);
  /** Set to a tab id right after it is created; the note composer consumes it to autofocus. */
  focusComposerFor = $state<string | null>(null);
  /** userId -> username, filled from sync pulls (for author bylines in shared tabs) */
  userNames = $state<Record<string, string>>({});
  /** tabId -> epoch ms we last looked at that tab (local, persisted) */
  lastSeen = $state<Record<string, number>>({});
  /** divider-note id -> true when that section is folded (local, persisted) */
  collapsedSections = $state<Record<string, true>>({});

  #byId = new Map<string, Note>();
  #lastSeenLoaded = false;
  #collapsedLoaded = false;

  visibleTabs = $derived(
    this.tabs
      .filter((t) => !t.deleted && !t.archived)
      .sort((a, b) => (a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0)),
  );

  archivedTabs = $derived(
    this.tabs
      .filter((t) => !t.deleted && t.archived)
      .sort((a, b) => b.updatedAt - a.updatedAt),
  );

  activeTab = $derived(this.visibleTabs.find((t) => t.id === this.activeTabId) ?? null);

  async init() {
    this.lastSeen = (await local.getMeta<Record<string, number>>('tabLastSeen')) ?? {};
    this.#lastSeenLoaded = true;
    const folded = (await local.getMeta<string[]>('collapsedSections')) ?? [];
    this.collapsedSections = Object.fromEntries(folded.map((id) => [id, true as const]));
    this.#collapsedLoaded = true;
    if (session.userId && session.username) {
      this.userNames = { ...this.userNames, [session.userId]: session.username };
    }
    await this.reload();
    this.loaded = true;
    if (!this.activeTabId && this.visibleTabs.length) {
      this.activeTabId = this.visibleTabs[0].id;
    }
    on((evt) => {
      if (evt.kind === 'remote-change') {
        void this.reload().then(() => {
          if (this.activeTabId) this.markSeen(this.activeTabId);
        });
      }
    });
  }

  /* ---------------- shared-tab activity + authors ---------------- */

  mergeAuthors(map: Record<string, string> | undefined) {
    if (!map || Object.keys(map).length === 0) return;
    this.userNames = { ...this.userNames, ...map };
  }

  authorName(userId: string | null | undefined): string | null {
    if (!userId) return null;
    return this.userNames[userId] ?? null;
  }

  markSeen(tabId: string) {
    const next = { ...$state.snapshot(this.lastSeen), [tabId]: now() };
    this.lastSeen = next;
    // persist a proxy-free copy — IndexedDB cannot structured-clone a $state proxy
    if (this.#lastSeenLoaded) void local.setMeta('tabLastSeen', { ...next });
  }

  isShared(tab: Tab | undefined): boolean {
    return !!tab && (tab.shareCode != null || tab.joined);
  }

  /** true when a shared, non-active tab has changes newer than our last visit */
  hasUnread(tabId: string): boolean {
    if (tabId === this.activeTabId) return false;
    const tab = this.getTab(tabId);
    if (!this.isShared(tab)) return false;
    const seen = this.lastSeen[tabId] ?? 0;
    return this.notes.some(
      (n) =>
        n.tabId === tabId &&
        !n.deleted &&
        n.updatedAt > seen &&
        n.createdBy !== session.userId,
    );
  }

  async reload() {
    const [tabs, notes, events] = await Promise.all([
      local.getAllTabs(),
      local.getAllNotes(),
      local.getAllEvents(),
    ]);
    this.tabs = tabs;
    this.notes = notes;
    this.events = events;
    this.#byId = new Map(notes.map((n) => [n.id, n]));
    if (this.activeTabId && !this.visibleTabs.some((t) => t.id === this.activeTabId)) {
      this.activeTabId = this.visibleTabs[0]?.id ?? null;
    }
  }

  /* ---------------- calendar events ---------------- */

  visibleEvents = $derived(this.events.filter((e) => !e.deleted));

  getEvent(id: string): CalendarEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  /** events overlapping [rangeStart, rangeEnd] (both start-of-day epoch ms) */
  eventsInRange(rangeStart: number, rangeEnd: number): CalendarEvent[] {
    return this.visibleEvents
      .filter((e) => e.startDate <= rangeEnd && e.endDate >= rangeStart)
      .sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate);
  }

  async #commitEvent(ev: CalendarEvent, opType: 'upsertEvent' | 'deleteEvent' = 'upsertEvent') {
    const row: CalendarEvent = { ...ev, updatedAt: now() };
    this.events = upsert(this.events, row);
    await local.putEvent(row);
    if (row.tabId) {
      await this.#enqueue({
        type: opType,
        tabId: row.tabId,
        entityId: row.id,
        payload: eventToWire(row),
        clientUpdatedAt: row.updatedAt,
        tries: 0,
        nextAttemptAt: 0,
      });
      emitCrossOnly({ kind: 'remote-change', tabId: row.tabId });
    }
    emit({ kind: 'local-change' });
  }

  async addEvent(data: {
    title: string;
    startDate: number;
    endDate: number;
    tabId: string | null;
    color?: string | null;
  }): Promise<CalendarEvent | null> {
    const title = data.title.trim();
    if (!title) return null;
    const a = startOfDay(data.startDate);
    const b = startOfDay(data.endDate);
    const t = now();
    const ev: CalendarEvent = {
      id: newId(),
      title,
      startDate: Math.min(a, b),
      endDate: Math.max(a, b),
      tabId: data.tabId,
      color: data.color ?? null,
      createdAt: t,
      updatedAt: t,
      createdBy: session.userId,
      deleted: false,
      syncedAt: 0,
    };
    await this.#commitEvent(ev);
    return ev;
  }

  async updateEvent(
    id: string,
    patch: Partial<Pick<CalendarEvent, 'title' | 'startDate' | 'endDate' | 'tabId' | 'color'>>,
  ) {
    const ev = this.getEvent(id);
    if (!ev) return;
    const next = { ...ev, ...patch };
    if (patch.startDate != null) next.startDate = startOfDay(patch.startDate);
    if (patch.endDate != null) next.endDate = startOfDay(patch.endDate);
    if (next.endDate < next.startDate) {
      const s = next.startDate;
      next.startDate = next.endDate;
      next.endDate = s;
    }
    await this.#commitEvent(next);
  }

  async deleteEvent(id: string) {
    const ev = this.getEvent(id);
    if (!ev) return;
    await this.#commitEvent({ ...ev, deleted: true }, 'deleteEvent');
  }

  notesForTab(tabId: string): Note[] {
    const tab = this.tabs.find((t) => t.id === tabId);
    const mode: SortMode = tab?.sortMode ?? 'manual';
    return sortNotes(
      this.notes.filter((n) => n.tabId === tabId && !n.deleted && n.kind !== 'divider'),
      mode,
    );
  }

  /* ---------------- sections / dividers ---------------- */

  /** all non-deleted rows of a tab in manual (orderKey) order — notes + dividers */
  #rowsInOrder(tabId: string): Note[] {
    return this.notes
      .filter((n) => n.tabId === tabId && !n.deleted)
      .sort((a, b) => (a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0));
  }

  /**
   * The tab split into sections by its dividers. The first group has a null
   * divider (notes before any divider); it is omitted when empty. Notes inside
   * each group are sorted by the tab's active sort mode.
   */
  sectionsForTab(tabId: string): { divider: Note | null; notes: Note[] }[] {
    const mode: SortMode = this.getTab(tabId)?.sortMode ?? 'manual';
    const groups: { divider: Note | null; notes: Note[] }[] = [{ divider: null, notes: [] }];
    for (const row of this.#rowsInOrder(tabId)) {
      if (row.kind === 'divider') groups.push({ divider: row, notes: [] });
      else groups[groups.length - 1].notes.push(row);
    }
    if (groups[0].divider === null && groups[0].notes.length === 0) groups.shift();
    for (const g of groups) g.notes = sortNotes(g.notes, mode);
    return groups;
  }

  sectionNoteIds(dividerId: string): string[] {
    const tab = this.#byId.get(dividerId);
    if (!tab) return [];
    const rows = this.#rowsInOrder(tab.tabId);
    const start = rows.findIndex((r) => r.id === dividerId);
    if (start === -1) return [];
    const out: string[] = [];
    for (let i = start + 1; i < rows.length; i++) {
      if (rows[i].kind === 'divider') break;
      out.push(rows[i].id);
    }
    return out;
  }

  isSectionCollapsed(dividerId: string): boolean {
    return this.collapsedSections[dividerId] === true;
  }

  toggleSection(dividerId: string) {
    const next = { ...this.collapsedSections };
    if (next[dividerId]) delete next[dividerId];
    else next[dividerId] = true;
    this.collapsedSections = next;
    if (this.#collapsedLoaded) void local.setMeta('collapsedSections', Object.keys(next));
  }

  async addDivider(tabId: string, title: string): Promise<Note> {
    const row = freshNote(tabId, title.trim() || 'Ny seksjon', this.#nextOrderKey(tabId), 'divider');
    await this.#commitNote(row);
    return row;
  }

  /**
   * Reorder after a manual drag. `orderedIds` is the visible order the drop zone
   * showed (dividers + notes of expanded sections). Notes of a collapsed section
   * ride along right after their divider.
   */
  async reorderTabItems(tabId: string, orderedIds: string[]) {
    const rows = this.#rowsInOrder(tabId);
    const full: string[] = [];
    const seen = new Set<string>();
    for (const id of orderedIds) {
      if (seen.has(id)) continue;
      full.push(id);
      seen.add(id);
      const row = this.#byId.get(id);
      if (row?.kind === 'divider' && this.isSectionCollapsed(id)) {
        for (const nid of this.sectionNoteIds(id)) {
          if (!seen.has(nid)) {
            full.push(nid);
            seen.add(nid);
          }
        }
      }
    }
    for (const r of rows) if (!seen.has(r.id)) full.push(r.id);
    await this.reorderNotes(full);
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
    // detach from any Svelte state proxy — IndexedDB cannot structured-clone a proxy
    const row = plainNote({ ...note, updatedAt: now() });
    this.notes = upsert(this.notes, row);
    this.#byId.set(row.id, row);
    await local.putNote(row);
    await this.#enqueue({
      type: opType,
      tabId: row.tabId,
      entityId: row.id,
      payload: noteToWire(row),
      clientUpdatedAt: row.updatedAt,
      tries: 0,
      nextAttemptAt: 0,
    });
    emit({ kind: 'local-change' });
    emitCrossOnly({ kind: 'remote-change', tabId: row.tabId });
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

  async archiveTab(id: string) {
    const tab = this.getTab(id);
    if (!tab || tab.archived) return;
    await this.#commitTab({ ...tab, archived: true });
    if (this.activeTabId === id) this.activeTabId = this.visibleTabs[0]?.id ?? null;
  }

  async unarchiveTab(id: string) {
    const tab = this.getTab(id);
    if (!tab || !tab.archived) return;
    await this.#commitTab({ ...tab, archived: false });
    this.activeTabId = id;
  }

  async deleteTab(id: string) {
    const tab = this.getTab(id);
    if (!tab) return;
    await this.#commitTab({ ...tab, deleted: true }, 'deleteTab');
    // tombstone the notes locally too (no per-note ops needed; server cascades)
    const kids = this.notes.filter((n) => n.tabId === id && !n.deleted);
    for (const n of kids) {
      const dead = plainNote({ ...n, deleted: true, updatedAt: now() });
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

  #nextOrderKey(tabId: string): string {
    const lastKey = this.#rowsInOrder(tabId).at(-1)?.orderKey ?? null;
    return orderKeyAfter(lastKey);
  }

  #firstOrderKey(tabId: string): string {
    const firstKey = this.#rowsInOrder(tabId)[0]?.orderKey ?? null;
    return orderKeyBefore(firstKey);
  }

  async addNote(
    tabId: string,
    title: string,
    opts: {
      dueDate?: number | null;
      importance?: Importance;
      images?: string[];
      kind?: Note['kind'];
      body?: string;
      color?: string | null;
      /** where the note lands in manual order (default: top) */
      position?: 'top' | 'bottom';
    } = {},
  ): Promise<Note | null> {
    const body = opts.body ?? '';
    const images = opts.images ?? [];
    const trimmed = title.trim() || firstLine(body);
    // a note needs text (title or body) or at least an image
    if (!trimmed && images.length === 0) return null;
    const orderKey =
      opts.position === 'bottom' ? this.#nextOrderKey(tabId) : this.#firstOrderKey(tabId);
    const note = freshNote(tabId, trimmed || 'Bilde', orderKey, opts.kind ?? 'large');
    if (opts.dueDate !== undefined) note.dueDate = opts.dueDate;
    if (opts.importance) note.importance = opts.importance;
    if (opts.color !== undefined) note.color = opts.color;
    note.body = body;
    note.images = images;
    await this.#commitNote(note);
    return note;
  }

  /** Create a note that starts life with a formatted body. */
  async addLargeNote(
    tabId: string,
    data: {
      title: string;
      body: string;
      images?: string[];
      dueDate?: number | null;
      importance?: Importance;
    },
  ): Promise<Note | null> {
    return this.addNote(tabId, data.title, {
      kind: 'large',
      body: data.body,
      images: data.images ?? [],
      dueDate: data.dueDate ?? null,
      importance: data.importance,
    });
  }

  async updateNote(
    id: string,
    patch: Partial<
      Pick<
        Note,
        'title' | 'body' | 'importance' | 'dueDate' | 'done' | 'images' | 'kind' | 'color'
      >
    >,
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
    const next = plainNote({ ...note, pinned });
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
