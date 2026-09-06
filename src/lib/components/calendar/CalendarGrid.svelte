<script lang="ts">
  import type { Note } from '$lib/types';
  import { isoWeek, startOfToday } from '$lib/date';
  import DayCell from './DayCell.svelte';

  let {
    days,
    month,
    eventsByDay,
    onopen,
  }: {
    days: number[];
    month: number;
    eventsByDay: Map<number, Note[]>;
    onopen: (id: string) => void;
  } = $props();

  const WEEKDAYS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'];
  const COLS = 'grid-template-columns: 2rem repeat(7, minmax(0, 1fr))';
  const weeks = $derived(
    Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7)),
  );
  const today = startOfToday();
</script>

<div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
  <div
    class="grid shrink-0 border-b border-border bg-surface text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
    style={COLS}
  >
    <div></div>
    {#each WEEKDAYS as d (d)}
      <div class="border-l border-border/60 px-2 py-1.5">{d}</div>
    {/each}
  </div>

  <div class="grid min-h-0 flex-1 auto-rows-fr" style={COLS}>
    {#each weeks as week (week[0])}
      <div
        class="grid place-items-center border-b border-r border-border/60 bg-surface text-[11px] tabular-nums text-ink-faint"
      >
        {isoWeek(week[0])}
      </div>
      {#each week as ts (ts)}
        <DayCell
          {ts}
          inMonth={new Date(ts).getMonth() === month}
          isToday={ts === today}
          events={eventsByDay.get(ts) ?? []}
          {onopen}
        />
      {/each}
    {/each}
  </div>
</div>
