import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export const importance = v.union(v.literal('low'), v.literal('med'), v.literal('high'));
export const sortMode = v.union(
  v.literal('manual'),
  v.literal('importance'),
  v.literal('due'),
  v.literal('done-last'),
);

export default defineSchema({
  users: defineTable({
    username: v.string(),
    usernameLower: v.string(),
    passwordHash: v.string(),
    passwordSalt: v.string(),
    createdAt: v.number(),
    lastActiveAt: v.optional(v.number()),
  })
    .index('by_username', ['usernameLower']),

  sessions: defineTable({
    userId: v.id('users'),
    token: v.string(),
    createdAt: v.number(),
  })
    .index('by_token', ['token'])
    .index('by_user', ['userId']),

  tabs: defineTable({
    // stable client-generated id (shared across every device)
    cid: v.string(),
    name: v.string(),
    color: v.union(v.string(), v.null()),
    sortMode,
    orderKey: v.string(),
    ownerId: v.id('users'),
    shareCode: v.union(v.string(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deleted: v.boolean(),
  })
    .index('by_cid', ['cid'])
    .index('by_owner', ['ownerId'])
    .index('by_shareCode', ['shareCode']),

  tabMembers: defineTable({
    tabCid: v.string(),
    userId: v.id('users'),
    joinedAt: v.number(),
  })
    .index('by_tab', ['tabCid'])
    .index('by_user', ['userId'])
    .index('by_tab_user', ['tabCid', 'userId']),

  notes: defineTable({
    cid: v.string(),
    tabCid: v.string(),
    // optional so an existing deployment doesn't need a migration; the client
    // always sends them and sync.ts defaults them on read.
    kind: v.optional(v.union(v.literal('small'), v.literal('large'))),
    title: v.string(),
    body: v.string(),
    images: v.optional(v.array(v.string())),
    done: v.boolean(),
    importance,
    dueDate: v.union(v.number(), v.null()),
    orderKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.union(v.id('users'), v.null()),
    deleted: v.boolean(),
  })
    .index('by_cid', ['cid'])
    .index('by_tab', ['tabCid'])
    .index('by_tab_updated', ['tabCid', 'updatedAt']),
});
