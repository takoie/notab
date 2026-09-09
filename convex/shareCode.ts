/** Shared helpers for the XXX-XXX-XXX invite codes used by faner and calendars. */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function genCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let out = '';
  for (let i = 0; i < 9; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (i === 2 || i === 5) out += '-';
  }
  return out;
}

export function normalizeCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/(.{3})(.{3})(.{3}).*/, '$1-$2-$3');
}
