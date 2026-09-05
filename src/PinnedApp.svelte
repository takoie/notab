<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Pin } from '@lucide/svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { on } from '$lib/sync/bus';
  import { windowControls } from '$lib/tauri';
  import LockScreen from '$lib/components/LockScreen.svelte';
  import NoteRow from '$lib/components/NoteRow.svelte';

  const params = new URLSearchParams(location.search);
  const kind = params.get('kind') as 'note' | 'tab' | null;
  const id = params.get('id') ?? '';

  let ready = $state(false);

  onMount(async () => {
    theme.init();
    await notab.init();
    await lock.init();
    on((evt) => {
      if (evt.kind === 'remote-change') void notab.reload();
    });
    ready = true;
  });

  const note = $derived(kind === 'note' ? notab.getNote(id) : undefined);
  const tab = $derived(kind === 'tab' ? notab.getTab(id) : undefined);
  const tabNotes = $derived(kind === 'tab' ? notab.notesForTab(id) : []);

  const gone = $derived(
    ready && ((kind === 'note' && (!note || note.deleted)) || (kind === 'tab' && (!tab || tab.deleted))),
  );

  async function close() {
    (await windowControls()).close();
  }
</script>

<div class="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-canvas">
  <header
    class="drag-region flex h-8 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-2.5"
  >
    <Pin size={12} class="text-accent" />
    <span class="flex-1 truncate text-[11px] font-semibold text-ink">
      {kind === 'tab' ? (tab?.name ?? 'Fane') : (note?.title ?? 'Notat')}
    </span>
    <button
      class="no-drag grid h-5 w-5 place-items-center rounded text-ink-faint hover:bg-danger hover:text-white"
      onclick={close}
    >
      <X size={12} />
    </button>
  </header>

  <div class="min-h-0 flex-1 overflow-y-auto p-1.5">
    {#if !ready}
      <p class="p-3 text-[12px] text-ink-faint">Laster…</p>
    {:else if gone}
      <p class="p-3 text-[12px] text-ink-faint">Elementet finnes ikke lenger.</p>
    {:else if kind === 'note' && note}
      <NoteRow {note} />
      {#if note.body}
        <p class="whitespace-pre-wrap px-3 py-2 text-[12px] text-ink-soft">{note.body}</p>
      {/if}
    {:else if kind === 'tab' && tab}
      {#each tabNotes as n (n.id)}
        <NoteRow note={n} />
      {/each}
      {#if tabNotes.length === 0}
        <p class="p-3 text-[12px] text-ink-faint">Ingen notater.</p>
      {/if}
    {/if}
  </div>

  {#if lock.locked}
    <LockScreen />
  {/if}
</div>
