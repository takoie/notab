<script lang="ts">
  import { ChevronDown, Check } from '@lucide/svelte';
  import { cn } from '$lib/cn';
  import Popover from './Popover.svelte';
  import MenuItem from './MenuItem.svelte';

  let {
    value = $bindable(),
    options,
    placeholder = 'Velg …',
    label,
    disabled = false,
    class: klass = '',
    menuClass = '',
    onChange,
  }: {
    value: string | undefined;
    options: { value: string; label: string }[];
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    class?: string;
    menuClass?: string;
    onChange?: (value: string) => void;
  } = $props();

  let trigger = $state<HTMLButtonElement | undefined>();
  let open = $state(false);

  const selected = $derived(options.find((o) => o.value === value) ?? null);

  function pick(v: string) {
    value = v;
    open = false;
    onChange?.(v);
  }
</script>

<button
  bind:this={trigger}
  type="button"
  {disabled}
  class={cn(
    'flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink transition-colors hover:border-border-strong disabled:pointer-events-none disabled:opacity-40',
    klass,
  )}
  aria-haspopup="listbox"
  aria-expanded={open}
  onclick={() => (open = !open)}
>
  <span class={cn('truncate', !selected && 'text-ink-faint')}>
    {selected ? selected.label : placeholder}
  </span>
  <ChevronDown size={14} class="shrink-0 text-ink-faint" />
</button>

<Popover
  anchor={trigger}
  bind:open
  placement="bottom-start"
  label={label ?? placeholder}
  class={cn('max-h-64 min-w-[12rem] overflow-y-auto', menuClass)}
>
  {#each options as opt (opt.value)}
    <MenuItem active={opt.value === value} onclick={() => pick(opt.value)}>
      {opt.label}
      {#snippet trailing()}
        {#if opt.value === value}<Check size={14} />{/if}
      {/snippet}
    </MenuItem>
  {/each}
</Popover>
