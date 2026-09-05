<script lang="ts">
  import Modal from './ui/Modal.svelte';
  import DeadlineButton from './DeadlineButton.svelte';
  import ImageStrip from './ImageStrip.svelte';
  import { Flag } from '@lucide/svelte';
  import type { Importance } from '$lib/types';
  import { notab } from '$lib/stores/notab.svelte';
  import { appendImages, imagesFromClipboard } from '$lib/image';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { cn } from '$lib/cn';

  let {
    open = $bindable(false),
    tabId,
    noteId = null,
  }: { open?: boolean; tabId: string; noteId?: string | null } = $props();

  const editing = $derived(noteId != null);

  let title = $state('');
  let body = $state('');
  let images = $state<string[]>([]);
  let due = $state<number | null>(null);
  let importance = $state<Importance>('med');
  let busy = $state(false);

  // (re)load fields whenever the dialog opens
  $effect(() => {
    if (!open) return;
    const n = noteId ? notab.getNote(noteId) : undefined;
    title = n?.title ?? '';
    body = n?.body ?? '';
    images = n ? [...n.images] : [];
    due = n?.dueDate ?? null;
    importance = n?.importance ?? 'med';
  });

  const IMP: { key: Importance; label: string; cls: string }[] = [
    { key: 'low', label: 'Lav', cls: 'text-ink-faint' },
    { key: 'med', label: 'Middels', cls: 'text-warn' },
    { key: 'high', label: 'Viktig', cls: 'text-danger' },
  ];

  async function onPaste(e: ClipboardEvent) {
    const files = imagesFromClipboard(e);
    if (files.length === 0) return;
    e.preventDefault();
    const { images: next, rejected } = await appendImages(images, files);
    images = next;
    if (rejected) toasts.error(`${rejected} bilde(r) ble for stort`);
  }

  async function save() {
    if (busy) return;
    if (!title.trim() && !body.trim() && images.length === 0) {
      toasts.error('Skriv en tittel eller hoveddel');
      return;
    }
    busy = true;
    try {
      if (noteId) {
        await notab.updateNote(noteId, {
          kind: 'large',
          title: title.trim() || 'Uten tittel',
          body,
          images,
          dueDate: due,
          importance,
        });
      } else {
        await notab.addLargeNote(tabId, {
          title: title.trim() || 'Uten tittel',
          body,
          images,
          dueDate: due,
          importance,
        });
      }
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Modal title={editing ? 'Rediger notat' : 'Nytt stort notat'} bind:open>
  <div class="space-y-3">
    <input
      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14px] font-medium text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      placeholder="Tittel"
      bind:value={title}
    />

    <textarea
      class="min-h-[9rem] w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-[13px] leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      placeholder="Hoveddel — lim inn bilder her også"
      bind:value={body}
      onpaste={onPaste}
    ></textarea>

    <ImageStrip {images} editable onchange={(n) => (images = n)} />

    <div class="flex items-center justify-between gap-2 border-t border-border pt-3">
      <DeadlineButton bind:value={due} />
      <div class="flex items-center gap-1">
        {#each IMP as o (o.key)}
          <button
            class={cn(
              'flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium transition-colors',
              importance === o.key
                ? 'bg-surface-sunken ' + o.cls
                : 'text-ink-faint hover:bg-surface-sunken',
            )}
            onclick={() => (importance = o.key)}
          >
            <Flag size={12} fill={importance === o.key && o.key !== 'low' ? 'currentColor' : 'none'} />
            {o.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  {#snippet footer()}
    <button
      class="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-surface-sunken"
      onclick={() => (open = false)}
    >
      Avbryt
    </button>
    <button
      class="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
      disabled={busy}
      onclick={save}
    >
      {editing ? 'Lagre' : 'Legg til'}
    </button>
  {/snippet}
</Modal>
