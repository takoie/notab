<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import type { Note, CalendarEvent } from '$lib/types';
  import { cn } from '$lib/cn';
  import { tint } from '$lib/colors';
  import Popover from '../ui/Popover.svelte';
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
  }: {
    ts: number;
    inMonth: boolean;
    isToday: boolean;
    events: Note[];
    dayEvents?: CalendarEvent[];
    onopen: (id: string) => void;
    oneditevent?: (id: string) => void;
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
</script>

<div
  data-day={ts}
  class={cn(
    'group/cell flex min-h-0 flex-col gap-0.5 border-b border-r border-border/60 p-1',
    !inMonth && 'bg-surface-sunken/40',
    dropTarget && 'bg-accent-soft ring-2 ring-inset ring-accent',
  )}
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
        <button
          type="button"
          class={cn(
            '-mx-1 flex h-[18px] items-center truncate px-1.5 text-left text-[11px] font-medium leading-none transition-[filter] hover:brightness-95',
            isStart && 'ml-0 rounded-l',
            isEnd && 'mr-0 rounded-r',
            ev.color ? 'text-ink' : 'bg-accent-soft text-accent',
          )}
          style:background-color={ev.color ? tint(ev.color, 22) : undefined}
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
