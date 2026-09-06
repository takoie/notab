<script lang="ts">
  import { Lock } from '@lucide/svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { focusOnMount } from '$lib/actions/focus';

  let pin = $state('');
  let error = $state(false);
  let busy = $state(false);

  async function submit() {
    if (busy || pin.length < 4) return;
    busy = true;
    error = false;
    const ok = await lock.unlock(pin);
    busy = false;
    if (ok) {
      pin = '';
    } else {
      error = true;
      pin = '';
    }
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') void submit();
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
      oninput={() => (error = false)}
    />

    {#if error}
      <p class="text-[12px] font-medium text-danger">Feil PIN-kode</p>
    {/if}

    <button
      class="w-40 rounded-xl bg-accent py-2.5 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
      disabled={pin.length < 4 || busy}
      onclick={submit}
    >
      Lås opp
    </button>
  </div>
</div>
