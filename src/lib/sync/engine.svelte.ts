import type { SyncState, Tab, Note } from '../types';
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
    const ops = (await local.allOps())
      .filter((o) => o.nextAttemptAt <= now)
      .slice(0, 100);
    if (ops.length === 0) return;

    const wire: WireOp[] = ops.map((o) =>
      o.type === 'upsertTab' || o.type === 'deleteTab'
        ? { kind: 'tab', ...(o.payload as Omit<WireTab, 'kind'>) }
        : { kind: 'note', ...(o.payload as Omit<WireNote, 'kind'>) },
    );

    try {
      const res = (await mutateOnce(api.sync.pushOps, {
        token: this.token,
        ops: wire,
      })) as { applied: { id: string; updatedAt: number; skipped: boolean }[] };

      const appliedById = new Map(res.applied.map((a) => [a.id, a]));
      for (const op of ops) {
        const a = appliedById.get(op.entityId);
        if (!a) continue;
        if (op.type.includes('Tab')) {
          const t = await local.getTab(op.entityId);
          if (t) await local.putTab({ ...t, syncedAt: a.updatedAt });
        } else {
          const n = await local.getNote(op.entityId);
          if (n) await local.putNote({ ...n, syncedAt: a.updatedAt });
        }
        if (op.seq !== undefined) await local.deleteOp(op.seq);
      }
      emit({ kind: 'remote-change' });
    } catch (e) {
      for (const op of ops) {
        const tries = op.tries + 1;
        await local.putOp({ ...op, tries, nextAttemptAt: Date.now() + backoff(tries) });
      }
      throw e;
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

      await local.setMeta(sinceKey, res.serverNow);
    }

    if (changed) emit({ kind: 'remote-change' });
  }
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
