<script lang="ts">
  import { Plus, Palette } from '@lucide/svelte';
  import type { Importance } from '$lib/types';
  import { appendImages } from '$lib/image';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { PALETTE, tint } from '$lib/colors';
  import { cn } from '$lib/cn';
  import DeadlineButton from './DeadlineButton.svelte';
  import ImageStrip from './ImageStrip.svelte';
  import ImportanceMenu from './ImportanceMenu.svelte';
  import RichEditor from './RichEditor.svelte';
  import Popover from './ui/Popover.svelte';

  let {
    title = $bindable(''),
    html = $bindable(''),
    due = $bindable(null),
    importance = $bindable('none'),
    images = $bindable([]),
    color = $bindable(null),
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
    color?: string | null;
    saveLabel?: string;
    busy?: boolean;
    canSave?: boolean;
    autofocus?: boolean;
    onsave: () => void;
    oncancel: () => void;
  } = $props();

  let titleEl = $state<HTMLInputElement | undefined>();
  let cardEl = $state<HTMLDivElement | undefined>();
  let colorBtn = $state<HTMLButtonElement | undefined>();
  let colorOpen = $state(false);

  $effect(() => {
    if (autofocus && titleEl) {
      const node = titleEl;
      requestAnimationFrame(() => node.focus());
    }
  });

  // click outside the card (and outside any popover it spawned) -> save & close
  $effect(() => {
    let armed = false;
    const arm = requestAnimationFrame(() => (armed = true));

    function onDown(e: PointerEvent) {
      if (!armed || !cardEl) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (cardEl.contains(t)) return;
      if ((t as Element).closest?.('.notab-popover, [role="dialog"]')) return;
      if (canSave) onsave();
      else oncancel();
    }

    window.addEventListener('pointerdown', onDown, true);
    return () => {
      cancelAnimationFrame(arm);
      window.removeEventListener('pointerdown', onDown, true);
    };
  });

  async function onImages(files: File[]) {
    const { images: next, rejected } = await appendImages(images, files);
    images = next;
    if (rejected) toasts.error(`${rejected} bilde(r) ble for stort`);
  }
</script>

<div
  bind:this={cardEl}
  class="relative overflow-hidden rounded-xl border border-border bg-surface p-2.5 shadow-card"
  style:background-color={color ? tint(color, 6) : undefined}
>
  {#if color}
    <span
      class="absolute inset-x-0 top-0 h-1"
      style:background-color={color}
      aria-hidden="true"
    ></span>
  {/if}

  <input
    bind:this={titleEl}
    bind:value={title}
    spellcheck={settings.spellcheck}
    lang={settings.lang}
    placeholder="Tittel"
    class="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-center text-[13px] font-semibold text-ink outline-none focus:border-accent"
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

    <button
      bind:this={colorBtn}
      type="button"
      class={cn(
        'flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] font-medium transition-colors hover:bg-surface-sunken',
        color ? 'text-ink' : 'text-ink-faint',
      )}
      title="Notatfarge"
      aria-label="Notatfarge"
      onclick={() => (colorOpen = !colorOpen)}
    >
      {#if color}
        <span class="h-3.5 w-3.5 rounded-full border border-border" style:background-color={color}
        ></span>
      {:else}
        <Palette size={15} />
      {/if}
    </button>

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

  <Popover
    anchor={colorBtn}
    bind:open={colorOpen}
    placement="bottom-start"
    label="Notatfarge"
    class="w-52"
  >
    <div class="flex flex-wrap items-center gap-1.5 p-1.5">
      {#each PALETTE as c (c ?? 'none')}
        <button
          type="button"
          class="grid h-5 w-5 place-items-center rounded-full border border-border transition-transform hover:scale-110"
          class:ring-2={color === c}
          class:ring-accent={color === c}
          class:ring-offset-1={color === c}
          class:ring-offset-surface-raised={color === c}
          style:background-color={c ?? 'transparent'}
          aria-label={c ? `Farge ${c}` : 'Ingen farge'}
          onclick={() => {
            color = c;
            colorOpen = false;
          }}
        >
          {#if c === null}<span class="text-[11px] leading-none text-ink-faint">×</span>{/if}
        </button>
      {/each}
    </div>
  </Popover>
</div>
