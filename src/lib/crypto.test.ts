import { describe, it, expect } from 'vitest';
import { hashPin, verifyPin, isValidPin } from './crypto';

describe('PIN hashing', () => {
  it('round-trips a correct PIN', async () => {
    const { hash, salt } = await hashPin('1234');
    expect(await verifyPin('1234', hash, salt)).toBe(true);
  });

  it('rejects a wrong PIN', async () => {
    const { hash, salt } = await hashPin('1234');
    expect(await verifyPin('9999', hash, salt)).toBe(false);
  });

  it('uses a random salt per call', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('validates 4–6 digit PINs only', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });
});
