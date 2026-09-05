<script lang="ts">
  import { Plus, FileText } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { appendImages, imagesFromClipboard } from '$lib/image';
  import { toasts } from '$lib/stores/toasts.svelte';
  import DeadlineButton from './DeadlineButton.svelte';
  import ImageStrip from './ImageStrip.svelte';
  import LargeNoteDialog from './LargeNoteDialog.svelte';

  let { tabId, tabName }: { tabId: string; tabName: string } = $props();
  let value = $state('');
  let due = $state<number | null>(null);
  let images = $state<string[]>([]);
  let largeOpen = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  // autofocus the field right after a new tab is created
  $effect(() => {
    if (input && notab.focusComposerFor === tabId) {
      input.focus();
      notab.focusComposerFor = null;
    }
  });

  async function onPaste(e: ClipboardEvent) {
    const files = imagesFromClipboard(e);
    if (files.length === 0) return;
    e.preventDefault();
    const { images: next, rejected } = await appendImages(images, files);
    images = next;
    if (rejected) toasts.error(`${rejected} bilde(r) ble for stort`);
  }

  async function submit() {
    const text = value.trim();
    if (!text && images.length === 0) return;
    const carryDue = due;
    const carryImgs = images;
    value = '';
    due = null;
    images = [];
    await notab.addNote(tabId, text, { dueDate: carryDue, images: carryImgs });
    input?.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }
</script>

<div class="flex flex-col gap-2 px-4 py-3">
  <div class="flex items-start gap-2">
    <div
      class="flex flex-1 flex-col rounded-xl border border-border bg-surface px-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
    >
      <div class="flex items-center gap-1">
        <DeadlineButton bind:value={due} />
        <input
          bind:this={input}
          bind:value
          {onkeydown}
          onpaste={onPaste}
          placeholder={`Legg til noe for ${tabName}…`}
          class="min-w-0 flex-1 bg-transparent px-1.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
      </div>
      {#if images.length}
        <div class="px-1.5 pb-2">
          <ImageStrip {images} editable size={44} onchange={(n) => (images = n)} />
        </div>
      {/if}
    </div>

    <button
      class="flex h-[38px] items-center gap-1.5 rounded-xl border border-border px-3 text-[13px] font-medium text-ink-soft transition-colors hover:border-border-strong hover:bg-surface-sunken hover:text-ink"
      title="Nytt stort notat med tittel og hoveddel"
      onclick={() => (largeOpen = true)}
    >
      <FileText size={15} />
      Stort notat
    </button>

    <button
      class="flex h-[38px] items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[13px] font-semibold text-accent-ink transition-[filter] hover:brightness-105 disabled:opacity-40"
      disabled={!value.trim() && images.length === 0}
      onclick={submit}
    >
      <Plus size={15} />
      Legg til
    </button>
  </div>
</div>

<LargeNoteDialog bind:open={largeOpen} {tabId} />
