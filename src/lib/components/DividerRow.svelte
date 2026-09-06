<script lang="ts">
  import { ChevronRight, GripVertical, Trash2 } from '@lucide/svelte';
  import type { Note } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { focusOnMount } from '$lib/actions/focus';
  import { cn } from '$lib/cn';

  let {
    divider,
    count,
    draggable = false,
  }: { divider: Note; count: number; draggable?: boolean } = $props();

  const collapsed = $derived(notab.isSectionCollapsed(divider.id));

  let renaming = $state(false);
  let draft = $state('');

  function startRename() {
    draft = divider.title;
    renaming = true;
  }
  async function commit() {
    renaming = false;
    const t = draft.trim();
    if (t && t !== divider.title) await notab.updateNote(divider.id, { title: t });
  }
</script>

<div class="group/div flex items-center gap-1.5 pl-1 pr-1 pt-2">
  {#if draggable}
    <span
      class="drag-handle -ml-1 cursor-grab text-ink-faint opacity-0 transition-opacity group-hover/div:opacity-100"
    >
      <GripVertical size={15} />
    </span>
  {/if}

  <button
    class="grid h-5 w-5 shrink-0 place-items-center rounded text-ink-faint transition-transform hover:text-ink"
    class:rotate-90={!collapsed}
    aria-label={collapsed ? 'Vis seksjon' : 'Skjul seksjon'}
    aria-expanded={!collapsed}
    onclick={() => notab.toggleSection(divider.id)}
  >
    <ChevronRight size={14} />
  </button>

  {#if renaming}
    <input
      class="min-w-0 flex-1 rounded-md bg-surface-sunken px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink outline-none ring-1 ring-accent/30"
      bind:value={draft}
      onblur={commit}
      onkeydown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') renaming = false;
      }}
      use:focusOnMount={true}
    />
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div
      class="flex min-w-0 flex-1 items-center gap-2 border-b border-border pb-1"
      ondblclick={startRename}
    >
      <span class="truncate text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {divider.title}
      </span>
      {#if count > 0}
        <span class="text-[11px] tabular-nums text-ink-faint/70">{count}</span>
      {/if}
      <span class="flex-1"></span>
      <button
        class={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover/div:opacity-100',
        )}
        title="Slett skiller (notatene beholdes)"
        onclick={() => notab.deleteNote(divider.id)}
      >
        <Trash2 size={13} />
      </button>
    </div>
  {/if}
</div>
