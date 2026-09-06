import { describe, it, expect } from 'vitest';
import { monthGrid, monthTitle, startOfDay, isoWeek } from './date';

describe('monthGrid', () => {
  it('always returns 42 days (6 weeks)', () => {
    expect(monthGrid(2026, 8)).toHaveLength(42);
    expect(monthGrid(2024, 1)).toHaveLength(42);
  });

  it('starts on the Monday of the week containing the 1st', () => {
    // 1 Sep 2026 is a Tuesday → grid starts Mon 31 Aug 2026
    const grid = monthGrid(2026, 8);
    expect(grid[0]).toBe(startOfDay(new Date(2026, 7, 31)));
    expect(new Date(grid[0]).getDay()).toBe(1); // Monday
  });

  it('starts on the 1st when the month begins on a Monday', () => {
    // 1 Jun 2026 is a Monday
    const grid = monthGrid(2026, 5);
    expect(grid[0]).toBe(startOfDay(new Date(2026, 5, 1)));
  });

  it('spans the December → January year boundary', () => {
    const grid = monthGrid(2025, 11);
    expect(new Date(grid[0]).getFullYear()).toBe(2025);
    expect(new Date(grid[41]).getFullYear()).toBe(2026);
  });

  it('covers a leap-year February', () => {
    const grid = monthGrid(2024, 1);
    const feb29 = startOfDay(new Date(2024, 1, 29));
    expect(grid).toContain(feb29);
  });

  it('produces consecutive days at local midnight', () => {
    const grid = monthGrid(2026, 8);
    for (let i = 1; i < grid.length; i++) {
      expect(new Date(grid[i]).getHours()).toBe(0);
      expect(grid[i]).toBeGreaterThan(grid[i - 1]);
    }
  });

  it('each row of 7 shares one ISO week number', () => {
    const grid = monthGrid(2026, 8);
    for (let row = 0; row < 6; row++) {
      const wk = isoWeek(grid[row * 7]);
      for (let d = 1; d < 7; d++) {
        expect(isoWeek(grid[row * 7 + d])).toBe(wk);
      }
    }
  });
});

describe('monthTitle', () => {
  it('is a capitalised Norwegian month plus year', () => {
    expect(monthTitle(2026, 8)).toBe('September 2026');
    expect(monthTitle(2026, 0)).toBe('Januar 2026');
  });
});
