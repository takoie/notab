import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { convexConfigured, mutateOnce, queryOnce } from './convex.svelte';
import { session } from './stores/session.svelte';
import { syncEngine } from './sync/engine.svelte';
import { notab } from './stores/notab.svelte';
import * as local from './db/local';

function requireAuth(): string {
  if (!convexConfigured) throw new Error('Convex er ikke satt opp ennå.');
  if (!session.token) throw new Error('Du må logge inn for å dele.');
  return session.token;
}

export async function createShareCode(tabCid: string): Promise<string> {
  const token = requireAuth();
  // make sure the tab exists on the server first
  await syncEngine.flush();
  const res = (await mutateOnce(api.tabs.createShareCode, { token, tabCid })) as {
    code: string;
  };
  const t = notab.getTab(tabCid);
  if (t) {
    await local.putTab({ ...t, shareCode: res.code });
    await notab.reload();
  }
  return res.code;
}

export async function revokeShareCode(tabCid: string): Promise<void> {
  const token = requireAuth();
  await mutateOnce(api.tabs.revokeShareCode, { token, tabCid });
  const t = notab.getTab(tabCid);
  if (t) {
    await local.putTab({ ...t, shareCode: null });
    await notab.reload();
  }
}

export async function joinByCode(code: string): Promise<string> {
  const token = requireAuth();
  const res = (await mutateOnce(api.tabs.joinByCode, { token, code })) as {
    tabCid: string;
    name: string;
  };
  await local.setMeta(`pull.${res.tabCid}`, 0);
  await syncEngine.pullEverything();
  await notab.reload();
  return res.tabCid;
}

export interface Member {
  userId: string;
  username: string;
  joinedAt: number;
}

export async function listMembers(tabCid: string): Promise<Member[]> {
  const token = requireAuth();
  return (await queryOnce(api.tabs.members, { token, tabCid })) as Member[];
}

export async function removeMember(tabCid: string, userId: string): Promise<void> {
  const token = requireAuth();
  await mutateOnce(api.tabs.removeMember, {
    token,
    tabCid,
    userId: userId as Id<'users'>,
  });
}

export async function leaveTab(tabCid: string): Promise<void> {
  const token = requireAuth();
  await mutateOnce(api.tabs.leaveTab, { token, tabCid });
  await local.hardDeleteTabCascade(tabCid);
  await local.deleteMeta(`pull.${tabCid}`);
  await notab.reload();
}
