<script lang="ts">
  import { Lock } from '@lucide/svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { focusOnMount } from '$lib/actions/focus';

  let pin = $state('');
  let error = $state(false);
  let busy = $state(false);
  let lastTried = '';

  // Try to unlock as the user types. While `silent`, a wrong PIN shorter than
  // the 6-digit max is just "not enough digits yet" — no error shown.
  async function tryUnlock(silent: boolean) {
    if (busy || pin.length < 4 || pin === lastTried) return;
    busy = true;
    const attempt = pin;
    lastTried = attempt;
    const ok = await lock.unlock(attempt);
    busy = false;
    if (ok) {
      pin = '';
      error = false;
      lastTried = '';
      return;
    }
    if (!silent || attempt.length >= 6) {
      error = true;
      pin = '';
      lastTried = '';
    } else if (pin !== lastTried && pin.length >= 4) {
      // digits arrived while the check was running — catch up
      void tryUnlock(true);
    }
  }

  function onInput() {
    error = false;
    void tryUnlock(true);
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') void tryUnlock(false);
  }
</script>

<div
  class="fixed inset-0 z-[80] grid place-items-center bg-canvas/80 backdrop-blur-xl transition-opacity duration-500"
>
  <div class="flex w-full max-w-xs flex-col items-center gap-5 p-6 text-center">
    <div class="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
      <Lock size={22} />
    </div>
    <div class="space-y-1">
      <h1 class="text-base font-semibold text-ink">NotaB! er låst</h1>
      <p class="text-[12px] text-ink-faint">Skriv inn PIN-koden for å låse opp</p>
    </div>

    <input
      class="w-40 rounded-xl border border-border bg-surface px-4 py-3 text-center text-lg tracking-[0.4em] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      class:!border-danger={error}
      type="password"
      inputmode="numeric"
      autocomplete="off"
      maxlength="6"
      bind:value={pin}
      {onkeydown}
      use:focusOnMount
      oninput={onInput}
    />

    {#if error}
      <p class="text-[12px] font-medium text-danger">Feil PIN-kode</p>
    {/if}

    <button
      class="w-40 rounded-xl bg-accent py-2.5 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
      disabled={pin.length < 4 || busy}
      onclick={() => tryUnlock(false)}
    >
      Lås opp
    </button>
  </div>
</div>
