<script lang="ts">
  import { ChevronLeft, ChevronRight, CalendarDays, CalendarPlus } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { monthGrid, monthTitle } from '$lib/date';
  import { groupEventsByDay } from '$lib/calendar';
  import Modal from '../ui/Modal.svelte';
  import NoteRow from '../NoteRow.svelte';
  import CalendarGrid from './CalendarGrid.svelte';
  import EventDialog from './EventDialog.svelte';
  import CalendarsPanel from './CalendarsPanel.svelte';
  import { calendarDrag } from './drag.svelte';

  const start = new Date();
  let year = $state(start.getFullYear());
  let month = $state(start.getMonth());

  const days = $derived(monthGrid(year, month));
  const eventsByDay = $derived(groupEventsByDay(notab.notes));
  const title = $derived(monthTitle(year, month));

  // standalone calendar events, bucketed into every grid day they cover
  const DAY = 86_400_000;
  const eventBarsByDay = $derived.by(() => {
    const map = new Map<number, typeof notab.visibleEvents>();
    if (days.length === 0) return map;
    const gridStart = days[0];
    const gridEnd = days[days.length - 1];
    for (const ev of notab.eventsInRange(gridStart, gridEnd)) {
      for (let d = Math.max(ev.startDate, gridStart); d <= Math.min(ev.endDate, gridEnd); d += DAY) {
        // snap to the nearest grid day (guards against DST drift)
        const key = days.find((x) => Math.abs(x - d) < DAY / 2);
        if (key == null) continue;
        let arr = map.get(key);
        if (!arr) map.set(key, (arr = []));
        arr.push(ev);
      }
    }
    return map;
  });

  let eventDialogOpen = $state(false);
  let editEventId = $state<string | null>(null);
  let eventDialogDate = $state<number | undefined>(undefined);

  function newEvent(ts?: number) {
    editEventId = null;
    eventDialogDate = ts;
    eventDialogOpen = true;
  }
  function editEvent(id: string) {
    editEventId = id;
    eventDialogDate = undefined;
    eventDialogOpen = true;
  }

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

  // scroll wheel over the grid steps the month
  let wheelAcc = 0;
  let wheelLock = false;
  function onWheel(e: WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // horizontal gesture
    wheelAcc += e.deltaY;
    if (wheelLock) return;
    if (wheelAcc > 60) {
      next();
      lockWheel();
    } else if (wheelAcc < -60) {
      prev();
      lockWheel();
    }
  }
  function lockWheel() {
    wheelAcc = 0;
    wheelLock = true;
    setTimeout(() => {
      wheelLock = false;
      wheelAcc = 0;
    }, 350);
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

    <div class="ml-auto flex items-center gap-1.5">
      <CalendarsPanel />
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-[filter] hover:brightness-105"
        onclick={() => newEvent()}
      >
        <CalendarPlus size={14} /> Hendelse
      </button>
    </div>
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="flex min-h-0 flex-1" onwheel={onWheel}>
    <CalendarGrid
      {days}
      {month}
      {eventsByDay}
      {eventBarsByDay}
      onopen={(id) => (openNoteId = id)}
      oneditevent={editEvent}
      onnewevent={newEvent}
    />
  </div>
</div>

<EventDialog bind:open={eventDialogOpen} eventId={editEventId} defaultDate={eventDialogDate} />

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
