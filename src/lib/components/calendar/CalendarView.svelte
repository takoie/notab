<script lang="ts">
  import { ChevronLeft, ChevronRight, CalendarDays } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { monthGrid, monthTitle } from '$lib/date';
  import { groupEventsByDay } from '$lib/calendar';
  import Modal from '../ui/Modal.svelte';
  import NoteRow from '../NoteRow.svelte';
  import CalendarGrid from './CalendarGrid.svelte';
  import { calendarDrag } from './drag.svelte';

  const start = new Date();
  let year = $state(start.getFullYear());
  let month = $state(start.getMonth());

  const days = $derived(monthGrid(year, month));
  const eventsByDay = $derived(groupEventsByDay(notab.notes));
  const title = $derived(monthTitle(year, month));

  let openNoteId = $state<string | null>(null);
  const openNote = $derived(
    openNoteId ? (notab.notes.find((n) => n.id === openNoteId && !n.deleted) ?? null) : null,
  );

  // if the open note gets deleted elsewhere, drop the modal
  $effect(() => {
    if (openNoteId && !openNote) openNoteId = null;
  });

  function prev() {
    if (month === 0) {
      month = 11;
      year -= 1;
    } else {
      month -= 1;
    }
  }

  function next() {
    if (month === 11) {
      month = 0;
      year += 1;
    } else {
      month += 1;
    }
  }

  function goToday() {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
  }
</script>

<div class="flex min-h-0 flex-1 flex-col gap-3 p-3">
  <div class="flex shrink-0 items-center gap-2">
    <CalendarDays size={18} class="text-accent" />
    <h1 class="text-[15px] font-semibold text-ink">{title}</h1>

    <div class="ml-2 flex items-center gap-0.5">
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
        title="Forrige måned"
        aria-label="Forrige måned"
        onclick={prev}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
        title="Neste måned"
        aria-label="Neste måned"
        onclick={next}
      >
        <ChevronRight size={16} />
      </button>
    </div>

    <button
      type="button"
      class="rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
      onclick={goToday}
    >
      I dag
    </button>
  </div>

  <CalendarGrid {days} {month} {eventsByDay} onopen={(id) => (openNoteId = id)} />
</div>

{#if calendarDrag.active}
  <div
    class="pointer-events-none fixed z-[80] max-w-[12rem] truncate rounded-md border border-border bg-surface-raised px-2 py-1 text-[11px] text-ink shadow-pop"
    style:left="{calendarDrag.x + 12}px"
    style:top="{calendarDrag.y + 12}px"
  >
    {calendarDrag.label}
  </div>
{/if}

<Modal
  open={openNote != null}
  title={openNote?.title || 'Notat'}
  onclose={() => (openNoteId = null)}
>
  {#if openNote}
    <NoteRow note={openNote} />
  {/if}
</Modal>
