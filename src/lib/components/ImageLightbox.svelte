<script lang="ts">
  import { X, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import { lightbox } from '$lib/stores/lightbox.svelte';

  function onkeydown(e: KeyboardEvent) {
    if (!lightbox.open) return;
    if (e.key === 'Escape') lightbox.close();
    if (e.key === 'ArrowRight') lightbox.next();
    if (e.key === 'ArrowLeft') lightbox.prev();
  }
</script>

<svelte:window {onkeydown} />

{#if lightbox.open}
  <div class="fixed inset-0 z-[90] flex items-center justify-center p-6">
    <button
      class="absolute inset-0 bg-black/70 backdrop-blur-sm"
      aria-label="Lukk"
      onclick={() => lightbox.close()}
    ></button>

    <img
      src={lightbox.current}
      alt="Vedlegg {lightbox.index + 1} av {lightbox.images.length}"
      class="relative z-10 max-h-full max-w-full rounded-lg shadow-pop"
    />

    <button
      class="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20"
      onclick={() => lightbox.close()}
    >
      <X size={18} />
    </button>

    {#if lightbox.images.length > 1}
      <button
        class="absolute left-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        onclick={() => lightbox.prev()}
        aria-label="Forrige"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        class="absolute right-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        onclick={() => lightbox.next()}
        aria-label="Neste"
      >
        <ChevronRight size={20} />
      </button>
      <div
        class="absolute bottom-4 z-20 rounded-full bg-black/50 px-3 py-1 text-[12px] font-medium text-white tabular-nums"
      >
        {lightbox.index + 1} / {lightbox.images.length}
      </div>
    {/if}
  </div>
{/if}
