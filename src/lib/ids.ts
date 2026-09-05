/** Client-generated stable id. Convex keeps its own _id; we map by this. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // fallback
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

/** Human-friendly share code, e.g. "K7P-2QW-9MF". */
export function newShareCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let out = '';
  for (let i = 0; i < 9; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (i === 2 || i === 5) out += '-';
  }
  return out;
}

export function normalizeShareCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/(.{3})(.{3})(.{3}).*/, '$1-$2-$3');
}
