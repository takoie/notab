<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { cn } from '$lib/cn';

  let {
    icon,
    danger = false,
    active = false,
    onclick,
    children,
    trailing,
  }: {
    icon?: Component<{ size?: number; class?: string }>;
    danger?: boolean;
    active?: boolean;
    onclick?: (e: MouseEvent) => void;
    children: Snippet;
    trailing?: Snippet;
  } = $props();

  const Icon = $derived(icon);
</script>

<button
  class={cn(
    'group/mi flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-[7px] text-left text-[13px] transition-colors',
    danger
      ? 'text-danger hover:bg-danger/10'
      : active
        ? 'bg-accent-soft text-accent'
        : 'text-ink hover:bg-surface-sunken',
  )}
  {onclick}
>
  {#if Icon}
    <Icon
      size={14}
      class={cn(
        'shrink-0',
        danger ? '' : active ? 'text-accent' : 'text-ink-faint group-hover/mi:text-ink-soft',
      )}
    />
  {/if}
  <span class="flex-1 truncate">{@render children()}</span>
  {#if trailing}{@render trailing()}{/if}
</button>
