<script lang="ts">
  // NotaB! mark — the "!" reimagined as a downward fountain-pen nib (with slit
  // and breather hole) above the exclamation dot. Rounded accent tile.
  let { class: klass = 'h-6 w-6', tile = true }: { class?: string; tile?: boolean } = $props();
</script>

<svg
  class={klass}
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-label="NotaB!"
>
  {#if tile}
    <rect x="3" y="3" width="58" height="58" rx="16" fill="rgb(var(--c-accent, 108 99 232))" />
    <rect
      x="3.75"
      y="3.75"
      width="56.5"
      height="56.5"
      rx="15.25"
      stroke="#fff"
      stroke-opacity="0.16"
      stroke-width="1.5"
    />

    <!-- nib -->
    <path d="M32 48 L43 19 Q32 13.5 21 19 Z" fill="#fff" />
    <circle cx="32" cy="22.5" r="2.3" fill="rgb(var(--c-accent, 108 99 232))" />
    <path
      d="M32 25 V40.5"
      stroke="rgb(var(--c-accent, 108 99 232))"
      stroke-width="3.2"
      stroke-linecap="round"
    />
    <!-- exclamation dot -->
    <circle cx="32" cy="52.5" r="3.6" fill="#fff" />
  {:else}
    <path d="M32 48 L43 19 Q32 13.5 21 19 Z" fill="currentColor" />
    <path d="M32 26 V40" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.35" />
    <circle cx="32" cy="53" r="3.4" fill="currentColor" />
  {/if}
</svg>
