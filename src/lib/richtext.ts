/**
 * Tiny rich-text helpers. Notes store their body as a small, sanitised HTML
 * string — bold / italic / underline / strikethrough plus bullet, numbered and
 * checklist lists. Everything else is stripped on the way in and on render.
 */

const ALLOWED_TAGS = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'BR',
  'P',
  'DIV',
  'UL',
  'OL',
  'LI',
]);

/** tags whose text content is dropped entirely, not unwrapped */
const DROP_CONTENT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'OBJECT']);

/** attributes we keep, per tag — used to mark checklist lists / checked items */
function keepAttr(tag: string, name: string): boolean {
  if (tag === 'UL' && name === 'data-checklist') return true;
  if (tag === 'LI' && name === 'data-checked') return true;
  return false;
}

function cleanNode(node: Node, out: Node[], doc: Document) {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push(doc.createTextNode(node.textContent ?? ''));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toUpperCase();

  if (DROP_CONTENT.has(tag)) return;

  if (!ALLOWED_TAGS.has(tag)) {
    // drop the tag but keep its text content
    for (const child of Array.from(el.childNodes)) cleanNode(child, out, doc);
    return;
  }

  const fresh = doc.createElement(tag.toLowerCase());
  for (const attr of Array.from(el.attributes)) {
    if (keepAttr(tag, attr.name)) fresh.setAttribute(attr.name, attr.value);
  }
  const kids: Node[] = [];
  for (const child of Array.from(el.childNodes)) cleanNode(child, kids, doc);
  for (const k of kids) fresh.appendChild(k);
  out.push(fresh);
}

/** Return a safe subset of the given HTML string. */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out: Node[] = [];
  for (const child of Array.from(doc.body.childNodes)) cleanNode(child, out, doc);
  const holder = doc.createElement('div');
  for (const n of out) holder.appendChild(n);
  return holder.innerHTML.trim();
}

/** Plain text of an HTML fragment, with block boundaries turned into newlines. */
export function htmlToText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(
    `<body>${html.replace(/<(br|\/p|\/div|\/li)>/gi, '\n$&')}</body>`,
    'text/html',
  );
  return (doc.body.textContent ?? '').replace(/\n{2,}/g, '\n').trim();
}

/** First non-empty line of an HTML fragment, for the note's plain-text title. */
export function firstLine(html: string, max = 140): string {
  const line = htmlToText(html).split('\n').find((l) => l.trim().length > 0) ?? '';
  const t = line.trim();
  return t.length > max ? t.slice(0, max) : t;
}

/** True when the fragment carries no text (whitespace / empty tags only). */
export function isEmptyHtml(html: string): boolean {
  return htmlToText(html).trim().length === 0;
}
