import { ConvexClient } from 'convex/browser';
import type {
  FunctionReference,
  FunctionArgs,
  FunctionReturnType,
} from 'convex/server';

export const convexUrl: string | undefined = import.meta.env.VITE_CONVEX_URL;
export const convexConfigured = typeof convexUrl === 'string' && convexUrl.length > 0;

/**
 * Single client for the whole app. When Convex is not configured yet (no
 * deployment provisioned) this stays null and every hook degrades to an
 * inert local-only state — the app still works fully offline.
 */
export const convexClient: ConvexClient | null = convexConfigured
  ? new ConvexClient(convexUrl as string)
  : null;

type QueryRef = FunctionReference<'query'>;
type MutationRef = FunctionReference<'mutation'>;
type ActionRef = FunctionReference<'action'>;

/** Reactive query: subscribes over WebSocket, re-subscribes when args change. */
export function useQuery<Q extends QueryRef>(
  query: Q,
  args: () => FunctionArgs<Q> | undefined = () => ({}) as FunctionArgs<Q>,
) {
  let data = $state<FunctionReturnType<Q> | undefined>(undefined);
  let isLoading = $state(convexConfigured);
  let error = $state<Error | null>(null);

  $effect(() => {
    const a = args();
    if (!convexClient || a === undefined) {
      data = undefined;
      isLoading = false;
      return;
    }
    isLoading = true;
    error = null;
    const unsub = convexClient.onUpdate(
      query,
      a,
      (r) => {
        data = r;
        isLoading = false;
        error = null;
      },
      (e) => {
        error = e instanceof Error ? e : new Error(String(e));
        isLoading = false;
      },
    );
    return () => unsub();
  });

  return {
    get data() {
      return data;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
  };
}

export function useMutation<M extends MutationRef>(mutation: M) {
  let isPending = $state(false);
  let error = $state<Error | null>(null);

  async function mutate(args: FunctionArgs<M>): Promise<FunctionReturnType<M>> {
    if (!convexClient) throw new Error('Convex not configured');
    isPending = true;
    error = null;
    try {
      return await convexClient.mutation(mutation, args);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw error;
    } finally {
      isPending = false;
    }
  }

  return {
    mutate,
    get isPending() {
      return isPending;
    },
    get error() {
      return error;
    },
  };
}

export function useAction<A extends ActionRef>(action: A) {
  let isPending = $state(false);
  let error = $state<Error | null>(null);

  async function execute(args: FunctionArgs<A>): Promise<FunctionReturnType<A>> {
    if (!convexClient) throw new Error('Convex not configured');
    isPending = true;
    error = null;
    try {
      return await convexClient.action(action, args);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      throw error;
    } finally {
      isPending = false;
    }
  }

  return {
    execute,
    get isPending() {
      return isPending;
    },
    get error() {
      return error;
    },
  };
}

/** One-shot query outside a component/effect (used by the sync engine). */
export async function queryOnce<Q extends QueryRef>(
  query: Q,
  args: FunctionArgs<Q>,
): Promise<FunctionReturnType<Q>> {
  if (!convexClient) throw new Error('Convex not configured');
  return await convexClient.query(query, args);
}

export async function mutateOnce<M extends MutationRef>(
  mutation: M,
  args: FunctionArgs<M>,
): Promise<FunctionReturnType<M>> {
  if (!convexClient) throw new Error('Convex not configured');
  return await convexClient.mutation(mutation, args);
}
