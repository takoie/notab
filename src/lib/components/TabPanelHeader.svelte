<script lang="ts">
  import {
    MoreHorizontal,
    Pencil,
    Trash2,
    Share2,
    Pin,
    LogOut,
    Archive,
  } from '@lucide/svelte';
  import type { Tab } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { leaveTab } from '$lib/sharing';
  import { openPinnedWindow } from '$lib/tauri';
  import { focusOnMount } from '$lib/actions/focus';
  import { toasts } from '$lib/stores/toasts.svelte';
  import SortMenu from './SortMenu.svelte';
  import Popover from './ui/Popover.svelte';
  import MenuItem from './ui/MenuItem.svelte';

  let { tab, onShare }: { tab: Tab; onShare: () => void } = $props();

  let menuTrigger = $state<HTMLButtonElement | undefined>();
  let menuOpen = $state(false);
  let renaming = $state(false);
  let draft = $state('');

  const COLORS = ['#6c63e8', '#3ab082', '#e0546c', '#d69e2e', '#4b9fe0', null];

  async function commitRename() {
    renaming = false;
    if (draft.trim() && draft.trim() !== tab.name) await notab.renameTab(tab.id, draft.trim());
  }

  function beginRename() {
    menuOpen = false;
    draft = tab.name;
    renaming = true;
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

  async function archive() {
    menuOpen = false;
    await notab.archiveTab(tab.id);
    toasts.success('Fane arkivert — se Innstillinger for å hente den tilbake');
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
      ondblclick={beginRename}
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

  <button
    bind:this={menuTrigger}
    class="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    aria-label="Flere valg"
    onclick={() => (menuOpen = !menuOpen)}
  >
    <MoreHorizontal size={16} />
  </button>

  <Popover anchor={menuTrigger} bind:open={menuOpen} placement="bottom-end" label="Fanevalg" class="w-52">
    <MenuItem icon={Pencil} onclick={beginRename}>Gi nytt navn</MenuItem>
    <MenuItem icon={Pin} onclick={pinTab}>Fest fane som popup</MenuItem>

    <div class="flex items-center gap-1.5 px-2.5 py-2">
      {#each COLORS as c (c ?? 'none')}
        <button
          class="grid h-5 w-5 place-items-center rounded-full border border-border transition-transform hover:scale-110"
          class:ring-2={tab.color === c}
          class:ring-accent={tab.color === c}
          class:ring-offset-1={tab.color === c}
          class:ring-offset-surface-raised={tab.color === c}
          style:background-color={c ?? 'transparent'}
          aria-label={c ? `Farge ${c}` : 'Ingen farge'}
          onclick={() => {
            void notab.setTabColor(tab.id, c);
            menuOpen = false;
          }}
        >
          {#if c === null}<span class="text-[11px] leading-none text-ink-faint">×</span>{/if}
        </button>
      {/each}
    </div>

    <MenuItem icon={Archive} onclick={archive}>Arkiver</MenuItem>
    <MenuItem icon={tab.joined ? LogOut : Trash2} danger onclick={remove}>
      {tab.joined ? 'Forlat fane' : 'Slett fane'}
    </MenuItem>
  </Popover>
</div>
