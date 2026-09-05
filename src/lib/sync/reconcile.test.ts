import { describe, it, expect } from 'vitest';
import { pickWinner, mergeBatch, type Versioned } from './reconcile';

const row = (id: string, updatedAt: number, deleted = false): Versioned => ({
  id,
  updatedAt,
  deleted,
});

describe('pickWinner (last-write-wins)', () => {
  it('takes whichever side exists when the other is missing', () => {
    expect(pickWinner(undefined, row('a', 1))).toEqual(row('a', 1));
    expect(pickWinner(row('a', 1), undefined)).toEqual(row('a', 1));
  });

  it('newer updatedAt wins', () => {
    expect(pickWinner(row('a', 1), row('a', 2))?.updatedAt).toBe(2);
    expect(pickWinner(row('a', 5), row('a', 2))?.updatedAt).toBe(5);
  });

  it('ties go to the remote (server clock is authoritative)', () => {
    const local = row('a', 3);
    const remote = row('a', 3, true);
    expect(pickWinner(local, remote)).toBe(remote);
  });
});

describe('mergeBatch', () => {
  it('writes remote rows that are newer than local', () => {
    const local = [row('a', 1), row('b', 5)];
    const remote = [row('a', 2), row('b', 3)];
    const res = mergeBatch(local, remote);
    expect(res.toWrite.map((r) => r.id)).toEqual(['a']);
    expect(res.localWins).toEqual(['b']);
  });

  it('adds unknown remote rows', () => {
    const res = mergeBatch([], [row('new', 10)]);
    expect(res.toWrite.map((r) => r.id)).toEqual(['new']);
  });

  it('propagates tombstones', () => {
    const res = mergeBatch([row('a', 1)], [row('a', 2, true)]);
    expect(res.toWrite[0]).toMatchObject({ id: 'a', deleted: true });
  });

  it('is a no-op when local already matches remote', () => {
    const res = mergeBatch([row('a', 2)], [row('a', 2)]);
    expect(res.toWrite).toEqual([]);
    expect(res.localWins).toEqual([]);
  });
});
