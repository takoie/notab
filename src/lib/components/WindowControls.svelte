<script lang="ts">
  import { Minus, Square, X } from '@lucide/svelte';
  import { windowControls } from '$lib/tauri';

  const ctl = windowControls();

  async function min() {
    (await ctl).minimize();
  }
  async function max() {
    (await ctl).toggleMaximize();
  }
  async function close() {
    (await ctl).close();
  }
</script>

<div class="no-drag flex items-center">
  <button
    class="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    onclick={min}
    title="Minimer"
    aria-label="Minimer"
  >
    <Minus size={15} />
  </button>
  <button
    class="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    onclick={max}
    title="Maksimer"
    aria-label="Maksimer"
  >
    <Square size={13} />
  </button>
  <button
    class="grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-danger hover:text-white"
    onclick={close}
    title="Lukk"
    aria-label="Lukk"
  >
    <X size={16} />
  </button>
</div>
