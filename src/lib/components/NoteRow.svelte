<script lang="ts">
  import { GripVertical, Pin, PinOff, Trash2, Calendar, ExternalLink, User } from '@lucide/svelte';
  import type { Note, Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { openPinnedWindow, closePinnedWindow } from '$lib/tauri';
  import { dueLabel, dueTooltip, startOfToday } from '$lib/date';
  import { sanitizeHtml, firstLine, isEmptyHtml } from '$lib/richtext';
  import { cn } from '$lib/cn';
  import ImageStrip from './ImageStrip.svelte';
  import ImportanceMenu from './ImportanceMenu.svelte';
  import RichContent from './RichContent.svelte';
  import NoteEditorCard from './NoteEditorCard.svelte';

  let {
    note,
    draggable = false,
    showAuthors = false,
  }: { note: Note; draggable?: boolean; showAuthors?: boolean } = $props();

  const authorName = $derived(
    showAuthors && note.createdBy && note.createdBy !== session.userId
      ? notab.authorName(note.createdBy)
      : null,
  );

  let editing = $state(false);
  let titleDraft = $state('');
  let htmlDraft = $state('');
  let dueDraft = $state<number | null>(null);
  let impDraft = $state<Importance>('med');
  let imgDraft = $state<string[]>([]);
  let busy = $state(false);

  const imgs = $derived(note.images ?? []);
  const hasBody = $derived(!isEmptyHtml(note.body ?? ''));
  const titleText = $derived(note.title || firstLine(note.body ?? ''));

  function startEdit() {
    titleDraft = note.title;
    htmlDraft = note.body ?? '';
    dueDraft = note.dueDate;
    impDraft = note.importance;
    imgDraft = [...imgs];
    editing = true;
  }

  async function commit() {
    if (busy) return;
    busy = true;
    const body = sanitizeHtml(htmlDraft);
    try {
      await notab.updateNote(note.id, {
        title: titleDraft.trim() || firstLine(body) || note.title,
        body,
        dueDate: dueDraft,
        importance: impDraft,
        images: imgDraft,
      });
      editing = false;
    } finally {
      busy = false;
    }
  }

  async function onChecklistToggle(html: string) {
    await notab.updateNote(note.id, { body: sanitizeHtml(html) });
  }

  async function toggleBoardPin() {
    const next = !note.pinned;
    await notab.setPinned(note.id, next);
    if (next) {
      await openPinnedWindow({ kind: 'board', id: 'board', title: 'Festede notater' });
    } else if (notab.pinnedNotes.length === 0) {
      await closePinnedWindow('board', 'board');
    }
  }

  async function popOut() {
    await openPinnedWindow({ kind: 'note', id: note.id, title: note.title || 'Notat' });
  }

  const overdue = $derived(note.dueDate != null && !note.done && note.dueDate < startOfToday());
</script>

{#if editing}
  <NoteEditorCard
    bind:title={titleDraft}
    bind:html={htmlDraft}
    bind:due={dueDraft}
    bind:importance={impDraft}
    bind:images={imgDraft}
    saveLabel="Lagre"
    {busy}
    onsave={commit}
    oncancel={() => (editing = false)}
  />
{:else}
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

      <div
        class={cn(
          'mt-0.5 shrink-0',
          note.importance === 'none' &&
            'opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100',
        )}
      >
        <ImportanceMenu
          value={note.importance}
          compact
          onChange={(v) => notab.setImportance(note.id, v)}
        />
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
      <div class="min-w-0 flex-1 cursor-text" ondblclick={startEdit}>
        {#if titleText}
          <p
            class={cn(
              'text-[13px] font-semibold text-ink',
              note.done && 'text-ink-faint line-through',
            )}
          >
            {titleText}
          </p>
        {/if}

        {#if hasBody}
          <div class={cn('mt-0.5', note.done && 'text-ink-faint line-through')}>
            <RichContent
              html={note.body}
              interactive={!note.done}
              onchange={onChecklistToggle}
            />
          </div>
        {/if}

        {#if authorName}
          <span class="mt-1 flex w-fit items-center gap-1 text-[11px] text-ink-faint">
            <User size={11} />{authorName}
          </span>
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
          title={note.pinned ? 'Fjern fra festede notater' : 'Fest til festede notater'}
          onclick={toggleBoardPin}
        >
          {#if note.pinned}<PinOff size={14} />{:else}<Pin size={14} />{/if}
        </button>
        <button
          class="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-sunken hover:text-ink"
          title="Åpne i eget vindu"
          onclick={popOut}
        >
          <ExternalLink size={14} />
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
{/if}
