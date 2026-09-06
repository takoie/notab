<script lang="ts">
  import { Pencil, Trash2, Archive, LogOut } from '@lucide/svelte';
  import type { Tab } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { leaveTab } from '$lib/sharing';
  import { toasts } from '$lib/stores/toasts.svelte';
  import Popover from './ui/Popover.svelte';
  import MenuItem from './ui/MenuItem.svelte';

  let {
    tab,
    anchor,
    open = $bindable(false),
    onrename,
  }: {
    tab: Tab;
    anchor: HTMLElement | undefined;
    open?: boolean;
    onrename: () => void;
  } = $props();

  const COLORS: (string | null)[] = [
    '#6c63e8',
    '#3ab082',
    '#e0546c',
    '#d69e2e',
    '#4b9fe0',
    null,
  ];

  async function remove() {
    open = false;
    if (tab.joined) {
      await leaveTab(tab.id);
      toasts.success('Forlot fanen');
    } else {
      await notab.deleteTab(tab.id);
    }
  }

  async function archive() {
    open = false;
    await notab.archiveTab(tab.id);
    toasts.success('Fane arkivert — se Innstillinger for å hente den tilbake');
  }
</script>

<Popover {anchor} bind:open placement="bottom-start" label="Fanevalg" class="w-52">
  <MenuItem
    icon={Pencil}
    onclick={() => {
      open = false;
      onrename();
    }}
  >
    Gi nytt navn
  </MenuItem>

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
          open = false;
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
