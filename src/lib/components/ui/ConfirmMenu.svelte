<script lang="ts">
  import Popover from './Popover.svelte';

  let {
    anchor,
    open = $bindable(false),
    message = 'Er du sikker?',
    confirmLabel = 'Slett',
    danger = true,
    onconfirm,
  }: {
    anchor: HTMLElement | undefined;
    open?: boolean;
    message?: string;
    confirmLabel?: string;
    danger?: boolean;
    onconfirm: () => void;
  } = $props();

  function confirm() {
    open = false;
    onconfirm();
  }
</script>

<Popover {anchor} bind:open placement="bottom-end" label={message} class="w-56 p-2.5">
  <p class="mb-2 text-[12px] text-ink-soft">{message}</p>
  <div class="flex justify-end gap-2">
    <button
      type="button"
      class="rounded-lg px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken"
      onclick={() => (open = false)}
    >
      Avbryt
    </button>
    <button
      type="button"
      class="rounded-lg px-3 py-1.5 text-[12px] font-semibold {danger
        ? 'bg-danger text-white hover:brightness-105'
        : 'bg-accent text-accent-ink hover:brightness-105'}"
      onclick={confirm}
    >
      {confirmLabel}
    </button>
  </div>
</Popover>
