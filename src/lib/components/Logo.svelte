<script lang="ts">
  // NotaB! mark — rounded accent tile with a white "NB" monogram where the N's
  // rising stroke doubles as a checkmark, plus a square "!" dot in the corner
  // (which also reads as a checkbox). Legible down to 16px.
  let { class: klass = 'h-6 w-6', tile = true }: { class?: string; tile?: boolean } = $props();

  const stroke = $derived(tile ? '#fff' : 'currentColor');
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
  {/if}

  <g {stroke} stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <!-- N: left post -->
    <path d="M14 46 V18" />
    <!-- N rising stroke = checkmark: short arm up-left, long arm to the top-right -->
    <path d="M14 32 L23 42 L38 16" />
    <!-- N top-right terminal -->
    <path d="M38 16 V21" />

    <!-- B -->
    <path d="M44 46 V18 h6 a6.1 6.1 0 0 1 0 12.5 h-6 m0 0 h6.5 a6.4 6.4 0 0 1 0 13.5 h-6.5" />
  </g>

  <!-- "!" dot / checkbox accent -->
  <rect x="47.5" y="48" width="6" height="6" rx="1.8" fill={stroke} />
</svg>
