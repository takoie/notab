import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireSession } from './security';
import { genCode, normalizeCode } from './shareCode';

async function ownedCalendar(ctx: any, userId: string, calCid: string) {
  const cal = await ctx.db
    .query('calendars')
    .withIndex('by_cid', (q: any) => q.eq('cid', calCid))
    .unique();
  if (!cal) throw new Error('Synk kalenderen først (den finnes ikke på serveren ennå).');
  if (cal.ownerId !== userId) throw new Error('Bare eieren kan dele denne kalenderen.');
  return cal;
}

export const createShareCode = mutation({
  args: { token: v.string(), calCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const cal = await ownedCalendar(ctx, userId, args.calCid);
    if (cal.shareCode) return { code: cal.shareCode };

    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('calendars')
        .withIndex('by_shareCode', (q) => q.eq('shareCode', code))
        .unique();
      if (!clash) break;
      code = genCode();
    }
    await ctx.db.patch(cal._id, { shareCode: code, updatedAt: Date.now() });
    return { code };
  },
});

export const revokeShareCode = mutation({
  args: { token: v.string(), calCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const cal = await ownedCalendar(ctx, userId, args.calCid);
    await ctx.db.patch(cal._id, { shareCode: null, updatedAt: Date.now() });
    return null;
  },
});

export const joinByCode = mutation({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const code = normalizeCode(args.code);
    const cal = await ctx.db
      .query('calendars')
      .withIndex('by_shareCode', (q) => q.eq('shareCode', code))
      .unique();
    if (!cal) throw new Error('Ugyldig kode.');
    if (cal.ownerId === userId) return { calCid: cal.cid, name: cal.name };

    const existing = await ctx.db
      .query('calendarMembers')
      .withIndex('by_cal_user', (q) => q.eq('calCid', cal.cid).eq('userId', userId))
      .unique();
    if (!existing) {
      await ctx.db.insert('calendarMembers', {
        calCid: cal.cid,
        userId,
        joinedAt: Date.now(),
      });
    }
    return { calCid: cal.cid, name: cal.name };
  },
});

export const members = query({
  args: { token: v.string(), calCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const cal = await ctx.db
      .query('calendars')
      .withIndex('by_cid', (q) => q.eq('cid', args.calCid))
      .unique();
    if (!cal || cal.ownerId !== userId) return [];
    const rows = await ctx.db
      .query('calendarMembers')
      .withIndex('by_cal', (q) => q.eq('calCid', args.calCid))
      .collect();
    const out = [];
    for (const r of rows) {
      const u = await ctx.db.get(r.userId);
      out.push({ userId: r.userId, username: u?.username ?? '(ukjent)', joinedAt: r.joinedAt });
    }
    return out;
  },
});

export const removeMember = mutation({
  args: { token: v.string(), calCid: v.string(), userId: v.id('users') },
  handler: async (ctx, args) => {
    const me = await requireSession(ctx, args.token);
    const cal = await ownedCalendar(ctx, me, args.calCid);
    const row = await ctx.db
      .query('calendarMembers')
      .withIndex('by_cal_user', (q) => q.eq('calCid', cal.cid).eq('userId', args.userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});

export const leaveCalendar = mutation({
  args: { token: v.string(), calCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const row = await ctx.db
      .query('calendarMembers')
      .withIndex('by_cal_user', (q) => q.eq('calCid', args.calCid).eq('userId', userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});
