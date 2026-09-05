<script lang="ts">
  import { onMount } from 'svelte';
  import { X, Pin } from '@lucide/svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { on } from '$lib/sync/bus';
  import { windowControls, startResize, type ResizeDir } from '$lib/tauri';
  import LockScreen from '$lib/components/LockScreen.svelte';
  import NoteRow from '$lib/components/NoteRow.svelte';
  import ImageLightbox from '$lib/components/ImageLightbox.svelte';

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

  // read the reactive $state arrays directly so these recompute after load
  const note = $derived(
    kind === 'note' ? notab.notes.find((n) => n.id === id) : undefined,
  );
  const tab = $derived(kind === 'tab' ? notab.tabs.find((t) => t.id === id) : undefined);
  const tabNotes = $derived(kind === 'tab' ? notab.notesForTab(id) : []);

  const gone = $derived(
    ready &&
      ((kind === 'note' && (!note || note.deleted)) ||
        (kind === 'tab' && (!tab || tab.deleted))),
  );

  async function close() {
    (await windowControls()).close();
  }
</script>

<div
  class="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-canvas"
>
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
      <NoteRow {note} forceOpen />
    {:else if kind === 'tab' && tab}
      {#each tabNotes as n (n.id)}
        <NoteRow note={n} />
      {/each}
      {#if tabNotes.length === 0}
        <p class="p-3 text-[12px] text-ink-faint">Ingen notater.</p>
      {/if}
    {/if}
  </div>

  <!-- invisible resize edges + corner grip (frameless window) -->
  {#each [['East', 'right-0 top-2 bottom-2 w-1 cursor-ew-resize'], ['South', 'bottom-0 left-2 right-2 h-1 cursor-ns-resize'], ['SouthEast', 'bottom-0 right-0 h-3 w-3 cursor-nwse-resize']] as [dir, cls] (dir)}
    <div
      role="presentation"
      class="absolute {cls}"
      onpointerdown={(e) => {
        e.preventDefault();
        void startResize(dir as ResizeDir);
      }}
    ></div>
  {/each}

  {#if lock.locked}
    <LockScreen />
  {/if}

  <ImageLightbox />
</div>
