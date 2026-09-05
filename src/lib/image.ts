/**
 * Paste/drop image handling. Images are downscaled and stored inline as
 * data: URIs on the note (see the design doc — base64, file storage later).
 */

/** Rough byte size of a data: URI payload. */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

/** Total inline-image budget for one note (Convex doc limit is ~1 MB). */
export const NOTE_IMAGE_BUDGET = 850_000;

interface DownscaleStep {
  maxDim: number;
  quality: number;
}
const STEPS: DownscaleStep[] = [
  { maxDim: 1200, quality: 0.82 },
  { maxDim: 1000, quality: 0.72 },
  { maxDim: 800, quality: 0.62 },
  { maxDim: 640, quality: 0.55 },
];

const PER_IMAGE_TARGET = 320_000;

async function loadBitmap(blob: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(
  src: ImageBitmap | HTMLImageElement,
  maxDim: number,
  quality: number,
): string {
  const w = 'width' in src ? src.width : (src as HTMLImageElement).naturalWidth;
  const h = 'height' in src ? src.height : (src as HTMLImageElement).naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D-kontekst ikke tilgjengelig');
  ctx.drawImage(src as CanvasImageSource, 0, 0, cw, ch);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Downscale a pasted/dropped image to a compact JPEG data URI. */
export async function downscaleImage(blob: Blob): Promise<string> {
  const bitmap = await loadBitmap(blob);
  let out = encode(bitmap, STEPS[0].maxDim, STEPS[0].quality);
  for (let i = 1; i < STEPS.length && dataUrlBytes(out) > PER_IMAGE_TARGET; i++) {
    out = encode(bitmap, STEPS[i].maxDim, STEPS[i].quality);
  }
  if ('close' in bitmap) bitmap.close();
  return out;
}

/** Pull image files out of a paste event (returns [] if none). */
export function imagesFromClipboard(e: ClipboardEvent): File[] {
  const items = e.clipboardData?.items;
  if (!items) return [];
  const files: File[] = [];
  for (const it of items) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const f = it.getAsFile();
      if (f) files.push(f);
    }
  }
  return files;
}

export function imagesFromDrop(e: DragEvent): File[] {
  const list = e.dataTransfer?.files;
  if (!list) return [];
  return [...list].filter((f) => f.type.startsWith('image/'));
}

/**
 * Downscale a batch and append to `existing`, respecting the note budget.
 * Returns the new array plus how many were dropped for being over budget.
 */
export async function appendImages(
  existing: string[],
  files: File[],
): Promise<{ images: string[]; rejected: number }> {
  const images = [...existing];
  let used = images.reduce((n, u) => n + dataUrlBytes(u), 0);
  let rejected = 0;
  for (const file of files) {
    let dataUrl: string;
    try {
      dataUrl = await downscaleImage(file);
    } catch {
      rejected++;
      continue;
    }
    const size = dataUrlBytes(dataUrl);
    if (used + size > NOTE_IMAGE_BUDGET) {
      rejected++;
      continue;
    }
    images.push(dataUrl);
    used += size;
  }
  return { images, rejected };
}
