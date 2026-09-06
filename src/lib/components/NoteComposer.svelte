<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import type { Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { sanitizeHtml, isEmptyHtml } from '$lib/richtext';
  import NoteEditorCard from './NoteEditorCard.svelte';

  let { tabId }: { tabId: string; tabName?: string } = $props();

  let expanded = $state(false);
  let title = $state('');
  let html = $state('');
  let due = $state<number | null>(null);
  let images = $state<string[]>([]);
  let importance = $state<Importance>('med');
  let busy = $state(false);

  const empty = $derived(
    title.trim() === '' && isEmptyHtml(html) && images.length === 0,
  );

  // expand right after a new tab is created
  $effect(() => {
    if (notab.focusComposerFor === tabId) {
      expanded = true;
      notab.focusComposerFor = null;
    }
  });

  function reset() {
    title = '';
    html = '';
    due = null;
    images = [];
    importance = 'med';
  }

  function collapse() {
    reset();
    expanded = false;
  }

  async function save() {
    if (busy || empty) return;
    busy = true;
    const body = sanitizeHtml(html);
    try {
      await notab.addNote(tabId, title, { kind: 'large', body, images, dueDate: due, importance });
      collapse();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Kunne ikke lagre notatet');
    } finally {
      busy = false;
    }
  }
</script>

<div class="px-4 py-3">
  {#if !expanded}
    <button
      class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
      onclick={() => (expanded = true)}
    >
      <Plus size={16} /> Notat
    </button>
  {:else}
    <NoteEditorCard
      bind:title
      bind:html
      bind:due
      bind:importance
      bind:images
      saveLabel="Legg til"
      {busy}
      canSave={!empty}
      onsave={save}
      oncancel={collapse}
    />
  {/if}
</div>
