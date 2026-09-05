<script lang="ts">
  import { dndzone } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import type { Note, Tab } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import NoteRow from './NoteRow.svelte';

  let { tab }: { tab: Tab } = $props();

  const flipMs = 150;
  const notes = $derived(notab.notesForTab(tab.id));
  const manual = $derived(tab.sortMode === 'manual');

  let dragging = $state<Note[]>([]);
  const view = $derived(dragging.length ? dragging : notes);

  function consider(e: CustomEvent<{ items: Note[] }>) {
    dragging = e.detail.items;
  }
  async function finalize(e: CustomEvent<{ items: Note[] }>) {
    dragging = [];
    await notab.reorderNotes(e.detail.items.map((n) => n.id));
  }
</script>

{#if notes.length === 0}
  <div class="grid flex-1 place-items-center px-6 py-16 text-center">
    <div class="max-w-xs space-y-1">
      <p class="text-[13px] font-medium text-ink-soft">Ingen notater ennå</p>
    </div>
  </div>
{:else if manual}
  <div
    class="flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5"
    use:dndzone={{
      items: view,
      flipDurationMs: flipMs,
      type: 'notes',
      dropTargetStyle: {},
    }}
    onconsider={consider}
    onfinalize={finalize}
  >
    {#each view as note (note.id)}
      <div animate:flip={{ duration: flipMs }}>
        <NoteRow {note} draggable />
      </div>
    {/each}
  </div>
{:else}
  <div class="flex-1 space-y-1.5 overflow-y-auto px-3 py-2.5">
    {#each notes as note (note.id)}
      <NoteRow {note} />
    {/each}
  </div>
{/if}
