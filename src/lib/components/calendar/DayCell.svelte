<script lang="ts">
  import { Plus, CalendarPlus, NotebookPen } from '@lucide/svelte';
  import type { Note, CalendarEvent } from '$lib/types';
  import { cn } from '$lib/cn';
  import { tint } from '$lib/colors';
  import { notab } from '$lib/stores/notab.svelte';

  /** an event's own colour, else the colour of the shared calendar it's in */
  const eventColor = (ev: CalendarEvent) =>
    ev.color ?? (ev.calId ? notab.getCalendar(ev.calId)?.color ?? null : null);
  import Popover from '../ui/Popover.svelte';
  import MenuItem from '../ui/MenuItem.svelte';
  import EventChip from './EventChip.svelte';
  import QuickCreatePopover from './QuickCreatePopover.svelte';
  import { calendarDrag } from './drag.svelte';

  let {
    ts,
    inMonth,
    isToday,
    events,
    dayEvents = [],
    onopen,
    oneditevent,
    onnewevent,
  }: {
    ts: number;
    inMonth: boolean;
    isToday: boolean;
    events: Note[];
    dayEvents?: CalendarEvent[];
    onopen: (id: string) => void;
    oneditevent?: (id: string) => void;
    onnewevent?: (ts: number) => void;
  } = $props();

  const DAY = 86_400_000;

  const MAX = 3;
  const shown = $derived(events.slice(0, MAX));
  const overflow = $derived(events.length - shown.length);
  const dayNum = $derived(new Date(ts).getDate());
  const dropTarget = $derived(calendarDrag.active && calendarDrag.overDay === ts);

  let addBtn = $state<HTMLButtonElement>();
  let moreBtn = $state<HTMLButtonElement>();
  let quickOpen = $state(false);
  let moreOpen = $state(false);
  let ctxOpen = $state(false);

  // the context menu sprouts from the mouse pointer, not the whole cell
  let ctxPt = $state({ x: 0, y: 0 });
  const ctxAnchor = {
    getBoundingClientRect: () => ({ x: ctxPt.x, y: ctxPt.y, width: 0, height: 0 }),
  };

  function onContext(e: MouseEvent) {
    e.preventDefault();
    ctxPt = { x: e.clientX, y: e.clientY };
    ctxOpen = true;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  data-day={ts}
  class={cn(
    'group/cell flex min-h-0 flex-col gap-0.5 border-b border-r border-border/60 p-1',
    !inMonth && 'bg-surface-sunken/40',
    dropTarget && 'bg-accent-soft ring-2 ring-inset ring-accent',
  )}
  oncontextmenu={onContext}
>
  <div class="flex items-center justify-between">
    <span
      class={cn(
        'grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] tabular-nums',
        isToday && 'bg-accent font-semibold text-accent-ink',
        !isToday && (inMonth ? 'text-ink-soft' : 'text-ink-faint'),
      )}
    >
      {dayNum}
    </span>
    <button
      bind:this={addBtn}
      type="button"
      class="grid h-5 w-5 place-items-center rounded text-ink-faint opacity-0 transition-opacity hover:bg-surface-sunken hover:text-ink group-hover/cell:opacity-100"
      title="Nytt notat denne dagen"
      aria-label="Nytt notat denne dagen"
      onclick={() => (quickOpen = !quickOpen)}
    >
      <Plus size={13} />
    </button>
  </div>

  {#if dayEvents.length}
    <div class="flex flex-col gap-0.5">
      {#each dayEvents as ev (ev.id)}
        {@const isStart = Math.abs(ev.startDate - ts) < DAY / 2}
        {@const isEnd = Math.abs(ev.endDate - ts) < DAY / 2}
        {@const col = eventColor(ev)}
        <button
          type="button"
          class={cn(
            '-mx-1 flex h-[18px] items-center truncate px-1.5 text-left text-[11px] font-medium leading-none transition-[filter] hover:brightness-95',
            isStart && 'ml-0 rounded-l',
            isEnd && 'mr-0 rounded-r',
            col ? 'text-ink' : 'bg-accent-soft text-accent',
          )}
          style:background-color={col ? tint(col, 22) : undefined}
          title={ev.title}
          onclick={() => oneditevent?.(ev.id)}
        >
          {#if isStart}{ev.title}{:else}&nbsp;{/if}
        </button>
      {/each}
    </div>
  {/if}

  <div class="flex min-h-0 flex-col gap-0.5 overflow-hidden">
    {#each shown as note (note.id)}
      <EventChip {note} {onopen} />
    {/each}
    {#if overflow > 0}
      <button
        bind:this={moreBtn}
        type="button"
        class="rounded px-1 text-left text-[11px] font-medium text-ink-faint hover:text-ink"
        onclick={() => (moreOpen = !moreOpen)}
      >
        +{overflow} flere
      </button>
    {/if}
  </div>
</div>

<QuickCreatePopover anchor={addBtn} bind:open={quickOpen} {ts} />

<Popover
  anchor={ctxAnchor}
  bind:open={ctxOpen}
  placement="bottom-start"
  label="Ny på denne dagen"
  class="w-44"
>
  <MenuItem
    icon={CalendarPlus}
    onclick={() => {
      ctxOpen = false;
      onnewevent?.(ts);
    }}
  >
    Ny hendelse
  </MenuItem>
  <MenuItem
    icon={NotebookPen}
    onclick={() => {
      ctxOpen = false;
      quickOpen = true;
    }}
  >
    Nytt notat
  </MenuItem>
</Popover>

<Popover
  anchor={moreBtn}
  bind:open={moreOpen}
  placement="bottom-start"
  label="Alle notater denne dagen"
  class="max-h-64 w-56 space-y-0.5 overflow-y-auto p-1.5"
>
  {#each events as note (note.id)}
    <EventChip
      {note}
      onopen={(id) => {
        moreOpen = false;
        onopen(id);
      }}
    />
  {/each}
</Popover>
