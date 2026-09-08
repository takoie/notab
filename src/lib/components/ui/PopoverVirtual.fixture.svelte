<script lang="ts">
  // Test-only fixture: a popover anchored to a virtual point (mouse pointer),
  // not a DOM element.
  import Popover from './Popover.svelte';

  let { x = 0, y = 0 }: { x?: number; y?: number } = $props();

  const anchor = {
    getBoundingClientRect: () => ({ x, y, width: 0, height: 0 }),
  };
</script>

<Popover {anchor} open label="virtual">
  <button data-testid="in-panel">item</button>
</Popover>
