import { describe, it, expect, beforeEach } from 'vitest';
import { notab } from './notab.svelte';
import { _resetForTests, allOps } from '../db/local';

beforeEach(async () => {
  await _resetForTests();
  await notab.reload();
  notab.activeTabId = null;
});

describe('NotabStore — local core', () => {
  it('creates a tab and makes it active', async () => {
    const tab = await notab.createTab('Klasse 7B');
    expect(notab.visibleTabs.map((t) => t.name)).toContain('Klasse 7B');
    expect(notab.activeTabId).toBe(tab.id);
  });

  it('adds notes and orders them by insertion in manual mode', async () => {
    const tab = await notab.createTab('Fag');
    await notab.addNote(tab.id, 'Første');
    await notab.addNote(tab.id, 'Andre');
    await notab.addNote(tab.id, 'Tredje');
    expect(notab.notesForTab(tab.id).map((n) => n.title)).toEqual([
      'Første',
      'Andre',
      'Tredje',
    ]);
  });

  it('ignores blank notes', async () => {
    const tab = await notab.createTab('X');
    const r = await notab.addNote(tab.id, '   ');
    expect(r).toBeNull();
    expect(notab.notesForTab(tab.id)).toHaveLength(0);
  });

  it('derives the title from a rich body when no title is given', async () => {
    const tab = await notab.createTab('X');
    const n = await notab.addNote(tab.id, '', {
      body: '<p>Ring <b>rørlegger</b></p><p>før fredag</p>',
    });
    expect(n?.title).toBe('Ring rørlegger');
    expect(n?.body).toContain('<b>rørlegger</b>');
  });

  it('rejects a note with an empty body and no images', async () => {
    const tab = await notab.createTab('X');
    const n = await notab.addNote(tab.id, '', { body: '<p><br></p>' });
    expect(n).toBeNull();
  });

  it('toggles done and reflects it in done-last sorting', async () => {
    const tab = await notab.createTab('X');
    await notab.setSortMode(tab.id, 'done-last');
    const a = await notab.addNote(tab.id, 'A');
    await notab.addNote(tab.id, 'B');
    await notab.toggleDone(a!.id);
    expect(notab.notesForTab(tab.id).map((n) => n.title)).toEqual(['B', 'A']);
  });

  it('reorders notes manually via full id list', async () => {
    const tab = await notab.createTab('X');
    const a = await notab.addNote(tab.id, 'A');
    const b = await notab.addNote(tab.id, 'B');
    const c = await notab.addNote(tab.id, 'C');
    await notab.reorderNotes([c!.id, a!.id, b!.id]);
    expect(notab.notesForTab(tab.id).map((n) => n.title)).toEqual(['C', 'A', 'B']);
  });

  it('soft-deletes a note (tombstone, not gone)', async () => {
    const tab = await notab.createTab('X');
    const a = await notab.addNote(tab.id, 'A');
    await notab.deleteNote(a!.id);
    expect(notab.notesForTab(tab.id)).toHaveLength(0);
    expect(notab.getNote(a!.id)?.deleted).toBe(true);
  });

  it('deleting a tab tombstones it and its notes and moves selection', async () => {
    const t1 = await notab.createTab('One');
    await notab.addNote(t1.id, 'x');
    const t2 = await notab.createTab('Two');
    await notab.deleteTab(t2.id);
    expect(notab.visibleTabs.map((t) => t.name)).toEqual(['One']);
    expect(notab.activeTabId).toBe(t1.id);
  });

  it('queues an outbox op for every mutation', async () => {
    const tab = await notab.createTab('X');
    await notab.addNote(tab.id, 'A');
    const ops = await allOps();
    // at least: upsertTab + upsertNote
    expect(ops.length).toBeGreaterThanOrEqual(2);
    expect(ops.some((o) => o.type === 'upsertTab')).toBe(true);
    expect(ops.some((o) => o.type === 'upsertNote')).toBe(true);
  });

  it('archives a tab: hidden from the bar, listed in archive, selection moves', async () => {
    const t1 = await notab.createTab('Keep');
    const t2 = await notab.createTab('Shelve');
    expect(notab.activeTabId).toBe(t2.id);
    await notab.archiveTab(t2.id);
    expect(notab.visibleTabs.map((t) => t.name)).toEqual(['Keep']);
    expect(notab.archivedTabs.map((t) => t.name)).toEqual(['Shelve']);
    expect(notab.activeTabId).toBe(t1.id);
  });

  it('unarchives a tab back into the bar and selects it', async () => {
    const t = await notab.createTab('Shelve');
    await notab.archiveTab(t.id);
    await notab.unarchiveTab(t.id);
    expect(notab.visibleTabs.map((x) => x.name)).toContain('Shelve');
    expect(notab.archivedTabs).toHaveLength(0);
    expect(notab.activeTabId).toBe(t.id);
  });

  it('carries the archived flag onto the sync wire payload', async () => {
    const t = await notab.createTab('X');
    await notab.archiveTab(t.id);
    const ops = await allOps();
    const last = ops.filter((o) => o.type === 'upsertTab').at(-1);
    expect(last?.payload.archived).toBe(true);
  });

  it('pins and unpins a note without a tombstone', async () => {
    const tab = await notab.createTab('X');
    const a = await notab.addNote(tab.id, 'A');
    await notab.setPinned(a!.id, true);
    expect(notab.pinnedNotes.map((n) => n.id)).toEqual([a!.id]);
    await notab.setPinned(a!.id, false);
    expect(notab.pinnedNotes).toHaveLength(0);
  });
});
