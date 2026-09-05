<script lang="ts">
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { Plus } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { cn } from '$lib/cn';

  const flipMs = 150;

  let items = $derived(
    notab.visibleTabs.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      open: notab.notesForTab(t.id).filter((n) => !n.done).length,
    })),
  );

  let dragging = $state<typeof items>([]);
  const view = $derived(dragging.length ? dragging : items);

  function handleConsider(e: CustomEvent<{ items: typeof items }>) {
    dragging = e.detail.items;
  }
  async function handleFinalize(e: CustomEvent<{ items: typeof items }>) {
    dragging = [];
    await notab.reorderTabs(e.detail.items.map((i) => i.id));
  }

  async function addTab() {
    await notab.createTab('Ny fane');
  }
</script>

<div class="flex items-center gap-1 border-b border-border bg-surface px-2 py-1.5">
  <div
    class="flex flex-1 items-center gap-1 overflow-x-auto"
    use:dndzone={{ items: view, flipDurationMs: flipMs, type: 'tabs' }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each view as tab (tab.id)}
      <button
        animate:flip={{ duration: flipMs }}
        class={cn(
          'group flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
          tab.id === notab.activeTabId
            ? 'bg-accent-soft text-accent'
            : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
        )}
        onclick={() => (notab.activeTabId = tab.id)}
      >
        {#if tab.color}
          <span class="h-2 w-2 rounded-full" style:background-color={tab.color}></span>
        {/if}
        <span class="max-w-[14ch] truncate">{tab.name}</span>
        {#if tab.open > 0}
          <span
            class={cn(
              'rounded-full px-1.5 text-[11px] tabular-nums',
              tab.id === notab.activeTabId
                ? 'bg-accent/15 text-accent'
                : 'bg-surface-sunken text-ink-faint group-hover:bg-border',
            )}>{tab.open}</span
          >
        {/if}
      </button>
    {/each}
  </div>

  <button
    class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    title="Ny fane"
    onclick={addTab}
  >
    <Plus size={16} />
  </button>
</div>
