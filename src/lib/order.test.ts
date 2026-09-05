import { describe, it, expect } from 'vitest';
import {
  orderKeyAfter,
  orderKeyBefore,
  orderKeyBetween,
  orderKeysBetween,
  noteComparator,
  sortNotes,
} from './order';
import type { Note } from './types';

function note(p: Partial<Note>): Note {
  return {
    id: p.id ?? 'n',
    tabId: 't',
    kind: 'small',
    title: p.title ?? '',
    body: '',
    images: [],
    done: p.done ?? false,
    importance: p.importance ?? 'med',
    dueDate: p.dueDate ?? null,
    orderKey: p.orderKey ?? 'a0',
    pinned: false,
    createdAt: 0,
    updatedAt: 0,
    createdBy: null,
    deleted: false,
    syncedAt: 0,
  };
}

describe('fractional order keys', () => {
  it('appends in increasing order', () => {
    let last: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 20; i++) {
      last = orderKeyAfter(last);
      keys.push(last);
    }
    expect([...keys].sort()).toEqual(keys);
  });

  it('prepends before the first key', () => {
    const first = orderKeyAfter(null);
    const before = orderKeyBefore(first);
    expect(before < first).toBe(true);
  });

  it('inserts strictly between two keys', () => {
    const a = orderKeyAfter(null);
    const b = orderKeyAfter(a);
    const mid = orderKeyBetween(a, b);
    expect(a < mid && mid < b).toBe(true);
  });

  it('spreads n keys in order', () => {
    const keys = orderKeysBetween(null, null, 10);
    expect(keys.length).toBe(10);
    expect([...keys].sort()).toEqual(keys);
  });
});

describe('noteComparator', () => {
  it('manual sorts purely by orderKey', () => {
    const notes = [note({ id: 'b', orderKey: 'a2' }), note({ id: 'a', orderKey: 'a1' })];
    expect(sortNotes(notes, 'manual').map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('done-last pushes completed items down but keeps order within groups', () => {
    const notes = [
      note({ id: 'x', orderKey: 'a1', done: true }),
      note({ id: 'y', orderKey: 'a2', done: false }),
      note({ id: 'z', orderKey: 'a3', done: false }),
    ];
    expect(sortNotes(notes, 'done-last').map((n) => n.id)).toEqual(['y', 'z', 'x']);
  });

  it('importance orders high → med → low, done last', () => {
    const notes = [
      note({ id: 'low', orderKey: 'a1', importance: 'low' }),
      note({ id: 'high', orderKey: 'a2', importance: 'high' }),
      note({ id: 'med', orderKey: 'a3', importance: 'med' }),
      note({ id: 'donehigh', orderKey: 'a0', importance: 'high', done: true }),
    ];
    expect(sortNotes(notes, 'importance').map((n) => n.id)).toEqual([
      'high',
      'med',
      'low',
      'donehigh',
    ]);
  });

  it('due orders by date, nulls last', () => {
    const notes = [
      note({ id: 'none', orderKey: 'a1', dueDate: null }),
      note({ id: 'soon', orderKey: 'a2', dueDate: 100 }),
      note({ id: 'later', orderKey: 'a3', dueDate: 500 }),
    ];
    expect(sortNotes(notes, 'due').map((n) => n.id)).toEqual(['soon', 'later', 'none']);
  });

  it('is a total order (comparator never returns NaN)', () => {
    const cmp = noteComparator('due');
    const a = note({ dueDate: null });
    const b = note({ dueDate: null });
    expect(Number.isNaN(cmp(a, b))).toBe(false);
  });
});
