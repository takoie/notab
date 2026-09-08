<script lang="ts">
  // Test-only fixture: two sibling popovers, both open. Mimics a popover (A)
  // that contains a Select whose dropdown (B) is portaled to <body>.
  import Popover from './Popover.svelte';

  let aOpen = $state(true);
  let bOpen = $state(true);
  let aAnchor = $state<HTMLButtonElement>();
  let bAnchor = $state<HTMLButtonElement>();
</script>

<button bind:this={aAnchor}>a-anchor</button>
<button bind:this={bAnchor}>b-anchor</button>

<Popover anchor={aAnchor} bind:open={aOpen} label="A">
  <button data-testid="in-a">in A</button>
</Popover>

<Popover anchor={bAnchor} bind:open={bOpen} label="B">
  <button data-testid="in-b">in B</button>
</Popover>

<p data-testid="a-state">{aOpen ? 'open' : 'closed'}</p>
