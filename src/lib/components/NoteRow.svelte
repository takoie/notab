<script lang="ts">
  import { GripVertical, Pin, PinOff, Trash2, Flag, Calendar } from '@lucide/svelte';
  import type { Note, Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { openPinnedWindow, closePinnedWindow } from '$lib/tauri';
  import { focusOnMount } from '$lib/actions/focus';
  import { dueLabel, dueTooltip, startOfToday } from '$lib/date';
  import { cn } from '$lib/cn';

  let {
    note,
    draggable = false,
  }: { note: Note; draggable?: boolean } = $props();

  let editing = $state(false);
  let draft = $state('');

  const IMP_COLOR: Record<Importance, string> = {
    high: 'text-danger',
    med: 'text-warn',
    low: 'text-ink-faint',
  };
  const IMP_NEXT: Record<Importance, Importance> = { low: 'med', med: 'high', high: 'low' };

  function startEdit() {
    draft = note.title;
    editing = true;
  }
  async function commit() {
    editing = false;
    const t = draft.trim();
    if (t && t !== note.title) await notab.updateNote(note.id, { title: t });
  }

  async function togglePin() {
    const next = !note.pinned;
    await notab.setPinned(note.id, next);
    if (next) {
      await openPinnedWindow({ kind: 'note', id: note.id, title: note.title || 'Notat' });
    } else {
      await closePinnedWindow('note', note.id);
    }
  }

  const overdue = $derived(
    note.dueDate != null && !note.done && note.dueDate < startOfToday(),
  );
</script>

<div
  class={cn(
    'group flex items-center gap-2 rounded-xl border border-transparent px-2 py-2 hover:border-border hover:bg-surface',
    note.done && 'opacity-55',
  )}
>
  {#if draggable}
    <span class="drag-handle cursor-grab text-ink-faint opacity-0 group-hover:opacity-100">
      <GripVertical size={16} />
    </span>
  {/if}

  <button
    class={cn(
      'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-colors',
      note.done
        ? 'border-accent bg-accent text-accent-ink'
        : 'border-border-strong hover:border-accent',
    )}
    aria-label={note.done ? 'Merk som ikke gjort' : 'Merk som gjort'}
    onclick={() => notab.toggleDone(note.id)}
  >
    {#if note.done}
      <svg viewBox="0 0 12 12" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    {/if}
  </button>

  <div class="min-w-0 flex-1">
    {#if editing}
      <input
        class="w-full rounded-md bg-surface-sunken px-1.5 py-0.5 text-[13px] text-ink outline-none ring-1 ring-accent/30"
        bind:value={draft}
        onblur={commit}
        onkeydown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') editing = false;
        }}
        use:focusOnMount={true}
      />
    {:else}
      <button
        class={cn('block truncate text-left text-[13px] text-ink', note.done && 'line-through')}
        ondblclick={startEdit}
      >
        {note.title}
      </button>
    {/if}
    {#if note.dueDate != null}
      <span
        class={cn(
          'mt-0.5 flex w-fit items-center gap-1 text-[11px]',
          overdue ? 'font-medium text-danger' : 'text-ink-faint',
        )}
        title={dueTooltip(note.dueDate)}
      >
        <Calendar size={11} />{dueLabel(note.dueDate)}
      </span>
    {/if}
  </div>

  <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
    <button
      class={cn('grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-sunken', IMP_COLOR[note.importance])}
      title="Viktighet"
      onclick={() => notab.setImportance(note.id, IMP_NEXT[note.importance])}
    >
      <Flag size={14} />
    </button>
    <button
      class="grid h-7 w-7 place-items-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-ink"
      title={note.pinned ? 'Løsne popup' : 'Fest som popup'}
      onclick={togglePin}
    >
      {#if note.pinned}<PinOff size={14} />{:else}<Pin size={14} />{/if}
    </button>
    <button
      class="grid h-7 w-7 place-items-center rounded-lg text-ink-faint hover:bg-surface-sunken hover:text-danger"
      title="Slett"
      onclick={() => notab.deleteNote(note.id)}
    >
      <Trash2 size={14} />
    </button>
  </div>
</div>
