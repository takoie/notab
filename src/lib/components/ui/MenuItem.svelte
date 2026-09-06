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
    icon?: Component<{ size?: number }>;
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
    'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
    danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface-sunken',
    active && !danger && 'text-accent',
  )}
  {onclick}
>
  {#if Icon}<Icon size={14} />{/if}
  <span class="flex-1 truncate">{@render children()}</span>
  {#if trailing}{@render trailing()}{/if}
</button>
