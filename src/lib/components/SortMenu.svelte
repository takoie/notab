<script lang="ts">
  import { Check, ChevronDown, ArrowUpDown } from '@lucide/svelte';
  import type { SortMode } from '$lib/types';
  import { SORT_MODES } from '$lib/types';
  import Popover from './ui/Popover.svelte';
  import MenuItem from './ui/MenuItem.svelte';

  let { value, onChange }: { value: SortMode; onChange: (m: SortMode) => void } = $props();

  const LABELS: Record<SortMode, string> = {
    manual: 'Manuell',
    importance: 'Viktighet',
    due: 'Forfallsdato',
    'done-last': 'Fullførte nederst',
  };

  let trigger = $state<HTMLButtonElement | undefined>();
  let open = $state(false);

  function pick(m: SortMode) {
    open = false;
    onChange(m);
  }
</script>

<button
  bind:this={trigger}
  class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
  onclick={() => (open = !open)}
>
  <ArrowUpDown size={14} />
  <span class="hidden sm:inline">{LABELS[value]}</span>
  <ChevronDown size={13} />
</button>

<Popover anchor={trigger} bind:open placement="bottom-end" label="Sortering" class="w-56">
  {#each SORT_MODES as m (m)}
    <MenuItem active={m === value} onclick={() => pick(m)}>
      {LABELS[m]}
      {#snippet trailing()}
        {#if m === value}<Check size={14} />{/if}
      {/snippet}
    </MenuItem>
  {/each}
</Popover>
