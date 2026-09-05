import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import {
  assertPassword,
  assertUsername,
  hashPassword,
  newToken,
  normalizeUsername,
  sanitizeUser,
  verifyPassword,
} from './security';

export const register = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const username = normalizeUsername(args.username);
    assertUsername(username);
    assertPassword(args.password);
    const usernameLower = username.toLowerCase();

    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('usernameLower', usernameLower))
      .unique();
    if (existing) throw new Error('Brukernavnet er allerede tatt.');

    const { hash, salt } = await hashPassword(args.password);
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      username,
      usernameLower,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      lastActiveAt: now,
    });

    const token = newToken();
    await ctx.db.insert('sessions', { userId, token, createdAt: now });
    return { userId, username, token };
  },
});

export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const usernameLower = normalizeUsername(args.username).toLowerCase();
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('usernameLower', usernameLower))
      .unique();
    if (!user) throw new Error('Feil brukernavn eller passord.');

    const ok = await verifyPassword(args.password, user.passwordHash, user.passwordSalt);
    if (!ok) throw new Error('Feil brukernavn eller passord.');

    const token = newToken();
    const now = Date.now();
    await ctx.db.insert('sessions', { userId: user._id, token, createdAt: now });
    await ctx.db.patch(user._id, { lastActiveAt: now });
    return { userId: user._id, username: user.username, token };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (row) await ctx.db.delete(row._id);
    return null;
  },
});

export const me = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const row = await ctx.db
      .query('sessions')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (!row) return null;
    const user = await ctx.db.get(row.userId);
    return user ? sanitizeUser(user) : null;
  },
});
