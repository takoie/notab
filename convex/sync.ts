import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { importance, sortMode } from './schema';
import { requireSession, requireTabAccess, requireCalendarAccess } from './security';

const tabOp = v.object({
  kind: v.literal('tab'),
  id: v.string(),
  name: v.string(),
  color: v.union(v.string(), v.null()),
  sortMode,
  orderKey: v.string(),
  // optional for one upgrade cycle: outbox ops queued before the client knew
  // about `archived` won't carry it. Defaulted to false on apply.
  archived: v.optional(v.boolean()),
  deleted: v.boolean(),
  clientUpdatedAt: v.number(),
});

const noteOp = v.object({
  kind: v.literal('note'),
  id: v.string(),
  tabId: v.string(),
  noteKind: v.union(v.literal('small'), v.literal('large'), v.literal('divider')),
  title: v.string(),
  body: v.string(),
  images: v.array(v.string()),
  color: v.optional(v.union(v.string(), v.null())),
  done: v.boolean(),
  importance,
  dueDate: v.union(v.number(), v.null()),
  orderKey: v.string(),
  deleted: v.boolean(),
  clientUpdatedAt: v.number(),
});

const eventOp = v.object({
  kind: v.literal('event'),
  id: v.string(),
  tabId: v.string(),
  // set when the event belongs to a shared calendar; mutually exclusive with a
  // non-empty tabId. absent/'' → personal (owner channel).
  calId: v.optional(v.string()),
  title: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  color: v.union(v.string(), v.null()),
  deleted: v.boolean(),
  clientUpdatedAt: v.number(),
});

const calendarOp = v.object({
  kind: v.literal('calendar'),
  id: v.string(),
  name: v.string(),
  color: v.union(v.string(), v.null()),
  allowMemberEdit: v.boolean(),
  deleted: v.boolean(),
  clientUpdatedAt: v.number(),
});

/**
 * Apply a batch of client ops with whole-record last-write-wins.
 * Returns, per op id, the authoritative `updatedAt` the server settled on.
 */
export const pushOps = mutation({
  args: {
    token: v.string(),
    ops: v.array(v.union(tabOp, noteOp, eventOp, calendarOp)),
  },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const applied: { id: string; updatedAt: number; skipped: boolean }[] = [];

    for (const op of args.ops) {
      if (op.kind === 'tab') {
        const existing = await ctx.db
          .query('tabs')
          .withIndex('by_cid', (q) => q.eq('cid', op.id))
          .unique();

        if (!existing) {
          const now = Math.max(op.clientUpdatedAt, Date.now());
          await ctx.db.insert('tabs', {
            cid: op.id,
            name: op.name,
            color: op.color,
            sortMode: op.sortMode,
            orderKey: op.orderKey,
            archived: op.archived ?? false,
            ownerId: userId,
            shareCode: null,
            createdAt: now,
            updatedAt: now,
            deleted: op.deleted,
          });
          applied.push({ id: op.id, updatedAt: now, skipped: false });
          continue;
        }

        await requireTabAccess(ctx, userId, op.id);
        if (existing.updatedAt > op.clientUpdatedAt) {
          applied.push({ id: op.id, updatedAt: existing.updatedAt, skipped: true });
          continue;
        }
        const now = Math.max(op.clientUpdatedAt, Date.now());
        await ctx.db.patch(existing._id, {
          name: op.name,
          color: op.color,
          sortMode: op.sortMode,
          orderKey: op.orderKey,
          archived: op.archived ?? false,
          deleted: op.deleted,
          updatedAt: now,
        });
        applied.push({ id: op.id, updatedAt: now, skipped: false });
      } else if (op.kind === 'note') {
        await requireTabAccess(ctx, userId, op.tabId);
        const existing = await ctx.db
          .query('notes')
          .withIndex('by_cid', (q) => q.eq('cid', op.id))
          .unique();

        if (!existing) {
          const now = Math.max(op.clientUpdatedAt, Date.now());
          await ctx.db.insert('notes', {
            cid: op.id,
            tabCid: op.tabId,
            kind: op.noteKind,
            title: op.title,
            body: op.body,
            images: op.images,
            color: op.color ?? null,
            done: op.done,
            importance: op.importance,
            dueDate: op.dueDate,
            orderKey: op.orderKey,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            deleted: op.deleted,
          });
          applied.push({ id: op.id, updatedAt: now, skipped: false });
          continue;
        }

        if (existing.updatedAt > op.clientUpdatedAt) {
          applied.push({ id: op.id, updatedAt: existing.updatedAt, skipped: true });
          continue;
        }
        const now = Math.max(op.clientUpdatedAt, Date.now());
        await ctx.db.patch(existing._id, {
          kind: op.noteKind,
          title: op.title,
          body: op.body,
          images: op.images,
          color: op.color ?? null,
          done: op.done,
          importance: op.importance,
          dueDate: op.dueDate,
          orderKey: op.orderKey,
          deleted: op.deleted,
          updatedAt: now,
        });
        applied.push({ id: op.id, updatedAt: now, skipped: false });
      } else if (op.kind === 'calendar') {
        // only the owner may create or mutate the calendar record itself
        const existing = await ctx.db
          .query('calendars')
          .withIndex('by_cid', (q) => q.eq('cid', op.id))
          .unique();

        if (!existing) {
          const now = Math.max(op.clientUpdatedAt, Date.now());
          await ctx.db.insert('calendars', {
            cid: op.id,
            name: op.name,
            color: op.color,
            ownerId: userId,
            shareCode: null,
            allowMemberEdit: op.allowMemberEdit,
            createdAt: now,
            updatedAt: now,
            deleted: op.deleted,
          });
          applied.push({ id: op.id, updatedAt: now, skipped: false });
          continue;
        }

        if (existing.ownerId !== userId || existing.updatedAt > op.clientUpdatedAt) {
          applied.push({ id: op.id, updatedAt: existing.updatedAt, skipped: true });
          continue;
        }
        const now = Math.max(op.clientUpdatedAt, Date.now());
        await ctx.db.patch(existing._id, {
          name: op.name,
          color: op.color,
          allowMemberEdit: op.allowMemberEdit,
          deleted: op.deleted,
          updatedAt: now,
        });
        applied.push({ id: op.id, updatedAt: now, skipped: false });
      } else {
        // event op — one container: a fane, a shared calendar, or personal
        const inCalendar = !!op.calId;
        const personal = !op.tabId && !inCalendar;
        if (op.tabId) await requireTabAccess(ctx, userId, op.tabId);
        if (inCalendar) await requireCalendarAccess(ctx, userId, op.calId!, { write: true });

        const existing = await ctx.db
          .query('events')
          .withIndex('by_cid', (q) => q.eq('cid', op.id))
          .unique();

        if (!existing) {
          const now = Math.max(op.clientUpdatedAt, Date.now());
          await ctx.db.insert('events', {
            cid: op.id,
            tabCid: op.tabId,
            calCid: inCalendar ? op.calId : undefined,
            ownerId: personal ? userId : null,
            title: op.title,
            startDate: op.startDate,
            endDate: op.endDate,
            color: op.color,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            deleted: op.deleted,
          });
          applied.push({ id: op.id, updatedAt: now, skipped: false });
          continue;
        }

        // a personal event can only be changed by its owner
        if (personal && existing.ownerId && existing.ownerId !== userId) {
          applied.push({ id: op.id, updatedAt: existing.updatedAt, skipped: true });
          continue;
        }
        if (existing.updatedAt > op.clientUpdatedAt) {
          applied.push({ id: op.id, updatedAt: existing.updatedAt, skipped: true });
          continue;
        }
        const now = Math.max(op.clientUpdatedAt, Date.now());
        await ctx.db.patch(existing._id, {
          title: op.title,
          startDate: op.startDate,
          endDate: op.endDate,
          color: op.color,
          deleted: op.deleted,
          updatedAt: now,
        });
        applied.push({ id: op.id, updatedAt: now, skipped: false });
      }
    }

    return { applied, serverNow: Date.now() };
  },
});

/** Delta pull for a single tab: everything changed after `since`. */
export const pullTab = query({
  args: { token: v.string(), tabCid: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    await requireTabAccess(ctx, userId, args.tabCid);

    const tabDoc = await ctx.db
      .query('tabs')
      .withIndex('by_cid', (q) => q.eq('cid', args.tabCid))
      .unique();

    const notes = await ctx.db
      .query('notes')
      .withIndex('by_tab_updated', (q) =>
        q.eq('tabCid', args.tabCid).gt('updatedAt', args.since),
      )
      .collect();

    const events = await ctx.db
      .query('events')
      .withIndex('by_tab_updated', (q) =>
        q.eq('tabCid', args.tabCid).gt('updatedAt', args.since),
      )
      .collect();

    // resolve author names once for this batch so every participant can show them
    const authors: Record<string, string> = {};
    for (const uid of new Set(notes.map((n) => n.createdBy).filter(Boolean))) {
      const u = await ctx.db.get(uid as NonNullable<typeof uid>);
      if (u && 'username' in u) authors[uid as string] = u.username as string;
    }

    const tab =
      tabDoc && tabDoc.updatedAt > args.since
        ? {
            id: tabDoc.cid,
            name: tabDoc.name,
            color: tabDoc.color,
            sortMode: tabDoc.sortMode,
            orderKey: tabDoc.orderKey,
            archived: tabDoc.archived ?? false,
            ownerId: tabDoc.ownerId,
            shareCode: tabDoc.ownerId === userId ? tabDoc.shareCode : null,
            deleted: tabDoc.deleted,
            updatedAt: tabDoc.updatedAt,
          }
        : null;

    return {
      tab,
      authors,
      notes: notes.map((n) => ({
        id: n.cid,
        tabId: n.tabCid,
        noteKind: n.kind ?? 'small',
        title: n.title,
        body: n.body,
        images: n.images ?? [],
        color: n.color ?? null,
        done: n.done,
        importance: n.importance,
        dueDate: n.dueDate,
        orderKey: n.orderKey,
        createdBy: n.createdBy ?? null,
        deleted: n.deleted,
        updatedAt: n.updatedAt,
      })),
      events: events.map((e) => ({
        id: e.cid,
        tabId: e.tabCid,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        color: e.color,
        createdBy: e.createdBy ?? null,
        deleted: e.deleted,
        updatedAt: e.updatedAt,
      })),
      serverNow: Date.now(),
    };
  },
});

/** Delta pull for the caller's personal (fane-less) calendar events. */
export const pullPersonalEvents = query({
  args: { token: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const events = await ctx.db
      .query('events')
      .withIndex('by_owner_updated', (q) =>
        q.eq('ownerId', userId).gt('updatedAt', args.since),
      )
      .collect();
    return {
      events: events.map((e) => ({
        id: e.cid,
        tabId: '',
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        color: e.color,
        createdBy: e.createdBy ?? null,
        deleted: e.deleted,
        updatedAt: e.updatedAt,
      })),
      serverNow: Date.now(),
    };
  },
});

/** Every shared-calendar cid the caller owns or has joined (discovery). */
export const myCalendars = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);

    const owned = await ctx.db
      .query('calendars')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .collect();

    const memberships = await ctx.db
      .query('calendarMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const joined = [];
    for (const m of memberships) {
      const c = await ctx.db
        .query('calendars')
        .withIndex('by_cid', (q) => q.eq('cid', m.calCid))
        .unique();
      if (c) joined.push(c);
    }

    const seen = new Set<string>();
    const out: { id: string; updatedAt: number; owned: boolean }[] = [];
    for (const c of owned) {
      if (seen.has(c.cid)) continue;
      seen.add(c.cid);
      out.push({ id: c.cid, updatedAt: c.updatedAt, owned: true });
    }
    for (const c of joined) {
      if (seen.has(c.cid)) continue;
      seen.add(c.cid);
      out.push({ id: c.cid, updatedAt: c.updatedAt, owned: false });
    }
    return out;
  },
});

/** Delta pull for a single shared calendar: record + events changed after `since`. */
export const pullCalendar = query({
  args: { token: v.string(), calCid: v.string(), since: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const { isOwner } = await requireCalendarAccess(ctx, userId, args.calCid);

    const calDoc = await ctx.db
      .query('calendars')
      .withIndex('by_cid', (q) => q.eq('cid', args.calCid))
      .unique();

    const events = await ctx.db
      .query('events')
      .withIndex('by_cal_updated', (q) =>
        q.eq('calCid', args.calCid).gt('updatedAt', args.since),
      )
      .collect();

    const calendar =
      calDoc && calDoc.updatedAt > args.since
        ? {
            id: calDoc.cid,
            name: calDoc.name,
            color: calDoc.color,
            allowMemberEdit: calDoc.allowMemberEdit,
            owned: isOwner,
            shareCode: isOwner ? calDoc.shareCode : null,
            deleted: calDoc.deleted,
            updatedAt: calDoc.updatedAt,
          }
        : null;

    return {
      calendar,
      events: events.map((e) => ({
        id: e.cid,
        tabId: '',
        calId: args.calCid,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        color: e.color,
        createdBy: e.createdBy ?? null,
        deleted: e.deleted,
        updatedAt: e.updatedAt,
      })),
      serverNow: Date.now(),
    };
  },
});

/** Every tab cid the caller can see, with its current updatedAt (discovery). */
export const myTabs = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);

    const owned = await ctx.db
      .query('tabs')
      .withIndex('by_owner', (q) => q.eq('ownerId', userId))
      .collect();

    const memberships = await ctx.db
      .query('tabMembers')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    const joinedCids = memberships.map((m) => m.tabCid);
    const joined = [];
    for (const cid of joinedCids) {
      const t = await ctx.db
        .query('tabs')
        .withIndex('by_cid', (q) => q.eq('cid', cid))
        .unique();
      if (t) joined.push(t);
    }

    const seen = new Set<string>();
    const out: { id: string; updatedAt: number; joined: boolean }[] = [];
    for (const t of owned) {
      if (seen.has(t.cid)) continue;
      seen.add(t.cid);
      out.push({ id: t.cid, updatedAt: t.updatedAt, joined: false });
    }
    for (const t of joined) {
      if (seen.has(t.cid)) continue;
      seen.add(t.cid);
      out.push({ id: t.cid, updatedAt: t.updatedAt, joined: true });
    }
    return out;
  },
});
