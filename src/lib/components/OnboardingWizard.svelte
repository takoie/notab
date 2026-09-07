<script lang="ts">
  import { NotebookPen, ArrowRight } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { getMeta, setMeta } from '$lib/db/local';
  import { focusOnMount } from '$lib/actions/focus';

  const SUGGESTIONS = ['Å gjøre', 'Jobb', 'Privat', 'Handleliste', 'Prosjekt'];

  let name = $state('');
  let busy = $state(false);
  let firstRun = $state(true);

  $effect(() => {
    let alive = true;
    void getMeta<boolean>('seenWelcome').then((seen) => {
      if (alive) firstRun = !seen;
    });
    return () => (alive = false);
  });

  async function start() {
    if (busy) return;
    busy = true;
    try {
      await notab.createTab(name.trim() || SUGGESTIONS[0]);
      await setMeta('seenWelcome', true);
    } finally {
      busy = false;
    }
  }
</script>

<div class="grid flex-1 place-items-center p-8">
  <div class="w-full max-w-sm space-y-5 text-center">
    <div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
      <NotebookPen size={26} />
    </div>

    <div class="space-y-1.5">
      <h1 class="text-base font-semibold text-ink">
        {firstRun ? 'Velkommen til NotaB!' : 'Lag en fane'}
      </h1>
      <p class="text-[13px] text-ink-soft">
        Faner er listene dine — én per prosjekt, tema eller livsområde. Gi den
        første et navn, så er du i gang.
      </p>
    </div>

    <form
      class="space-y-3"
      onsubmit={(e) => {
        e.preventDefault();
        void start();
      }}
    >
      <input
        class="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-center text-[14px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        placeholder="Navn på første fane"
        bind:value={name}
        use:focusOnMount={true}
      />

      <div class="flex flex-wrap justify-center gap-1.5">
        {#each SUGGESTIONS as s (s)}
          <button
            type="button"
            class="rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
            class:border-accent={name.trim() === s}
            class:text-accent={name.trim() === s}
            onclick={() => (name = s)}
          >
            {s}
          </button>
        {/each}
      </div>

      <button
        type="submit"
        class="flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink transition-[filter] hover:brightness-105 disabled:opacity-40"
        disabled={busy}
      >
        Kom i gang <ArrowRight size={15} />
      </button>
    </form>
  </div>
</div>
