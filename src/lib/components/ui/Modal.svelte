<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';

  let {
    title,
    open = $bindable(false),
    onclose,
    children,
    footer,
  }: {
    title: string;
    open?: boolean;
    onclose?: () => void;
    children: Snippet;
    footer?: Snippet;
  } = $props();

  function close() {
    open = false;
    onclose?.();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window {onkeydown} />

{#if open}
  <div class="fixed inset-0 z-50 grid place-items-center p-4">
    <button
      class="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      aria-label="Lukk"
      onclick={close}
    ></button>
    <div
      class="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5 shadow-pop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-semibold text-ink">{title}</h2>
        <button
          class="grid h-8 w-8 place-items-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink"
          onclick={close}
        >
          <X size={16} />
        </button>
      </div>
      <div class="space-y-4 text-[13px] text-ink">
        {@render children()}
      </div>
      {#if footer}
        <div class="mt-5 flex justify-end gap-2">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
