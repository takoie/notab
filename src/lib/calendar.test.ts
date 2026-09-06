import { describe, it, expect } from 'vitest';
import { groupEventsByDay, eventComparator } from './calendar';
import { startOfDay } from './date';
import type { Note } from './types';

function note(p: Partial<Note>): Note {
  return {
    id: p.id ?? 'n',
    tabId: p.tabId ?? 't',
    kind: 'small',
    title: p.title ?? '',
    body: '',
    images: [],
    done: p.done ?? false,
    importance: p.importance ?? 'med',
    dueDate: p.dueDate ?? null,
    orderKey: 'a0',
    pinned: false,
    createdAt: p.createdAt ?? 0,
    updatedAt: 0,
    createdBy: null,
    deleted: p.deleted ?? false,
    syncedAt: 0,
  };
}

const day = (y: number, m: number, d: number, h = 9) =>
  new Date(y, m, d, h).getTime();

describe('groupEventsByDay', () => {
  it('keys notes by local midnight regardless of time-of-day', () => {
    const map = groupEventsByDay([
      note({ id: 'a', dueDate: day(2026, 8, 10, 8) }),
      note({ id: 'b', dueDate: day(2026, 8, 10, 23) }),
    ]);
    const key = startOfDay(new Date(2026, 8, 10));
    expect(map.get(key)?.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('skips notes without a due date', () => {
    const map = groupEventsByDay([note({ id: 'a', dueDate: null })]);
    expect(map.size).toBe(0);
  });

  it('skips deleted notes', () => {
    const map = groupEventsByDay([
      note({ id: 'a', dueDate: day(2026, 8, 10), deleted: true }),
    ]);
    expect(map.size).toBe(0);
  });

  it('separates notes that fall on different days', () => {
    const map = groupEventsByDay([
      note({ id: 'a', dueDate: day(2026, 8, 10) }),
      note({ id: 'b', dueDate: day(2026, 8, 11) }),
    ]);
    expect(map.size).toBe(2);
  });
});

describe('eventComparator', () => {
  it('sorts unfinished before finished', () => {
    const list = [
      note({ id: 'done', done: true }),
      note({ id: 'open', done: false }),
    ].sort(eventComparator);
    expect(list.map((n) => n.id)).toEqual(['open', 'done']);
  });

  it('then by importance high → med → low', () => {
    const list = [
      note({ id: 'low', importance: 'low' }),
      note({ id: 'high', importance: 'high' }),
      note({ id: 'med', importance: 'med' }),
    ].sort(eventComparator);
    expect(list.map((n) => n.id)).toEqual(['high', 'med', 'low']);
  });

  it('then oldest first', () => {
    const list = [
      note({ id: 'new', createdAt: 200 }),
      note({ id: 'old', createdAt: 100 }),
    ].sort(eventComparator);
    expect(list.map((n) => n.id)).toEqual(['old', 'new']);
  });
});
