import type { MutationCtx, QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

/* ---------------- password hashing (PBKDF2-SHA256, Web Crypto) ---------------- */

function bytesToHex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const ITERATIONS = 150_000;

export async function hashPassword(
  password: string,
  saltHex?: string,
): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  const { hash } = await hashPassword(password, storedSalt);
  if (hash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  return diff === 0;
}

export function newToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

/* ---------------- validation ---------------- */

export function normalizeUsername(raw: string): string {
  return raw.trim();
}

export function assertUsername(username: string): void {
  if (!/^[A-Za-z0-9_.\- ]{2,32}$/.test(username)) {
    throw new Error('Brukernavn må være 2–32 tegn (bokstaver, tall, _ . -).');
  }
}

export function assertPassword(password: string): void {
  if (password.length < 6 || password.length > 200) {
    throw new Error('Passord må være minst 6 tegn.');
  }
}

/* ---------------- auth guards ---------------- */

export async function requireSession(
  ctx: QueryCtx | MutationCtx,
  token: string | undefined | null,
): Promise<Id<'users'>> {
  if (!token) throw new Error('Ikke innlogget.');
  const row = await ctx.db
    .query('sessions')
    .withIndex('by_token', (q) => q.eq('token', token))
    .unique();
  if (!row) throw new Error('Økten er utløpt.');
  return row.userId;
}

/** Owner or member may read/write a tab's contents. */
export async function requireTabAccess(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  tabCid: string,
): Promise<{ isOwner: boolean }> {
  const tab = await ctx.db
    .query('tabs')
    .withIndex('by_cid', (q) => q.eq('cid', tabCid))
    .unique();
  if (tab) {
    if (tab.ownerId === userId) return { isOwner: true };
    const member = await ctx.db
      .query('tabMembers')
      .withIndex('by_tab_user', (q) => q.eq('tabCid', tabCid).eq('userId', userId))
      .unique();
    if (member) return { isOwner: false };
    throw new Error('Ingen tilgang til denne fanen.');
  }
  // tab doesn't exist on the server yet — the first pusher becomes owner
  return { isOwner: true };
}

export function sanitizeUser<T extends Record<string, unknown>>(u: T) {
  const { passwordHash, passwordSalt, usernameLower, ...safe } = u;
  return safe;
}
