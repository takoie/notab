<script lang="ts">
  import { syncEngine } from '$lib/sync/engine.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { Check, CloudOff, RefreshCw, TriangleAlert } from '@lucide/svelte';

  const label = $derived(
    {
      disabled: session.signedIn ? 'Kun lokalt' : 'Ikke innlogget',
      offline: 'Frakoblet',
      syncing: 'Synker…',
      synced: 'Lagret',
      error: 'Synkfeil',
    }[syncEngine.state],
  );
</script>

<div
  class="flex items-center gap-1.5 text-[11px] font-medium text-ink-faint"
  title={syncEngine.lastError ?? label}
>
  {#if syncEngine.state === 'syncing'}
    <RefreshCw size={12} class="animate-spin" />
  {:else if syncEngine.state === 'synced'}
    <Check size={12} class="text-success" />
  {:else if syncEngine.state === 'error'}
    <TriangleAlert size={12} class="text-danger" />
  {:else}
    <CloudOff size={12} />
  {/if}
  <span>{label}</span>
</div>
