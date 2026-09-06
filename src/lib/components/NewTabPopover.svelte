<script lang="ts">
  import Popover from './ui/Popover.svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { focusOnMount } from '$lib/actions/focus';

  let {
    anchor,
    open = $bindable(false),
  }: { anchor: HTMLElement | undefined; open?: boolean } = $props();

  let name = $state('');

  function reset() {
    name = '';
  }

  async function submit() {
    const n = name.trim();
    if (!n) return;
    open = false;
    reset();
    await notab.createTab(n);
  }
</script>

<Popover
  {anchor}
  bind:open
  placement="bottom-end"
  label="Ny fane"
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
    <span class="block text-[12px] font-semibold text-ink-soft">Navn på ny fane</span>
    <input
      class="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent"
      placeholder="F.eks. Prosjekt X"
      bind:value={name}
      use:focusOnMount={true}
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
