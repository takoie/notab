<script lang="ts">
  import { X, ImagePlus } from '@lucide/svelte';
  import { lightbox } from '$lib/stores/lightbox.svelte';
  import { appendImages, imagesFromDrop } from '$lib/image';
  import { toasts } from '$lib/stores/toasts.svelte';

  let {
    images,
    editable = false,
    size = 56,
    onchange,
  }: {
    images: string[];
    editable?: boolean;
    size?: number;
    onchange?: (next: string[]) => void;
  } = $props();

  let dragging = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);

  async function addFiles(files: File[]) {
    if (!files.length || !onchange) return;
    const { images: next, rejected } = await appendImages(images, files);
    if (rejected > 0) toasts.error(`${rejected} bilde(r) ble for stort for notatet`);
    if (next !== images) onchange(next);
  }

  function remove(i: number) {
    onchange?.(images.filter((_, idx) => idx !== i));
  }

  async function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    await addFiles(imagesFromDrop(e));
  }
</script>

{#if images.length > 0 || editable}
  <div
    class="flex flex-wrap items-center gap-1.5"
    class:rounded-lg={editable}
    class:ring-2={dragging}
    class:ring-accent={dragging}
    ondragover={(e) => {
      if (editable) {
        e.preventDefault();
        dragging = true;
      }
    }}
    ondragleave={() => (dragging = false)}
    ondrop={onDrop}
    role="group"
  >
    {#each images as img, i (i)}
      <div class="group/thumb relative shrink-0" style:width="{size}px" style:height="{size}px">
        <button
          class="h-full w-full overflow-hidden rounded-lg border border-border bg-surface-sunken"
          onclick={() => lightbox.show(images, i)}
          aria-label="Vis bilde {i + 1}"
        >
          <img src={img} alt="Vedlegg {i + 1}" class="h-full w-full object-cover" />
        </button>
        {#if editable}
          <button
            class="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full bg-ink text-canvas shadow group-hover/thumb:grid"
            onclick={() => remove(i)}
            aria-label="Fjern bilde {i + 1}"
          >
            <X size={12} />
          </button>
        {/if}
      </div>
    {/each}

    {#if editable}
      <button
        class="grid shrink-0 place-items-center rounded-lg border border-dashed border-border-strong text-ink-faint transition-colors hover:border-accent hover:text-accent"
        style:width="{size}px"
        style:height="{size}px"
        title="Legg til bilde"
        onclick={() => fileInput?.click()}
      >
        <ImagePlus size={18} />
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        onchange={(e) => {
          void addFiles([...(e.currentTarget.files ?? [])]);
          e.currentTarget.value = '';
        }}
      />
    {/if}
  </div>
{/if}
