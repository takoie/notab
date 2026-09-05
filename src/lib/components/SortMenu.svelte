<script lang="ts">
  import { ArrowUpDown, Check, ChevronDown } from '@lucide/svelte';
  import type { SortMode } from '$lib/types';
  import { SORT_MODES } from '$lib/types';
  import { cn } from '$lib/cn';

  let { value, onChange }: { value: SortMode; onChange: (m: SortMode) => void } = $props();

  const LABELS: Record<SortMode, string> = {
    manual: 'Manuell (dra og slipp)',
    importance: 'Viktighet',
    due: 'Forfallsdato',
    'done-last': 'Fullførte nederst',
  };

  let open = $state(false);

  function pick(m: SortMode) {
    open = false;
    onChange(m);
  }
</script>

<div class="relative">
  <button
    class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
    onclick={() => (open = !open)}
  >
    <ArrowUpDown size={14} />
    <span class="hidden sm:inline">{LABELS[value]}</span>
    <ChevronDown size={13} />
  </button>

  {#if open}
    <button class="fixed inset-0 z-10 cursor-default" aria-label="Lukk" onclick={() => (open = false)}
    ></button>
    <div
      class="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-border bg-surface-raised p-1 shadow-pop"
    >
      {#each SORT_MODES as m}
        <button
          class={cn(
            'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-surface-sunken',
            m === value ? 'text-accent' : 'text-ink',
          )}
          onclick={() => pick(m)}
        >
          {LABELS[m]}
          {#if m === value}<Check size={14} />{/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
