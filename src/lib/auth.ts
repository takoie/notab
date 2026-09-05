import { api } from '../../convex/_generated/api';
import { convexConfigured, mutateOnce } from './convex.svelte';
import { session } from './stores/session.svelte';
import { syncEngine } from './sync/engine.svelte';

type AuthResult = { userId: string; username: string; token: string };

export async function register(username: string, password: string): Promise<void> {
  if (!convexConfigured) throw new Error('Convex er ikke satt opp ennå.');
  const res = (await mutateOnce(api.auth.register, { username, password })) as AuthResult;
  session.set(res);
  syncEngine.start();
}

export async function login(username: string, password: string): Promise<void> {
  if (!convexConfigured) throw new Error('Convex er ikke satt opp ennå.');
  const res = (await mutateOnce(api.auth.login, { username, password })) as AuthResult;
  session.set(res);
  syncEngine.start();
}

export async function logout(): Promise<void> {
  const token = session.token;
  session.clear();
  if (convexConfigured && token) {
    try {
      await mutateOnce(api.auth.logout, { token });
    } catch {
      /* best effort */
    }
  }
}
