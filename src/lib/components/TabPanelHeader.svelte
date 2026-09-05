<script lang="ts">
  import { MoreHorizontal, Pencil, Trash2, Share2, Pin, LogOut } from '@lucide/svelte';
  import type { Tab } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { leaveTab } from '$lib/sharing';
  import { openPinnedWindow } from '$lib/tauri';
  import { focusOnMount } from '$lib/actions/focus';
  import { toasts } from '$lib/stores/toasts.svelte';
  import SortMenu from './SortMenu.svelte';

  let { tab, onShare }: { tab: Tab; onShare: () => void } = $props();

  let menuOpen = $state(false);
  let renaming = $state(false);
  let draft = $state('');

  const COLORS = ['#6c63e8', '#3ab082', '#e0546c', '#d69e2e', '#4b9fe0', null];

  async function commitRename() {
    renaming = false;
    if (draft.trim() && draft.trim() !== tab.name) await notab.renameTab(tab.id, draft.trim());
  }

  async function remove() {
    menuOpen = false;
    if (tab.joined) {
      await leaveTab(tab.id);
      toasts.success('Forlot fanen');
    } else {
      await notab.deleteTab(tab.id);
    }
  }

  async function pinTab() {
    menuOpen = false;
    await openPinnedWindow({ kind: 'tab', id: tab.id, title: tab.name });
  }
</script>

<div class="flex items-center gap-2 border-b border-border px-4 py-2.5">
  {#if renaming}
    <input
      class="flex-1 rounded-md bg-surface-sunken px-2 py-1 text-[14px] font-semibold text-ink outline-none ring-1 ring-accent/30"
      bind:value={draft}
      onblur={commitRename}
      onkeydown={(e) => {
        if (e.key === 'Enter') commitRename();
        if (e.key === 'Escape') renaming = false;
      }}
      use:focusOnMount={true}
    />
  {:else}
    <button
      class="flex-1 truncate text-left text-[14px] font-semibold text-ink"
      ondblclick={() => {
        draft = tab.name;
        renaming = true;
      }}
    >
      {tab.name}
    </button>
  {/if}

  <SortMenu value={tab.sortMode} onChange={(m) => notab.setSortMode(tab.id, m)} />

  <button
    class="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    title="Del fane"
    onclick={onShare}
  >
    <Share2 size={15} />
  </button>

  <div class="relative">
    <button
      class="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
      onclick={() => (menuOpen = !menuOpen)}
    >
      <MoreHorizontal size={16} />
    </button>
    {#if menuOpen}
      <button class="fixed inset-0 z-10" aria-label="Lukk" onclick={() => (menuOpen = false)}
      ></button>
      <div
        class="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-border bg-surface-raised p-1 shadow-pop"
      >
        <button
          class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-surface-sunken"
          onclick={() => {
            menuOpen = false;
            draft = tab.name;
            renaming = true;
          }}
        >
          <Pencil size={14} /> Gi nytt navn
        </button>
        <button
          class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-surface-sunken"
          onclick={pinTab}
        >
          <Pin size={14} /> Fest fane som popup
        </button>
        <div class="flex items-center gap-1.5 px-2.5 py-1.5">
          {#each COLORS as c}
            <button
              class="h-4 w-4 rounded-full border border-border"
              style:background-color={c ?? 'transparent'}
              class:ring-2={tab.color === c}
              class:ring-accent={tab.color === c}
              aria-label="Farge"
              onclick={() => notab.setTabColor(tab.id, c)}
            >
              {#if c === null}<span class="text-[10px] text-ink-faint">×</span>{/if}
            </button>
          {/each}
        </div>
        <button
          class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-danger hover:bg-danger/10"
          onclick={remove}
        >
          {#if tab.joined}<LogOut size={14} /> Forlat fane{:else}<Trash2 size={14} /> Slett fane{/if}
        </button>
      </div>
    {/if}
  </div>
</div>
