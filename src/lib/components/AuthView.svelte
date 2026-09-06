<script lang="ts">
  import { login, register } from '$lib/auth';
  import { convexConfigured } from '$lib/convex.svelte';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { NotebookPen } from '@lucide/svelte';

  let { onDone }: { onDone: () => void } = $props();

  let mode = $state<'login' | 'register'>('login');
  let username = $state('');
  let password = $state('');
  let busy = $state(false);

  async function submit() {
    if (busy) return;
    busy = true;
    try {
      if (mode === 'register') await register(username, password);
      else await login(username, password);
      toasts.success('Logget inn');
      onDone();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Innlogging feilet');
    } finally {
      busy = false;
    }
  }
</script>

<div class="grid h-full place-items-center p-6">
  <div class="w-full max-w-sm space-y-6">
    <div class="flex flex-col items-center gap-3 text-center">
      <div class="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <NotebookPen size={24} />
      </div>
      <div>
        <h1 class="text-lg font-semibold text-ink">
          {mode === 'login' ? 'Logg inn på NotaB!' : 'Lag en NotaB!-konto'}
        </h1>
        <p class="mt-1 text-[12px] text-ink-faint">
          Brukernavn trengs for å dele faner mellom flere.
        </p>
      </div>
    </div>

    {#if !convexConfigured}
      <p
        class="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-ink-soft"
      >
        Convex er ikke satt opp ennå. Kjør <code>npx convex dev</code> for å aktivere konto og
        deling. Du kan bruke NotaB! lokalt uten å logge inn.
      </p>
    {/if}

    <div class="space-y-3">
      <label class="block space-y-1">
        <span class="text-[12px] font-medium text-ink-soft">Brukernavn</span>
        <input
          class="w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          bind:value={username}
          autocomplete="username"
        />
      </label>
      <label class="block space-y-1">
        <span class="text-[12px] font-medium text-ink-soft">Passord</span>
        <input
          class="w-full rounded-xl border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          type="password"
          bind:value={password}
          autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
          onkeydown={(e) => e.key === 'Enter' && submit()}
        />
      </label>
    </div>

    <button
      class="w-full rounded-xl bg-accent py-2.5 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
      disabled={busy || !username.trim() || !password || !convexConfigured}
      onclick={submit}
    >
      {mode === 'login' ? 'Logg inn' : 'Registrer'}
    </button>

    <div class="flex items-center justify-between text-[12px]">
      <button
        class="text-accent hover:underline"
        onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Lag ny konto' : 'Jeg har allerede en konto'}
      </button>
      <button class="text-ink-faint hover:text-ink" onclick={onDone}>Hopp over</button>
    </div>
  </div>
</div>
