<script lang="ts">
  import {
    GripVertical,
    Pin,
    PinOff,
    Trash2,
    Calendar,
    ExternalLink,
    User,
    ChevronRight,
  } from '@lucide/svelte';
  import type { Note, Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { openPinnedWindow, closePinnedWindow } from '$lib/tauri';
  import { dueLabel, dueTooltip, startOfToday } from '$lib/date';
  import { sanitizeHtml, firstLine, isEmptyHtml } from '$lib/richtext';
  import { tint } from '$lib/colors';
  import { loadDraft, saveDraft, clearDraft, isEmptyDraft, type NoteDraft } from '$lib/drafts';
  import { cn } from '$lib/cn';
  import ImageStrip from './ImageStrip.svelte';
  import ImportanceMenu from './ImportanceMenu.svelte';
  import RichContent from './RichContent.svelte';
  import NoteEditorCard from './NoteEditorCard.svelte';
  import ConfirmMenu from './ui/ConfirmMenu.svelte';

  let {
    note,
    draggable = false,
    showAuthors = false,
  }: { note: Note; draggable?: boolean; showAuthors?: boolean } = $props();

  const draftKey = $derived(`note:${note.id}`);

  const authorName = $derived(
    showAuthors && note.createdBy && note.createdBy !== session.userId
      ? notab.authorName(note.createdBy)
      : null,
  );

  let editing = $state(false);
  let titleDraft = $state('');
  let htmlDraft = $state('');
  let dueDraft = $state<number | null>(null);
  let impDraft = $state<Importance>('none');
  let imgDraft = $state<string[]>([]);
  let colorDraft = $state<string | null>(null);
  let busy = $state(false);

  let delBtn = $state<HTMLButtonElement | undefined>();
  let confirmOpen = $state(false);

  const imgs = $derived(note.images ?? []);
  const hasBody = $derived(!isEmptyHtml(note.body ?? ''));
  const titleText = $derived(note.title || firstLine(note.body ?? ''));
  const collapsed = $derived(notab.isNoteCollapsed(note.id));
  const collapsible = $derived(
    hasBody || imgs.length > 0 || note.dueDate != null || authorName != null,
  );

  function fill(from: { title: string; html: string; due: number | null; importance: Importance; images: string[]; color: string | null }) {
    titleDraft = from.title;
    htmlDraft = from.html;
    dueDraft = from.due;
    impDraft = from.importance;
    imgDraft = [...from.images];
    colorDraft = from.color;
  }

  function startEdit() {
    fill({
      title: note.title,
      html: note.body ?? '',
      due: note.dueDate,
      importance: note.importance,
      images: [...imgs],
      color: note.color ?? null,
    });
    editing = true;
  }

  // restore an unsaved draft on mount (survives navigating away / restart)
  $effect(() => {
    let alive = true;
    void loadDraft(draftKey).then((d) => {
      if (!alive || !d || isEmptyDraft(d)) return;
      const same =
        d.title === note.title &&
        sanitizeHtml(d.html) === sanitizeHtml(note.body ?? '') &&
        d.due === note.dueDate &&
        d.importance === note.importance;
      if (same) return void clearDraft(draftKey);
      fill({ title: d.title, html: d.html, due: d.due, importance: d.importance, images: d.images, color: d.color });
      editing = true;
    });
    return () => (alive = false);
  });

  // persist the in-progress edit (debounced)
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (!editing) return;
    const snap: Omit<NoteDraft, 'ts'> = {
      title: titleDraft,
      html: htmlDraft,
      due: dueDraft,
      importance: impDraft,
      images: [...imgDraft],
      color: colorDraft,
    };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveDraft(draftKey, snap), 400);
    return () => clearTimeout(saveTimer);
  });

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
        color: colorDraft,
      });
      await clearDraft(draftKey);
      editing = false;
    } finally {
      busy = false;
    }
  }

  async function cancelEdit() {
    await clearDraft(draftKey);
    editing = false;
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
    bind:color={colorDraft}
    saveLabel="Lagre"
    {busy}
    onsave={commit}
    oncancel={cancelEdit}
  />
{:else}
  <div
    class={cn(
      'group relative overflow-hidden rounded-lg border transition-[background-color,border-color,box-shadow] duration-150 ease-soft',
      note.done
        ? 'border-border/60 bg-surface-sunken opacity-60'
        : 'border-border bg-surface hover:border-border-strong hover:bg-surface-raised hover:shadow-card',
      !note.done &&
        !note.color &&
        note.importance === 'high' &&
        'border-danger/45 bg-[rgb(var(--c-danger)/0.09)] ring-1 ring-inset ring-danger/15 hover:border-danger/60',
    )}
    style:background-color={note.color && !note.done ? tint(note.color, 7) : undefined}
  >
    {#if note.color}
      <span
        class="pointer-events-none absolute inset-x-0 top-0 h-1"
        style:background-color={note.color}
        aria-hidden="true"
      ></span>
    {/if}

    <div class="flex items-start gap-1.5 px-1.5 py-1.5" class:pt-2={note.color}>
      {#if draggable}
        <span
          class="drag-handle -ml-1 mt-0.5 cursor-grab text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
        >
          <GripVertical size={15} />
        </span>
      {/if}

      <button
        class={cn(
          'mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition-colors',
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

      {#if note.importance !== 'none'}
        <div class="mt-px shrink-0">
          <ImportanceMenu
            value={note.importance}
            compact
            onChange={(v) => notab.setImportance(note.id, v)}
          />
        </div>
      {/if}

      <div class="flex min-w-0 flex-1 items-start gap-0.5">
        {#if collapsible}
          <button
            class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded text-ink-faint transition-transform hover:text-ink"
            class:rotate-90={!collapsed}
            aria-label={collapsed ? 'Utvid notat' : 'Slå sammen notat'}
            aria-expanded={!collapsed}
            onclick={() => notab.toggleNoteCollapsed(note.id)}
          >
            <ChevronRight size={13} />
          </button>
        {/if}

        <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
        <div class="min-w-0 flex-1 cursor-text pr-1" ondblclick={startEdit}>
          {#if titleText}
            <p
              class={cn(
                'text-[13px] font-semibold text-ink',
                note.done && 'text-ink-faint line-through',
              )}
            >
              {titleText}{#if collapsed && (hasBody || imgs.length)}<span
                  class="ml-1 font-normal text-ink-faint">…</span
                >{/if}
            </p>
          {/if}

          {#if !collapsed}
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
          {/if}
        </div>
      </div>
    </div>

    <div
      class="absolute right-1 top-1 flex items-center gap-0.5 rounded-lg bg-surface/85 text-ink-faint opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-within:opacity-100"
    >
      {#if note.importance === 'none'}
        <ImportanceMenu
          value={note.importance}
          compact
          onChange={(v) => notab.setImportance(note.id, v)}
        />
      {/if}
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
        bind:this={delBtn}
        class="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface-sunken hover:text-danger"
        title="Slett"
        onclick={() => (confirmOpen = true)}
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>
{/if}

<ConfirmMenu
  anchor={delBtn}
  bind:open={confirmOpen}
  message="Slette dette notatet?"
  confirmLabel="Slett"
  onconfirm={() => notab.deleteNote(note.id)}
/>
