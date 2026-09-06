<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import type { Importance } from '$lib/types';
  import { appendImages } from '$lib/image';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import DeadlineButton from './DeadlineButton.svelte';
  import ImageStrip from './ImageStrip.svelte';
  import ImportanceMenu from './ImportanceMenu.svelte';
  import RichEditor from './RichEditor.svelte';

  let {
    title = $bindable(''),
    html = $bindable(''),
    due = $bindable(null),
    importance = $bindable('med'),
    images = $bindable([]),
    saveLabel = 'Lagre',
    busy = false,
    canSave = true,
    autofocus = true,
    onsave,
    oncancel,
  }: {
    title?: string;
    html?: string;
    due?: number | null;
    importance?: Importance;
    images?: string[];
    saveLabel?: string;
    busy?: boolean;
    canSave?: boolean;
    autofocus?: boolean;
    onsave: () => void;
    oncancel: () => void;
  } = $props();

  let titleEl = $state<HTMLInputElement | undefined>();

  $effect(() => {
    if (autofocus && titleEl) {
      const node = titleEl;
      requestAnimationFrame(() => node.focus());
    }
  });

  async function onImages(files: File[]) {
    const { images: next, rejected } = await appendImages(images, files);
    images = next;
    if (rejected) toasts.error(`${rejected} bilde(r) ble for stort`);
  }
</script>

<div class="rounded-xl border border-border bg-surface p-2.5 shadow-card">
  <input
    bind:this={titleEl}
    bind:value={title}
    spellcheck="true"
    lang={settings.lang}
    placeholder="Tittel"
    class="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink outline-none focus:border-accent"
    onkeydown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onsave();
      }
      if (e.key === 'Escape') oncancel();
    }}
  />

  <RichEditor
    bind:html
    placeholder="Skriv noe å huske …"
    onsave={onsave}
    oncancel={oncancel}
    onpasteimages={onImages}
  />

  {#if images.length}
    <div class="mt-2">
      <ImageStrip {images} editable size={44} onchange={(n) => (images = n)} />
    </div>
  {/if}

  <div class="mt-2.5 flex flex-wrap items-center gap-1 border-t border-border pt-2.5">
    <ImportanceMenu value={importance} onChange={(v) => (importance = v)} />
    <DeadlineButton bind:value={due} />

    <div class="ml-auto flex items-center gap-2">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken"
        onclick={oncancel}
      >
        Avbryt
      </button>
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-accent-ink transition-[filter] hover:brightness-105 disabled:opacity-40"
        disabled={!canSave || busy}
        onclick={onsave}
      >
        <Plus size={14} /> {saveLabel}
      </button>
    </div>
  </div>
</div>
