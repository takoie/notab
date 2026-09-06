<script lang="ts">
  import { GripVertical, Pin, PinOff, Trash2, Flag, Calendar } from '@lucide/svelte';
  import type { Note, Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { openPinnedWindow, closePinnedWindow } from '$lib/tauri';
  import { dueLabel, dueTooltip, startOfToday } from '$lib/date';
  import { sanitizeHtml, firstLine, isEmptyHtml } from '$lib/richtext';
  import { appendImages } from '$lib/image';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { cn } from '$lib/cn';
  import ImageStrip from './ImageStrip.svelte';
  import RichContent from './RichContent.svelte';
  import RichEditor from './RichEditor.svelte';

  let { note, draggable = false }: { note: Note; draggable?: boolean } = $props();

  let editing = $state(false);
  let draft = $state('');
  const imgs = $derived(note.images ?? []);

  function escapeHtml(s: string) {
    return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c);
  }
  // legacy notes kept their text in `title`; new notes live in `body`
  const displayHtml = $derived(
    note.body && !isEmptyHtml(note.body) ? note.body : `<p>${escapeHtml(note.title)}</p>`,
  );

  const IMP_NEXT: Record<Importance, Importance> = { low: 'med', med: 'high', high: 'low' };
  const IMP_TITLE: Record<Importance, string> = {
    low: 'Lav prioritet — klikk for å heve',
    med: 'Middels prioritet',
    high: 'Viktig',
  };

  function startEdit() {
    draft = displayHtml;
    editing = true;
  }
  async function commit() {
    editing = false;
    const body = sanitizeHtml(draft);
    if (body === sanitizeHtml(displayHtml)) return;
    await notab.updateNote(note.id, { body, title: firstLine(body) || note.title });
  }

  async function onChecklistToggle(html: string) {
    await notab.updateNote(note.id, { body: sanitizeHtml(html) });
  }

  async function onEditorImages(files: File[]) {
    const { images: next, rejected } = await appendImages(imgs, files);
    await notab.updateNote(note.id, { images: next });
    if (rejected) toasts.error(`${rejected} bilde(r) ble for stort`);
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
    'group relative rounded-lg border transition-[background-color,border-color,box-shadow] duration-150 ease-soft',
    note.done
      ? 'border-border/60 bg-surface-sunken opacity-60'
      : 'border-border bg-surface hover:border-border-strong hover:bg-surface-raised hover:shadow-card',
    !note.done &&
      note.importance === 'high' &&
      'border-danger/45 bg-[rgb(var(--c-danger)/0.09)] ring-1 ring-inset ring-danger/15 hover:border-danger/60',
  )}
>
  <div class="flex items-start gap-2.5 px-2.5 py-2">
    {#if draggable}
      <span
        class="drag-handle mt-0.5 -ml-1 cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
      >
        <GripVertical size={16} />
      </span>
    {/if}

    <button
      class={cn(
        'mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition-colors',
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
        'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md transition-all duration-150',
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
        <RichEditor
          bind:html={draft}
          autofocus
          placeholder="Skriv noe å huske …"
          onsave={commit}
          oncommit={commit}
          oncancel={() => (editing = false)}
          onpasteimages={onEditorImages}
        />
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div
          class={cn('cursor-text', note.done && 'text-ink-faint line-through')}
          ondblclick={startEdit}
        >
          <RichContent
            html={displayHtml}
            interactive={!note.done}
            onchange={onChecklistToggle}
          />
        </div>
      {/if}

      {#if note.dueDate != null}
        <span
          class={cn(
            'mt-1 flex w-fit items-center gap-1 rounded px-1 text-[11px] tabular-nums',
            overdue
              ? 'bg-[rgb(var(--c-danger)/0.12)] font-medium text-danger'
              : 'text-ink-faint',
          )}
          title={dueTooltip(note.dueDate)}
        >
          <Calendar size={11} />{dueLabel(note.dueDate)}
        </span>
      {/if}

      {#if imgs.length}
        <div class="mt-1.5">
          <ImageStrip images={imgs} size={44} />
        </div>
      {/if}
    </div>

    <div
      class="flex items-center gap-0.5 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
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
</div>
