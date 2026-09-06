<script lang="ts">
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import type { Note, Tab } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import NoteRow from './NoteRow.svelte';
  import DividerRow from './DividerRow.svelte';

  let { tab }: { tab: Tab } = $props();

  const flipMs = 150;
  const sections = $derived(notab.sectionsForTab(tab.id));
  const manual = $derived(tab.sortMode === 'manual');
  const showAuthors = $derived(notab.isShared(tab));

  // flat, manual-order list for the drag zone: dividers + notes of open sections
  const flatItems = $derived.by(() => {
    const out: Note[] = [];
    for (const s of sections) {
      if (s.divider) out.push(s.divider);
      if (!s.divider || !notab.isSectionCollapsed(s.divider.id)) out.push(...s.notes);
    }
    return out;
  });

  let dragging = $state<Note[]>([]);
  const view = $derived(dragging.length ? dragging : flatItems);

  function consider(e: CustomEvent<{ items: Note[] }>) {
    dragging = e.detail.items;
  }
  async function finalize(e: CustomEvent<{ items: Note[] }>) {
    dragging = [];
    await notab.reorderTabItems(
      tab.id,
      e.detail.items.map((n) => n.id),
    );
  }
</script>

{#if sections.length === 0}
  <div class="grid flex-1 place-items-center px-6 py-16 text-center">
    <p class="text-[13px] font-medium text-ink-soft">Ingen notater ennå</p>
  </div>
{:else if manual}
  <div
    class="flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5"
    use:dndzone={{ items: view, flipDurationMs: flipMs, type: 'notes', dropTargetStyle: {} }}
    onconsider={consider}
    onfinalize={finalize}
  >
    {#each view as item (item.id)}
      <div animate:flip={{ duration: flipMs }}>
        {#if item.kind === 'divider'}
          <DividerRow divider={item} count={notab.sectionNoteIds(item.id).length} draggable />
        {:else}
          <NoteRow note={item} draggable {showAuthors} />
        {/if}
      </div>
    {/each}
  </div>
{:else}
  <div class="flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5">
    {#each sections as s (s.divider?.id ?? '__lead__')}
      {#if s.divider}
        <DividerRow divider={s.divider} count={s.notes.length} />
      {/if}
      {#if !s.divider || !notab.isSectionCollapsed(s.divider.id)}
        {#each s.notes as note (note.id)}
          <NoteRow {note} {showAuthors} />
        {/each}
      {/if}
    {/each}
  </div>
{/if}
