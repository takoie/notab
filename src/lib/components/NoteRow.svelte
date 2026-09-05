<script lang="ts">
  import {
    GripVertical,
    Pin,
    PinOff,
    Trash2,
    Flag,
    Calendar,
    ChevronRight,
    Pencil,
  } from '@lucide/svelte';
  import type { Note, Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { openPinnedWindow, closePinnedWindow } from '$lib/tauri';
  import { focusOnMount } from '$lib/actions/focus';
  import { dueLabel, dueTooltip, startOfToday } from '$lib/date';
  import { cn } from '$lib/cn';
  import ImageStrip from './ImageStrip.svelte';
  import LargeNoteDialog from './LargeNoteDialog.svelte';

  let {
    note,
    draggable = false,
    forceOpen = false,
  }: { note: Note; draggable?: boolean; forceOpen?: boolean } = $props();

  let editing = $state(false);
  let draft = $state('');
  let editDialog = $state(false);

  const isLarge = $derived(note.kind === 'large');
  const drawerOpen = $derived(isLarge && (forceOpen || notab.isDrawerOpen(note.id)));
  const imgs = $derived(note.images ?? []);

  const IMP_NEXT: Record<Importance, Importance> = { low: 'med', med: 'high', high: 'low' };
  const IMP_TITLE: Record<Importance, string> = {
    low: 'Lav prioritet — klikk for å heve',
    med: 'Middels prioritet',
    high: 'Viktig',
  };

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

  const overdue = $derived(note.dueDate != null && !note.done && note.dueDate < startOfToday());
</script>

<div
  class={cn(
    'group relative rounded-lg border transition-[background-color,border-color,box-shadow,transform] duration-150 ease-soft',
    note.done
      ? 'border-border/60 bg-surface-sunken'
      : 'border-border bg-surface hover:border-border-strong hover:bg-surface-raised hover:shadow-card',
    !note.done &&
      !drawerOpen &&
      'hover:-translate-y-px',
    !note.done &&
      note.importance === 'high' &&
      'border-danger/45 bg-[rgb(var(--c-danger)/0.09)] ring-1 ring-inset ring-danger/15 hover:border-danger/60',
    note.done && 'opacity-60',
  )}
>
  <!-- header row -->
  <div class="flex items-center gap-2.5 px-2.5 py-2">
    {#if draggable}
      <span
        class="drag-handle -ml-1 cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical size={16} />
      </span>
    {/if}

    {#if isLarge}
      <button
        class="grid h-5 w-5 shrink-0 place-items-center rounded text-ink-faint transition-transform duration-200 hover:text-ink"
        class:rotate-90={drawerOpen}
        aria-label={drawerOpen ? 'Lukk notat' : 'Åpne notat'}
        aria-expanded={drawerOpen}
        onclick={() => notab.toggleDrawer(note.id)}
      >
        <ChevronRight size={16} />
      </button>
    {/if}

    <button
      class={cn(
        'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition-colors',
        note.done
          ? 'border-accent bg-accent text-accent-ink'
          : note.importance === 'high'
            ? 'border-danger/50 hover:border-danger'
            : 'border-border-strong hover:border-accent',
      )}
      aria-label={note.done ? 'Merk som ikke gjort' : 'Merk som gjort'}
      onclick={() => notab.toggleDone(note.id)}
    >
      {#if note.done}
        <svg viewBox="0 0 12 12" class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      {/if}
    </button>

    <button
      class={cn(
        'grid h-6 w-6 shrink-0 place-items-center rounded-md transition-all duration-150',
        note.importance === 'high' &&
          'bg-[rgb(var(--c-danger)/0.14)] text-danger hover:bg-[rgb(var(--c-danger)/0.2)]',
        note.importance === 'med' && 'text-warn hover:bg-surface-sunken',
        note.importance === 'low' &&
          'text-ink-faint opacity-0 hover:bg-surface-sunken group-hover:opacity-70',
      )}
      title={IMP_TITLE[note.importance]}
      aria-label={IMP_TITLE[note.importance]}
      onclick={() => notab.setImportance(note.id, IMP_NEXT[note.importance])}
    >
      <Flag
        size={note.importance === 'high' ? 15 : 14}
        fill={note.importance === 'low' ? 'none' : 'currentColor'}
        strokeWidth={2}
      />
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
          class={cn(
            'flex max-w-full items-center gap-2 text-left text-[13px] text-ink',
            note.done && 'text-ink-soft line-through',
            !note.done && note.importance === 'high' && 'font-medium',
          )}
          ondblclick={startEdit}
          onclick={isLarge ? () => notab.toggleDrawer(note.id) : undefined}
        >
          <span class="truncate">{note.title}</span>
          {#if isLarge && !drawerOpen && (note.body || imgs.length)}
            <span class="shrink-0 text-[11px] font-normal text-ink-faint">
              {#if imgs.length}{imgs.length} bilde{imgs.length > 1 ? 'r' : ''}{/if}
              {#if note.body && imgs.length}·{/if}
              {#if note.body}notat{/if}
            </span>
          {/if}
        </button>
      {/if}

      {#if note.dueDate != null}
        <span
          class={cn(
            'mt-0.5 flex w-fit items-center gap-1 rounded px-1 text-[11px] tabular-nums',
            overdue
              ? 'bg-[rgb(var(--c-danger)/0.12)] font-medium text-danger'
              : 'text-ink-faint',
          )}
          title={dueTooltip(note.dueDate)}
        >
          <Calendar size={11} />{dueLabel(note.dueDate)}
        </span>
      {/if}

      {#if !isLarge && imgs.length}
        <div class="mt-1.5">
          <ImageStrip images={imgs} size={44} />
        </div>
      {/if}
    </div>

    <div
      class="flex items-center gap-0.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
      {#if isLarge}
        <button
          class="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-sunken hover:text-ink"
          title="Rediger"
          onclick={() => (editDialog = true)}
        >
          <Pencil size={13} />
        </button>
      {/if}
      <button
        class="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-sunken hover:text-ink"
        class:text-accent={note.pinned}
        title={note.pinned ? 'Løsne popup' : 'Fest som popup'}
        onclick={togglePin}
      >
        {#if note.pinned}<PinOff size={14} />{:else}<Pin size={14} />{/if}
      </button>
      <button
        class="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-sunken hover:text-danger"
        title="Slett"
        onclick={() => notab.deleteNote(note.id)}
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>

  <!-- large-note drawer body -->
  {#if isLarge}
    <div
      class="grid transition-[grid-template-rows] duration-300 ease-soft"
      style:grid-template-rows={drawerOpen ? '1fr' : '0fr'}
    >
      <div class="overflow-hidden">
        <div class="space-y-3 border-t border-border px-3 pb-3 pt-2.5 pl-[3.25rem]">
          {#if note.body}
            <p class="whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
              {note.body}
            </p>
          {/if}
          {#if imgs.length}
            <ImageStrip images={imgs} size={92} />
          {/if}
          {#if !note.body && !imgs.length}
            <p class="text-[12px] text-ink-faint">Tomt notat. Trykk blyanten for å redigere.</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

{#if isLarge}
  <LargeNoteDialog bind:open={editDialog} tabId={note.tabId} noteId={note.id} />
{/if}
