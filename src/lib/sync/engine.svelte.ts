import type { SyncState, Tab, Note, CalendarEvent, SharedCalendar, OutboxOp } from '../types';
import { api } from '../../../convex/_generated/api';
import { convexConfigured, mutateOnce, queryOnce } from '../convex.svelte';
import { session } from '../stores/session.svelte';
import { notab } from '../stores/notab.svelte';
import * as local from '../db/local';
import { emit, on } from './bus';
import {
  mergeBatch,
  pickWinner,
  type Versioned,
  type WireOp,
  type WireTab,
  type WireNote,
  type WireEvent,
  type WireCalendar,
} from './reconcile';

const PULL_INTERVAL_MS = 20_000;
const FLUSH_DEBOUNCE_MS = 800;
const MAX_BACKOFF_MS = 60_000;

function backoff(tries: number): number {
  return Math.min(1000 * 2 ** Math.max(0, tries - 1), MAX_BACKOFF_MS);
}

class SyncEngine {
  state = $state<SyncState>('disabled');
  lastError = $state<string | null>(null);

  #started = false;
  #flushTimer: ReturnType<typeof setTimeout> | null = null;
  #pullTimer: ReturnType<typeof setInterval> | null = null;
  #running = false;

  get token() {
    return session.token;
  }

  start() {
    if (this.#started) {
      // called again after login — kick a cycle
      this.#tick();
      return;
    }
    this.#started = true;

    if (!convexConfigured) {
      this.state = 'disabled';
      return;
    }

    on((evt) => {
      if (evt.kind === 'local-change') this.#scheduleFlush();
    });

    window.addEventListener('online', () => this.#tick());
    window.addEventListener('offline', () => {
      this.state = 'offline';
    });

    this.#pullTimer = setInterval(() => this.#tick(), PULL_INTERVAL_MS);
    this.#tick();
  }

  stop() {
    if (this.#flushTimer) clearTimeout(this.#flushTimer);
    if (this.#pullTimer) clearInterval(this.#pullTimer);
    this.#flushTimer = this.#pullTimer = null;
    this.#started = false;
  }

  #scheduleFlush() {
    if (this.#flushTimer) clearTimeout(this.#flushTimer);
    this.#flushTimer = setTimeout(() => void this.flush(), FLUSH_DEBOUNCE_MS);
  }

  async #tick() {
    if (this.#running) return;
    if (!convexConfigured || !session.signedIn) {
      this.state = 'disabled';
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.state = 'offline';
      return;
    }
    this.#running = true;
    this.state = 'syncing';
    try {
      await this.pullEverything();
      await this.flush();
      const remaining = await local.allOps();
      this.state = remaining.length ? 'offline' : 'synced';
      this.lastError = null;
    } catch (e) {
      this.state = navigator?.onLine === false ? 'offline' : 'error';
      this.lastError = e instanceof Error ? e.message : String(e);
    } finally {
      this.#running = false;
    }
  }

  async flush(): Promise<void> {
    if (!convexConfigured || !session.signedIn || !this.token) return;
    const now = Date.now();
    const due = (await local.allOps()).filter((o) => o.nextAttemptAt <= now);
    if (due.length === 0) return;

    // Fresh ops go up as one batch. Ops that have failed repeatedly get sent
    // one at a time so a single rejected op (e.g. a stale server that doesn't
    // know a newer op kind) can't keep blocking every healthy op behind it.
    const fresh = due.filter((o) => o.tries < 3).slice(0, 100);
    const stuck = due.filter((o) => o.tries >= 3).slice(0, 20);
    const batches: OutboxOp[][] = [];
    if (fresh.length) batches.push(fresh);
    for (const s of stuck) batches.push([s]);

    let anyOk = false;
    let lastErr: unknown = null;
    for (const batch of batches) {
      try {
        await this.#pushBatch(batch);
        anyOk = true;
      } catch (e) {
        lastErr = e;
        for (const op of batch) {
          const tries = op.tries + 1;
          await local.putOp({ ...op, tries, nextAttemptAt: Date.now() + backoff(tries) });
        }
      }
    }
    if (anyOk) emit({ kind: 'remote-change' });
    if (!anyOk && lastErr) throw lastErr;
  }

  async #pushBatch(ops: OutboxOp[]): Promise<void> {
    const token = this.token;
    if (!token) return;
    const wire: WireOp[] = ops.map((o) => {
      if (o.type === 'upsertTab' || o.type === 'deleteTab') {
        return { kind: 'tab', ...(o.payload as Omit<WireTab, 'kind'>) };
      }
      if (o.type === 'upsertEvent' || o.type === 'deleteEvent') {
        return { kind: 'event', ...(o.payload as Omit<WireEvent, 'kind'>) };
      }
      if (o.type === 'upsertCalendar' || o.type === 'deleteCalendar') {
        return { kind: 'calendar', ...(o.payload as Omit<WireCalendar, 'kind'>) };
      }
      return { kind: 'note', ...(o.payload as Omit<WireNote, 'kind'>) };
    });

    const res = (await mutateOnce(api.sync.pushOps, {
      token,
      ops: wire,
    })) as { applied: { id: string; updatedAt: number; skipped: boolean }[] };

    const appliedById = new Map(res.applied.map((a) => [a.id, a]));
    for (const op of ops) {
      const a = appliedById.get(op.entityId);
      if (!a) continue;
      if (op.type.includes('Tab')) {
        const t = await local.getTab(op.entityId);
        if (t) await local.putTab({ ...t, syncedAt: a.updatedAt });
      } else if (op.type.includes('Event')) {
        const ev = await local.getEvent(op.entityId);
        if (ev) await local.putEvent({ ...ev, syncedAt: a.updatedAt });
      } else if (op.type.includes('Calendar')) {
        const c = await local.getCalendar(op.entityId);
        if (c) await local.putCalendar({ ...c, syncedAt: a.updatedAt });
      } else {
        const n = await local.getNote(op.entityId);
        if (n) await local.putNote({ ...n, syncedAt: a.updatedAt });
      }
      if (op.seq !== undefined) await local.deleteOp(op.seq);
    }
  }

  async pullEverything(): Promise<void> {
    if (!convexConfigured || !session.signedIn || !this.token) return;

    const list = (await queryOnce(api.sync.myTabs, { token: this.token })) as {
      id: string;
      updatedAt: number;
      joined: boolean;
    }[];

    let changed = false;
    for (const entry of list) {
      const sinceKey = `pull.${entry.id}`;
      const since = (await local.getMeta<number>(sinceKey)) ?? 0;

      const res = (await queryOnce(api.sync.pullTab, {
        token: this.token,
        tabCid: entry.id,
        since,
      })) as {
        tab: (Versioned & Record<string, unknown>) | null;
        notes: (Versioned & Record<string, unknown>)[];
        events?: (Versioned & Record<string, unknown>)[];
        authors?: Record<string, string>;
        serverNow: number;
      };

      notab.mergeAuthors(res.authors);

      if (res.tab) {
        const localTab = await local.getTab(entry.id);
        const remoteTab = remoteToTab(res.tab, entry.joined, localTab);
        const winner = pickWinner<Versioned>(
          localTab as unknown as Versioned | undefined,
          remoteTab as unknown as Versioned,
        );
        if (winner === (remoteTab as unknown as Versioned)) {
          await local.putTab(remoteTab);
          changed = true;
        }
      }

      if (res.notes.length) {
        const localNotes = await local.getNotesForTab(entry.id);
        const merged = mergeBatch<Versioned>(
          localNotes as unknown as Versioned[],
          res.notes as Versioned[],
        );
        if (merged.toWrite.length) {
          const rows = merged.toWrite.map((r) =>
            remoteToNote(r as Versioned & Record<string, unknown>, localNotes),
          );
          await local.putNotes(rows);
          changed = true;
        }
      }

      if (res.events?.length) {
        const localEvents = (await local.getAllEvents()).filter((e) => e.tabId === entry.id);
        const merged = mergeBatch<Versioned>(
          localEvents as unknown as Versioned[],
          res.events as Versioned[],
        );
        if (merged.toWrite.length) {
          const rows = merged.toWrite.map((r) =>
            remoteToEvent(r as Versioned & Record<string, unknown>, entry.id, localEvents),
          );
          await local.putEvents(rows);
          changed = true;
        }
      }

      await local.setMeta(sinceKey, res.serverNow);
    }

    // personal (fane-less) calendar events — one per-user channel
    try {
      const pkey = 'pull.__personal_events__';
      const psince = (await local.getMeta<number>(pkey)) ?? 0;
      const pres = (await queryOnce(api.sync.pullPersonalEvents, {
        token: this.token,
        since: psince,
      })) as { events: (Versioned & Record<string, unknown>)[]; serverNow: number };
      if (pres.events?.length) {
        const localPersonal = (await local.getAllEvents()).filter((e) => e.tabId == null);
        const merged = mergeBatch<Versioned>(
          localPersonal as unknown as Versioned[],
          pres.events as Versioned[],
        );
        if (merged.toWrite.length) {
          const rows = merged.toWrite.map((r) =>
            remoteToEvent(r as Versioned & Record<string, unknown>, null, localPersonal),
          );
          await local.putEvents(rows);
          changed = true;
        }
      }
      await local.setMeta(pkey, pres.serverNow);
    } catch {
      /* server not deployed yet / offline — retry next cycle */
    }

    // shared calendars — one channel per owned/joined calendar
    try {
      const cals = (await queryOnce(api.sync.myCalendars, { token: this.token })) as {
        id: string;
        updatedAt: number;
        owned: boolean;
      }[];
      const liveCalIds = new Set(cals.map((c) => c.id));

      // a *joined* calendar that fell out of the list = we were removed / it was
      // deleted. Owned calendars are never auto-dropped here (a local draft may
      // simply not be pushed yet; real deletion goes through deleteCalendar).
      for (const c of await local.getAllCalendars()) {
        if (c.joined && !liveCalIds.has(c.id)) {
          await local.hardDeleteCalendarCascade(c.id);
          await local.deleteMeta(`pull.cal.${c.id}`);
          changed = true;
        }
      }

      for (const c of cals) {
        const sinceKey = `pull.cal.${c.id}`;
        const since = (await local.getMeta<number>(sinceKey)) ?? 0;
        const cres = (await queryOnce(api.sync.pullCalendar, {
          token: this.token,
          calCid: c.id,
          since,
        })) as {
          calendar: (Versioned & Record<string, unknown>) | null;
          events: (Versioned & Record<string, unknown>)[];
          serverNow: number;
        };

        if (cres.calendar) {
          const localCal = await local.getCalendar(c.id);
          const remoteCal = remoteToCalendar(cres.calendar, !c.owned, localCal);
          const winner = pickWinner<Versioned>(
            localCal as unknown as Versioned | undefined,
            remoteCal as unknown as Versioned,
          );
          if (winner === (remoteCal as unknown as Versioned)) {
            if (remoteCal.deleted) {
              await local.hardDeleteCalendarCascade(c.id);
            } else {
              await local.putCalendar(remoteCal);
            }
            changed = true;
          }
        }

        if (cres.events?.length) {
          const localCalEvents = await local.getEventsForCalendar(c.id);
          const merged = mergeBatch<Versioned>(
            localCalEvents as unknown as Versioned[],
            cres.events as Versioned[],
          );
          if (merged.toWrite.length) {
            const rows = merged.toWrite.map((r) =>
              remoteToEvent(r as Versioned & Record<string, unknown>, null, localCalEvents, c.id),
            );
            await local.putEvents(rows);
            changed = true;
          }
        }

        await local.setMeta(sinceKey, cres.serverNow);
      }

      // members can't write a read-only calendar — drop any queued ops for one
      // so they don't wedge the outbox
      const readOnly = new Set(
        (await local.getAllCalendars())
          .filter((c) => c.joined && !c.allowMemberEdit)
          .map((c) => c.id),
      );
      if (readOnly.size) {
        for (const op of await local.allOps()) {
          const calId = (op.payload as { calId?: string }).calId;
          if (calId && readOnly.has(calId) && op.seq !== undefined) {
            await local.deleteOp(op.seq);
          }
        }
      }
    } catch {
      /* server not deployed yet / offline — retry next cycle */
    }

    if (changed) emit({ kind: 'remote-change' });
  }
}

function remoteToCalendar(
  r: Versioned & Record<string, unknown>,
  joined: boolean,
  prev?: SharedCalendar,
): SharedCalendar {
  return {
    id: r.id,
    name: (r.name as string) ?? prev?.name ?? 'Kalender',
    color: (r.color as string | null) ?? prev?.color ?? null,
    ownerId: (r.ownerId as string | null) ?? prev?.ownerId ?? null,
    shareCode: (r.shareCode as string | null) ?? null,
    allowMemberEdit: (r.allowMemberEdit as boolean | undefined) ?? prev?.allowMemberEdit ?? true,
    joined,
    createdAt: prev?.createdAt ?? r.updatedAt,
    updatedAt: r.updatedAt,
    deleted: r.deleted,
    syncedAt: r.updatedAt,
  };
}

function remoteToTab(
  r: Versioned & Record<string, unknown>,
  joined: boolean,
  prev?: Tab,
): Tab {
  return {
    id: r.id,
    name: (r.name as string) ?? prev?.name ?? 'Fane',
    color: (r.color as string | null) ?? null,
    sortMode: (r.sortMode as Tab['sortMode']) ?? prev?.sortMode ?? 'manual',
    orderKey: (r.orderKey as string) ?? prev?.orderKey ?? 'a0',
    ownerId: (r.ownerId as string | null) ?? prev?.ownerId ?? null,
    shareCode: (r.shareCode as string | null) ?? null,
    joined,
    archived: (r.archived as boolean | undefined) ?? prev?.archived ?? false,
    createdAt: prev?.createdAt ?? r.updatedAt,
    updatedAt: r.updatedAt,
    deleted: r.deleted,
    syncedAt: r.updatedAt,
  };
}

function remoteToEvent(
  r: Versioned & Record<string, unknown>,
  tabId: string | null,
  siblings: CalendarEvent[],
  calId: string | null = null,
): CalendarEvent {
  const prev = siblings.find((e) => e.id === r.id);
  return {
    id: r.id,
    tabId,
    calId,
    title: (r.title as string) ?? prev?.title ?? '',
    startDate: (r.startDate as number) ?? prev?.startDate ?? r.updatedAt,
    endDate: (r.endDate as number) ?? prev?.endDate ?? r.updatedAt,
    color: (r.color as string | null) ?? prev?.color ?? null,
    createdAt: prev?.createdAt ?? r.updatedAt,
    updatedAt: r.updatedAt,
    createdBy: (r.createdBy as string | null) ?? prev?.createdBy ?? null,
    deleted: r.deleted,
    syncedAt: r.updatedAt,
  };
}

function remoteToNote(r: Versioned & Record<string, unknown>, siblings: Note[]): Note {
  const prev = siblings.find((n) => n.id === r.id);
  return {
    id: r.id,
    tabId: (r.tabId as string) ?? prev?.tabId ?? '',
    kind: (r.noteKind as Note['kind']) ?? prev?.kind ?? 'small',
    title: (r.title as string) ?? '',
    body: (r.body as string) ?? '',
    images: (r.images as string[]) ?? prev?.images ?? [],
    color: (r.color as string | null) ?? prev?.color ?? null,
    done: Boolean(r.done),
    importance: (r.importance as Note['importance']) ?? 'none',
    dueDate: (r.dueDate as number | null) ?? null,
    orderKey: (r.orderKey as string) ?? prev?.orderKey ?? 'a0',
    pinned: prev?.pinned ?? false,
    createdAt: prev?.createdAt ?? r.updatedAt,
    updatedAt: r.updatedAt,
    createdBy: (r.createdBy as string | null) ?? prev?.createdBy ?? null,
    deleted: r.deleted,
    syncedAt: r.updatedAt,
  };
}

export const syncEngine = new SyncEngine();
