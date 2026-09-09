import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { convexConfigured, mutateOnce, queryOnce } from './convex.svelte';
import { session } from './stores/session.svelte';
import { syncEngine } from './sync/engine.svelte';
import { notab } from './stores/notab.svelte';
import * as local from './db/local';
import type { Member } from './sharing';

function requireAuth(): string {
  if (!convexConfigured) throw new Error('Convex er ikke satt opp ennå.');
  if (!session.token) throw new Error('Du må logge inn for å dele.');
  return session.token;
}

export async function createCalendarShareCode(calCid: string): Promise<string> {
  const token = requireAuth();
  // make sure the calendar exists on the server first
  await syncEngine.flush();
  const res = (await mutateOnce(api.calendars.createShareCode, { token, calCid })) as {
    code: string;
  };
  const c = notab.getCalendar(calCid);
  if (c) {
    await local.putCalendar({ ...c, shareCode: res.code });
    await notab.reload();
  }
  return res.code;
}

export async function revokeCalendarShareCode(calCid: string): Promise<void> {
  const token = requireAuth();
  await mutateOnce(api.calendars.revokeShareCode, { token, calCid });
  const c = notab.getCalendar(calCid);
  if (c) {
    await local.putCalendar({ ...c, shareCode: null });
    await notab.reload();
  }
}

export async function joinCalendarByCode(code: string): Promise<string> {
  const token = requireAuth();
  const res = (await mutateOnce(api.calendars.joinByCode, { token, code })) as {
    calCid: string;
    name: string;
  };
  await local.setMeta(`pull.cal.${res.calCid}`, 0);
  await syncEngine.pullEverything();
  await notab.reload();
  return res.calCid;
}

export async function listCalendarMembers(calCid: string): Promise<Member[]> {
  const token = requireAuth();
  return (await queryOnce(api.calendars.members, { token, calCid })) as Member[];
}

export async function removeCalendarMember(calCid: string, userId: string): Promise<void> {
  const token = requireAuth();
  await mutateOnce(api.calendars.removeMember, {
    token,
    calCid,
    userId: userId as Id<'users'>,
  });
}

export async function leaveCalendar(calCid: string): Promise<void> {
  const token = requireAuth();
  await mutateOnce(api.calendars.leaveCalendar, { token, calCid });
  await local.hardDeleteCalendarCascade(calCid);
  await local.deleteMeta(`pull.cal.${calCid}`);
  await notab.reload();
}
