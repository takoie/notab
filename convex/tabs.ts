import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireSession } from './security';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function genCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let out = '';
  for (let i = 0; i < 9; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (i === 2 || i === 5) out += '-';
  }
  return out;
}

function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/(.{3})(.{3})(.{3}).*/, '$1-$2-$3');
}

async function ownedTab(ctx: any, userId: string, tabCid: string) {
  const tab = await ctx.db
    .query('tabs')
    .withIndex('by_cid', (q: any) => q.eq('cid', tabCid))
    .unique();
  if (!tab) throw new Error('Synk fanen først (den finnes ikke på serveren ennå).');
  if (tab.ownerId !== userId) throw new Error('Bare eieren kan dele denne fanen.');
  return tab;
}

export const createShareCode = mutation({
  args: { token: v.string(), tabCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const tab = await ownedTab(ctx, userId, args.tabCid);
    if (tab.shareCode) return { code: tab.shareCode };

    let code = genCode();
    for (let i = 0; i < 5; i++) {
      const clash = await ctx.db
        .query('tabs')
        .withIndex('by_shareCode', (q) => q.eq('shareCode', code))
        .unique();
      if (!clash) break;
      code = genCode();
    }
    await ctx.db.patch(tab._id, { shareCode: code, updatedAt: Date.now() });
    return { code };
  },
});

export const revokeShareCode = mutation({
  args: { token: v.string(), tabCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const tab = await ownedTab(ctx, userId, args.tabCid);
    await ctx.db.patch(tab._id, { shareCode: null, updatedAt: Date.now() });
    return null;
  },
});

export const joinByCode = mutation({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const code = normalizeCode(args.code);
    const tab = await ctx.db
      .query('tabs')
      .withIndex('by_shareCode', (q) => q.eq('shareCode', code))
      .unique();
    if (!tab) throw new Error('Ugyldig kode.');
    if (tab.ownerId === userId) return { tabCid: tab.cid, name: tab.name };

    const existing = await ctx.db
      .query('tabMembers')
      .withIndex('by_tab_user', (q) => q.eq('tabCid', tab.cid).eq('userId', userId))
      .unique();
    if (!existing) {
      await ctx.db.insert('tabMembers', {
        tabCid: tab.cid,
        userId,
        joinedAt: Date.now(),
      });
    }
    return { tabCid: tab.cid, name: tab.name };
  },
});

export const members = query({
  args: { token: v.string(), tabCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const tab = await ctx.db
      .query('tabs')
      .withIndex('by_cid', (q) => q.eq('cid', args.tabCid))
      .unique();
    if (!tab || tab.ownerId !== userId) return [];
    const rows = await ctx.db
      .query('tabMembers')
      .withIndex('by_tab', (q) => q.eq('tabCid', args.tabCid))
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
  args: { token: v.string(), tabCid: v.string(), userId: v.id('users') },
  handler: async (ctx, args) => {
    const me = await requireSession(ctx, args.token);
    const tab = await ownedTab(ctx, me, args.tabCid);
    const row = await ctx.db
      .query('tabMembers')
      .withIndex('by_tab_user', (q) => q.eq('tabCid', tab.cid).eq('userId', args.userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});

export const leaveTab = mutation({
  args: { token: v.string(), tabCid: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireSession(ctx, args.token);
    const row = await ctx.db
      .query('tabMembers')
      .withIndex('by_tab_user', (q) => q.eq('tabCid', args.tabCid).eq('userId', userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});
