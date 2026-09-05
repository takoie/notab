import { describe, it, expect } from 'vitest';
import { newId, newShareCode, normalizeShareCode } from './ids';

describe('ids', () => {
  it('newId is unique-ish', () => {
    const seen = new Set(Array.from({ length: 500 }, () => newId()));
    expect(seen.size).toBe(500);
  });

  it('share codes look like XXX-XXX-XXX with a safe alphabet', () => {
    for (let i = 0; i < 50; i++) {
      const c = newShareCode();
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
    }
  });

  it('normalizeShareCode strips junk and regroups', () => {
    expect(normalizeShareCode('k7p2qw9mf')).toBe('K7P-2QW-9MF');
    expect(normalizeShareCode('K7P 2QW-9MF')).toBe('K7P-2QW-9MF');
    expect(normalizeShareCode('k7p-2qw-9mf-extra')).toBe('K7P-2QW-9MF');
  });
});
