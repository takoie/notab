/**
 * Tiny rich-text helpers. Notes store their body as a small, sanitised HTML
 * string — bold / italic / underline / strikethrough, bullet / numbered /
 * checklist lists, text + highlight colour, and inline math atoms
 * (`<span data-latex="…">`). Everything else is stripped on the way in and out.
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
  'SPAN',
  'MARK',
]);

/** tags whose text content is dropped entirely, not unwrapped */
const DROP_CONTENT = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME', 'OBJECT']);

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\([\d.,\s%/]+\)|[a-zA-Z]+)$/;

/** keep only `color` / `background-color` with a safe value */
function safeStyle(style: string): string {
  const out: string[] = [];
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i === -1) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if ((prop === 'color' || prop === 'background-color') && COLOR_RE.test(val)) {
      out.push(`${prop}: ${val}`);
    }
  }
  return out.join('; ');
}

function cleanNode(node: Node, out: Node[], doc: Document) {
  if (node.nodeType === Node.TEXT_NODE) {
    out.push(doc.createTextNode(node.textContent ?? ''));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  let tag = el.tagName.toUpperCase();

  if (DROP_CONTENT.has(tag)) return;

  // <font color> / <font> -> <span style="color: …">
  let styleFromFont = '';
  if (tag === 'FONT') {
    const c = el.getAttribute('color');
    if (c && COLOR_RE.test(c)) styleFromFont = `color: ${c}`;
    tag = 'SPAN';
  }

  if (!ALLOWED_TAGS.has(tag)) {
    for (const child of Array.from(el.childNodes)) cleanNode(child, out, doc);
    return;
  }

  // inline math atom — keep just the attribute + its latex as text
  const latex = el.getAttribute('data-latex');
  if (tag === 'SPAN' && latex != null) {
    const span = doc.createElement('span');
    span.setAttribute('data-latex', latex);
    span.textContent = latex;
    out.push(span);
    return;
  }

  const fresh = doc.createElement(tag.toLowerCase());
  if (tag === 'UL' && el.hasAttribute('data-checklist')) fresh.setAttribute('data-checklist', '');
  if (tag === 'LI' && el.hasAttribute('data-checked')) fresh.setAttribute('data-checked', '');
  if (tag === 'SPAN' || tag === 'MARK') {
    const style = safeStyle(`${el.getAttribute('style') ?? ''};${styleFromFont}`);
    if (style) fresh.setAttribute('style', style);
  }

  const kids: Node[] = [];
  for (const child of Array.from(el.childNodes)) cleanNode(child, kids, doc);
  for (const k of kids) fresh.appendChild(k);

  // an inert <span> with no styling adds nothing — unwrap it
  if (tag === 'SPAN' && !fresh.getAttribute('style')) {
    out.push(...kids);
    return;
  }
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
