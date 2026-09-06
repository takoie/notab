<script lang="ts">
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import { Plus, Share2, MoreHorizontal } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { focusOnMount } from '$lib/actions/focus';
  import { cn } from '$lib/cn';
  import NewTabPopover from './NewTabPopover.svelte';
  import TabContextMenu from './TabContextMenu.svelte';

  let { onShare }: { onShare: () => void } = $props();

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

  /* ---- new-tab hover box ---- */
  let plusBtn = $state<HTMLButtonElement | undefined>();
  let newTabOpen = $state(false);

  /* ---- tab menu (right-click a tab, or the ⋯ button for the active tab) ---- */
  let ctxAnchor = $state<HTMLElement | undefined>();
  let ctxTabId = $state<string | null>(null);
  let ctxOpen = $state(false);
  let moreBtn = $state<HTMLButtonElement | undefined>();
  const ctxTab = $derived(ctxTabId ? (notab.getTab(ctxTabId) ?? null) : null);

  function openContext(e: MouseEvent, id: string) {
    e.preventDefault();
    ctxAnchor = e.currentTarget as HTMLElement;
    ctxTabId = id;
    ctxOpen = true;
  }
  function openActiveMenu() {
    if (!notab.activeTabId) return;
    ctxAnchor = moreBtn;
    ctxTabId = notab.activeTabId;
    ctxOpen = !ctxOpen;
  }

  /* ---- inline rename ---- */
  let renamingId = $state<string | null>(null);
  let renameDraft = $state('');

  function startRename(id: string) {
    const t = notab.getTab(id);
    if (!t) return;
    renameDraft = t.name;
    renamingId = id;
  }
  async function commitRename() {
    const id = renamingId;
    renamingId = null;
    if (!id) return;
    const name = renameDraft.trim();
    const t = notab.getTab(id);
    if (name && t && name !== t.name) await notab.renameTab(id, name);
  }

  function tint(hex: string, pct: number) {
    return `color-mix(in srgb, ${hex} ${pct}%, transparent)`;
  }
</script>

<div class="flex items-end gap-1 border-b border-border bg-surface px-2 pt-2">
  <div
    class="flex min-w-0 flex-1 items-end gap-1 overflow-x-auto overflow-y-hidden"
    use:dndzone={{ items: view, flipDurationMs: flipMs, type: 'tabs' }}
    onconsider={handleConsider}
    onfinalize={handleFinalize}
  >
    {#each view as tab (tab.id)}
      {@const isActive = tab.id === notab.activeTabId}
      <div animate:flip={{ duration: flipMs }} class="shrink-0">
        {#if renamingId === tab.id}
          <input
            class="w-[15ch] rounded-t-[10px] border border-b-0 border-t-[3px] border-border border-t-accent bg-canvas px-3.5 py-2 text-[13px] font-semibold text-ink outline-none ring-1 ring-inset ring-accent/40"
            bind:value={renameDraft}
            onblur={commitRename}
            onkeydown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') renamingId = null;
            }}
            use:focusOnMount={true}
          />
        {:else}
          <button
            class={cn(
              'group relative -mb-px flex items-center gap-1.5 rounded-t-[10px] border border-b-0 border-t-[3px] text-[13px] transition-all',
              isActive
                ? 'z-10 border-border bg-canvas px-4 py-2 font-semibold text-ink shadow-[0_-3px_8px_-4px_rgb(15_23_42_/_0.18)]'
                : 'border-transparent px-3.5 py-1.5 font-medium text-ink-faint hover:text-ink-soft',
              !isActive && !tab.color && 'hover:bg-surface-sunken',
            )}
            style:border-top-color={isActive
              ? (tab.color ?? 'rgb(var(--c-accent))')
              : tab.color
                ? tint(tab.color, 45)
                : 'transparent'}
            style:background-color={!isActive && tab.color ? tint(tab.color, 15) : undefined}
            title="Dobbeltklikk for å gi nytt navn"
            onclick={() => (notab.activeTabId = tab.id)}
            oncontextmenu={(e) => openContext(e, tab.id)}
            ondblclick={() => startRename(tab.id)}
          >
            {#if tab.color}
              <span class="h-2 w-2 shrink-0 rounded-full" style:background-color={tab.color}
              ></span>
            {/if}
            <span class="max-w-[16ch] truncate">{tab.name}</span>
            {#if tab.open > 0}
              <span
                class={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums',
                  isActive
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-sunken text-ink-faint group-hover:bg-border',
                )}>{tab.open}</span
              >
            {/if}
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="mb-1 flex shrink-0 items-center gap-0.5">
    {#if notab.activeTabId}
      <button
        class="grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
        title="Del fane"
        aria-label="Del fane"
        onclick={onShare}
      >
        <Share2 size={15} />
      </button>
      <button
        bind:this={moreBtn}
        class="grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
        title="Flere valg"
        aria-label="Flere valg"
        onclick={openActiveMenu}
      >
        <MoreHorizontal size={16} />
      </button>
    {/if}
    <button
      bind:this={plusBtn}
      class="grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
      title="Ny fane"
      aria-label="Ny fane"
      onclick={() => (newTabOpen = !newTabOpen)}
    >
      <Plus size={16} />
    </button>
  </div>
</div>

<NewTabPopover anchor={plusBtn} bind:open={newTabOpen} />

{#if ctxTab}
  <TabContextMenu
    tab={ctxTab}
    anchor={ctxAnchor}
    bind:open={ctxOpen}
    onrename={() => ctxTabId && startRename(ctxTabId)}
  />
{/if}
