/**
 * Unsaved editor drafts, persisted to IndexedDB so a half-written note survives
 * navigating away, closing the window or a crash. Keyed by:
 *   composer:<tabId>   — the "+ Notat" composer for a tab
 *   note:<noteId>       — inline editing of an existing note
 */
import type { Importance } from './types';
import { getMeta, setMeta, deleteMeta } from './db/local';

export interface NoteDraft {
  title: string;
  html: string;
  due: number | null;
  importance: Importance;
  images: string[];
  color: string | null;
  ts: number;
}

const PREFIX = 'draft:';

export function isEmptyDraft(d: Partial<NoteDraft> | null | undefined): boolean {
  if (!d) return true;
  const html = (d.html ?? '').replace(/<[^>]*>/g, '').trim();
  return (d.title ?? '').trim() === '' && html === '' && (d.images ?? []).length === 0;
}

export async function loadDraft(key: string): Promise<NoteDraft | null> {
  return (await getMeta<NoteDraft>(PREFIX + key)) ?? null;
}

export async function saveDraft(key: string, d: Omit<NoteDraft, 'ts'>): Promise<void> {
  if (isEmptyDraft(d)) return clearDraft(key);
  await setMeta(PREFIX + key, { ...d, images: [...d.images], ts: Date.now() });
}

export async function clearDraft(key: string): Promise<void> {
  await deleteMeta(PREFIX + key);
}
