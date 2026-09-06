<script lang="ts">
  import { Plus, Flag } from '@lucide/svelte';
  import type { Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { appendImages } from '$lib/image';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { sanitizeHtml, firstLine, isEmptyHtml } from '$lib/richtext';
  import { cn } from '$lib/cn';
  import DeadlineButton from './DeadlineButton.svelte';
  import ImageStrip from './ImageStrip.svelte';
  import RichEditor from './RichEditor.svelte';

  let { tabId }: { tabId: string; tabName?: string } = $props();

  let expanded = $state(false);
  let html = $state('');
  let due = $state<number | null>(null);
  let images = $state<string[]>([]);
  let importance = $state<Importance>('med');
  let busy = $state(false);

  const empty = $derived(isEmptyHtml(html) && images.length === 0);

  const IMP_NEXT: Record<Importance, Importance> = { low: 'med', med: 'high', high: 'low' };
  const IMP_LABEL: Record<Importance, string> = {
    low: 'Lav prioritet',
    med: 'Middels prioritet',
    high: 'Viktig',
  };

  // expand + focus right after a new tab is created
  $effect(() => {
    if (notab.focusComposerFor === tabId) {
      expanded = true;
      notab.focusComposerFor = null;
    }
  });

  function reset() {
    html = '';
    due = null;
    images = [];
    importance = 'med';
  }

  function collapse() {
    reset();
    expanded = false;
  }

  async function onImages(files: File[]) {
    const { images: next, rejected } = await appendImages(images, files);
    images = next;
    if (rejected) toasts.error(`${rejected} bilde(r) ble for stort`);
  }

  async function save() {
    if (busy || empty) return;
    busy = true;
    const body = sanitizeHtml(html);
    try {
      await notab.addNote(tabId, firstLine(body), {
        kind: 'large',
        body,
        images,
        dueDate: due,
        importance,
      });
      collapse();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Kunne ikke lagre notatet');
    } finally {
      busy = false;
    }
  }
</script>

<div class="px-4 py-3">
  {#if !expanded}
    <button
      class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong py-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
      onclick={() => (expanded = true)}
    >
      <Plus size={16} /> Notat
    </button>
  {:else}
    <div class="rounded-xl border border-border bg-surface p-2.5 shadow-card">
      <RichEditor
        bind:html
        autofocus
        placeholder="Skriv noe å huske …"
        onsave={save}
        oncancel={() => {
          if (empty) collapse();
        }}
        onpasteimages={onImages}
      />

      {#if images.length}
        <div class="mt-2">
          <ImageStrip {images} editable size={44} onchange={(n) => (images = n)} />
        </div>
      {/if}

      <div class="mt-2.5 flex items-center gap-1 border-t border-border pt-2.5">
        <button
          type="button"
          class={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
            importance === 'high' && 'bg-[rgb(var(--c-danger)/0.14)] text-danger',
            importance === 'med' && 'text-warn hover:bg-surface-sunken',
            importance === 'low' && 'text-ink-faint hover:bg-surface-sunken',
          )}
          title={IMP_LABEL[importance]}
          onclick={() => (importance = IMP_NEXT[importance])}
        >
          <Flag size={13} fill={importance === 'low' ? 'none' : 'currentColor'} />
          {IMP_LABEL[importance]}
        </button>
        <DeadlineButton bind:value={due} />

        <div class="ml-auto flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken"
            onclick={collapse}
          >
            Avbryt
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-[12px] font-semibold text-accent-ink transition-[filter] hover:brightness-105 disabled:opacity-40"
            disabled={empty || busy}
            onclick={save}
          >
            <Plus size={14} /> Legg til
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
