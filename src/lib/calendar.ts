import type { Importance, Note } from './types';
import { startOfDay } from './date';

const IMP_RANK: Record<Importance, number> = { high: 0, med: 1, low: 2 };

/** Order within a single day cell: unfinished first, then importance, then oldest first. */
export function eventComparator(a: Note, b: Note): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.importance !== b.importance) return IMP_RANK[a.importance] - IMP_RANK[b.importance];
  return a.createdAt - b.createdAt;
}

/**
 * Group every dated, non-deleted note by its due day (local midnight epoch ms).
 * Pure — derived straight from the in-memory note list.
 */
export function groupEventsByDay(notes: Note[]): Map<number, Note[]> {
  const map = new Map<number, Note[]>();
  for (const n of notes) {
    if (n.deleted || n.dueDate == null) continue;
    const key = startOfDay(n.dueDate);
    const list = map.get(key);
    if (list) list.push(n);
    else map.set(key, [n]);
  }
  for (const list of map.values()) list.sort(eventComparator);
  return map;
}
