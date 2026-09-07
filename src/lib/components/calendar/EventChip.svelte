<script lang="ts">
  import type { Note } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { startOfDay } from '$lib/date';
  import { cn } from '$lib/cn';
  import { calendarDrag } from './drag.svelte';

  let { note, onopen }: { note: Note; onopen: (id: string) => void } = $props();

  const tab = $derived(notab.getTab(note.tabId));
  const color = $derived(tab?.color ?? null);
  const label = $derived(note.title || 'Uten tittel');
  const tip = $derived(tab?.name ? `${tab.name} – ${label}` : label);

  const THRESHOLD = 4;
  let capturing = false;
  let dragging = $state(false);
  let startX = 0;
  let startY = 0;

  function dayUnder(x: number, y: number): number | null {
    const cell = document.elementFromPoint(x, y)?.closest('[data-day]') as HTMLElement | null;
    if (!cell?.dataset.day) return null;
    return Number(cell.dataset.day);
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    capturing = true;
    dragging = false;
    startX = e.clientX;
    startY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!capturing) return;
    if (!dragging) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD) return;
      dragging = true;
      calendarDrag.begin(note.id, label, e.clientX, e.clientY);
    }
    calendarDrag.move(e.clientX, e.clientY, dayUnder(e.clientX, e.clientY));
  }

  function onPointerUp(e: PointerEvent) {
    if (!capturing) return;
    capturing = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!dragging) return;

    const res = calendarDrag.end();
    // keep `dragging` truthy through the click event that follows this pointerup
    requestAnimationFrame(() => (dragging = false));

    if (res && res.day != null) {
      const n = notab.getNote(res.noteId);
      const sameDay = n?.dueDate != null && startOfDay(n.dueDate) === res.day;
      if (!sameDay) void notab.updateNote(res.noteId, { dueDate: res.day });
    }
  }

  function onPointerCancel() {
    capturing = false;
    dragging = false;
    calendarDrag.end();
  }

  function onClick(e: MouseEvent) {
    if (dragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onopen(note.id);
  }
</script>

<button
  type="button"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerCancel}
  onclick={onClick}
  title={tip}
  class={cn(
    'flex w-full touch-none items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight select-none',
    'cursor-grab transition-[filter] hover:brightness-95 active:cursor-grabbing',
    !color && 'bg-surface-sunken',
    dragging && 'opacity-40',
    note.done ? 'text-ink-faint line-through opacity-60' : 'text-ink',
  )}
  style:background-color={color ? `color-mix(in srgb, ${color} 16%, transparent)` : undefined}
>
  <span
    class={cn('h-1.5 w-1.5 shrink-0 rounded-full', !color && 'bg-ink-faint')}
    style:background-color={color ?? undefined}
  ></span>
  <span class="truncate">{label}</span>
</button>
