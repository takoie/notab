<script lang="ts">
  import Popover from './ui/Popover.svelte';
  import { notab } from '$lib/stores/notab.svelte';

  let {
    anchor,
    tabId,
    open = $bindable(false),
  }: { anchor: HTMLElement | undefined; tabId: string; open?: boolean } = $props();

  let name = $state('');
  let inputEl = $state<HTMLInputElement | undefined>();

  function reset() {
    name = '';
  }

  $effect(() => {
    if (!open) return;
    const el = inputEl;
    if (!el) return;
    requestAnimationFrame(() => {
      el.focus();
      el.select();
    });
  });

  async function submit() {
    const n = name.trim();
    if (!n) return;
    open = false;
    reset();
    await notab.addDivider(tabId, n);
  }
</script>

<Popover
  {anchor}
  bind:open
  placement="bottom-end"
  label="Ny seksjon"
  class="w-64 p-3"
  onclose={reset}
>
  <form
    class="space-y-2.5"
    onsubmit={(e) => {
      e.preventDefault();
      void submit();
    }}
  >
    <span class="block text-[12px] font-semibold text-ink-soft">Navn på seksjon</span>
    <input
      bind:this={inputEl}
      class="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent"
      placeholder="F.eks. Denne uka"
      bind:value={name}
    />
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken"
        onclick={() => {
          open = false;
          reset();
        }}
      >
        Avbryt
      </button>
      <button
        type="submit"
        class="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink disabled:opacity-40"
        disabled={!name.trim()}
      >
        Lag
      </button>
    </div>
  </form>
</Popover>
