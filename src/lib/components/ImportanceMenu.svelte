<script lang="ts">
  import { Flag, Check } from '@lucide/svelte';
  import type { Importance } from '$lib/types';
  import { cn } from '$lib/cn';
  import Popover from './ui/Popover.svelte';

  let {
    value,
    onChange,
    compact = false,
  }: {
    value: Importance;
    onChange: (v: Importance) => void;
    /** icon-only trigger (used in a note row) vs labelled (composer) */
    compact?: boolean;
  } = $props();

  const OPTS: { key: Importance; label: string; cls: string }[] = [
    { key: 'none', label: 'Ingen', cls: 'text-ink-faint' },
    { key: 'low', label: 'Lav', cls: 'text-ink-faint' },
    { key: 'med', label: 'Middels', cls: 'text-warn' },
    { key: 'high', label: 'Viktig', cls: 'text-danger' },
  ];
  const current = $derived(OPTS.find((o) => o.key === value) ?? OPTS[0]);

  let trigger = $state<HTMLButtonElement | undefined>();
  let open = $state(false);

  function pick(v: Importance) {
    open = false;
    if (v !== value) onChange(v);
  }
</script>

<button
  bind:this={trigger}
  type="button"
  class={cn(
    'flex items-center gap-1 rounded-lg transition-colors',
    compact
      ? 'h-6 w-6 justify-center hover:bg-surface-sunken'
      : 'px-2 py-1 text-[12px] font-medium hover:bg-surface-sunken',
    value === 'high' && !compact && 'bg-[rgb(var(--c-danger)/0.14)]',
    current.cls,
  )}
  title={`Viktighet: ${current.label}`}
  aria-label={`Viktighet: ${current.label}`}
  aria-haspopup="menu"
  aria-expanded={open}
  onclick={() => (open = !open)}
>
  <Flag
    size={value === 'high' ? 15 : 14}
    fill={value === 'low' || value === 'none' ? 'none' : 'currentColor'}
    strokeWidth={2}
  />
  {#if !compact}{current.label}{/if}
</button>

<Popover anchor={trigger} bind:open placement="bottom-start" label="Viktighet" class="w-40">
  {#each OPTS as o (o.key)}
    <button
      type="button"
      class={cn(
        'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-surface-sunken',
        o.cls,
      )}
      onclick={() => pick(o.key)}
    >
      <Flag
        size={14}
        fill={o.key === 'low' || o.key === 'none' ? 'none' : 'currentColor'}
        strokeWidth={2}
      />
      <span class="flex-1">{o.label}</span>
      {#if o.key === value}<Check size={14} class="text-accent" />{/if}
    </button>
  {/each}
</Popover>
