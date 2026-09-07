/**
 * Inline math atoms. Notes store math as `<span data-latex="…">` in the body
 * (kept clean through sanitising). MathLive turns those into rendered markup at
 * display time; the library is loaded on demand.
 */

type MathModule = typeof import('mathlive');
let modPromise: Promise<MathModule> | null = null;

export function loadMathlive(): Promise<MathModule> {
  modPromise ??= import('mathlive').then((m) => {
    // fonts + sounds are bundled via the CSS import in main.ts, so stop MathLive
    // from injecting its own <link>/audio (which would 404 under the app origin)
    try {
      m.MathfieldElement.fontsDirectory = null;
      m.MathfieldElement.soundsDirectory = null;
    } catch {
      /* ignore */
    }
    return m;
  });
  return modPromise;
}

export function hasMath(html: string): boolean {
  return html.includes('data-latex');
}

/** Render every `[data-latex]` atom under `root` into MathLive markup. */
export async function renderMathIn(root: HTMLElement): Promise<void> {
  const atoms = root.querySelectorAll<HTMLElement>('span[data-latex]:not([data-rendered])');
  if (atoms.length === 0) return;
  const { convertLatexToMarkup } = await loadMathlive();
  for (const el of atoms) {
    const latex = el.getAttribute('data-latex') ?? '';
    el.dataset.rendered = '1';
    el.setAttribute('contenteditable', 'false');
    if (!latex.trim()) continue;
    try {
      el.innerHTML = convertLatexToMarkup(latex);
    } catch {
      el.textContent = latex;
    }
  }
}
