/**
 * Render LaTeX math inside already-sanitised note HTML. We keep the *stored*
 * body as plain `$…$` / `$$…$$` / `\(…\)` / `\[…\]` text (so it stays clean and
 * syncs safely) and only turn it into KaTeX markup at display time.
 */
type KatexModule = typeof import('katex');
let katexPromise: Promise<KatexModule['default']> | null = null;
function loadKatex(): Promise<KatexModule['default']> {
  katexPromise ??= import('katex').then((m) => m.default);
  return katexPromise;
}

interface Seg {
  math: string;
  display: boolean;
  raw: string;
}

// ordered so `$$` is tried before `$`
const PATTERNS: { re: RegExp; display: boolean }[] = [
  { re: /\$\$([\s\S]+?)\$\$/g, display: true },
  { re: /\\\[([\s\S]+?)\\\]/g, display: true },
  { re: /\\\(([\s\S]+?)\\\)/g, display: false },
  { re: /(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, display: false },
];

function findSegments(text: string): { start: number; end: number; seg: Seg }[] {
  const hits: { start: number; end: number; seg: Seg }[] = [];
  for (const { re, display } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = m.index;
      const end = m.index + m[0].length;
      if (hits.some((h) => start < h.end && end > h.start)) continue; // overlaps an earlier hit
      hits.push({ start, end, seg: { math: m[1].trim(), display, raw: m[0] } });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

/** True if the string contains at least one math delimiter pair. */
export function hasMath(text: string): boolean {
  return /\$[^\n$]+\$|\$\$[\s\S]+\$\$|\\\([\s\S]+\\\)|\\\[[\s\S]+\\\]/.test(text);
}

/** Walk text nodes under `root` and replace math delimiters with KaTeX spans. */
export async function renderMathIn(root: HTMLElement): Promise<void> {
  const katex = await loadKatex();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !/[$\\]/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      let p = node.parentElement;
      while (p && p !== root) {
        if (p.classList.contains('katex') || p.tagName === 'CODE' || p.tagName === 'PRE') {
          return NodeFilter.FILTER_REJECT;
        }
        p = p.parentElement;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const targets: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) targets.push(n as Text);

  for (const textNode of targets) {
    const text = textNode.nodeValue ?? '';
    const segs = findSegments(text);
    if (segs.length === 0) continue;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const { start, end, seg } of segs) {
      if (start > cursor) frag.appendChild(document.createTextNode(text.slice(cursor, start)));
      const span = document.createElement('span');
      try {
        katex.render(seg.math, span, {
          displayMode: seg.display,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
      } catch {
        span.textContent = seg.raw;
      }
      frag.appendChild(span);
      cursor = end;
    }
    if (cursor < text.length) frag.appendChild(document.createTextNode(text.slice(cursor)));
    textNode.parentNode?.replaceChild(frag, textNode);
  }
}
