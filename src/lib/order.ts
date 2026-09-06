import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import type { Note, SortMode } from './types';

/** Key for an item appended after `last` (or first item when list empty). */
export function orderKeyAfter(last: string | null): string {
  return generateKeyBetween(last, null);
}

/** Key for an item inserted before `first`. */
export function orderKeyBefore(first: string | null): string {
  return generateKeyBetween(null, first);
}

/** Key that sorts between two existing keys. */
export function orderKeyBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(a, b);
}

/** n evenly spaced keys between a and b (used when seeding a list). */
export function orderKeysBetween(
  a: string | null,
  b: string | null,
  n: number,
): string[] {
  return generateNKeysBetween(a, b, n);
}

const IMPORTANCE_RANK: Record<Note['importance'], number> = {
  high: 0,
  med: 1,
  low: 2,
  none: 3,
};

/**
 * Comparator for a given sort mode. `manual` and every other mode still fall
 * back to `orderKey` so the order is always fully determined.
 */
export function noteComparator(mode: SortMode): (a: Note, b: Note) => number {
  const byOrder = (a: Note, b: Note) =>
    a.orderKey < b.orderKey ? -1 : a.orderKey > b.orderKey ? 1 : 0;

  switch (mode) {
    case 'manual':
      return byOrder;

    case 'done-last':
      return (a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return byOrder(a, b);
      };

    case 'importance':
      return (a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const r = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
        if (r !== 0) return r;
        return byOrder(a, b);
      };

    case 'due':
      return (a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        const ad = a.dueDate ?? Number.POSITIVE_INFINITY;
        const bd = b.dueDate ?? Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return byOrder(a, b);
      };
  }
}

export function sortNotes(notes: Note[], mode: SortMode): Note[] {
  return [...notes].sort(noteComparator(mode));
}
