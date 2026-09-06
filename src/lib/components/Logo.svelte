<script lang="ts">
  // NotaB! mark — the "!" as an upward fountain-pen nib (slit + dot nestled in
  // the rounded base) on the violet tile. Matches logo concept 2.
  let { class: klass = 'h-6 w-6', tile = true }: { class?: string; tile?: boolean } = $props();

  const A = 'rgb(var(--c-accent, 108 99 232))';
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
    <rect x="3" y="3" width="58" height="58" rx="16" fill={A} />
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

    <path d="M32 12 L45 40 Q32 51 19 40 Z" fill="#fff" />
    <path d="M32 20 V39" stroke={A} stroke-width="3" stroke-linecap="round" />
    <circle cx="32" cy="45.5" r="4" fill="#fff" />
  {:else}
    <path d="M32 12 L45 40 Q32 51 19 40 Z" fill="currentColor" />
    <path d="M32 20 V39" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity="0.35" />
    <circle cx="32" cy="45.5" r="4" fill="currentColor" />
  {/if}
</svg>
