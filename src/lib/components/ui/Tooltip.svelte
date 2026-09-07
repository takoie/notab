<script lang="ts">
  /**
   * App-wide themed replacement for native `title=""` tooltips. Mount once.
   * It watches for hovering any element with a `title`, and once the hover
   * settles it removes the attribute (so the OS chip never shows) and renders a
   * styled chip instead. The `title` is restored as soon as the hover ends.
   */
  import { portal } from '$lib/actions/portal';
  import { computePosition } from '$lib/popover';

  const DELAY = 450;

  let text = $state('');
  let visible = $state(false);
  let pos = $state({ left: 0, top: -9999, origin: 'left top' });
  let el = $state<HTMLDivElement | null>(null);

  let target: HTMLElement | null = null;
  let stashed: string | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function titledAncestor(node: EventTarget | null): HTMLElement | null {
    let n = node as HTMLElement | null;
    while (n && n !== document.body && n.nodeType === 1) {
      const t = n.getAttribute?.('title');
      if (t && t.trim()) return n;
      n = n.parentElement;
    }
    return null;
  }

  function reset() {
    clearTimeout(timer);
    visible = false;
    // put the attribute back the moment we're done with it
    if (target && stashed != null && !target.hasAttribute('title')) {
      target.setAttribute('title', stashed);
    }
    target = null;
    stashed = null;
  }

  function place() {
    if (!el || !target) return;
    const a = target.getBoundingClientRect();
    pos = computePosition(
      { x: a.x, y: a.y, width: a.width, height: a.height },
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      'bottom',
    );
  }

  function onOver(e: PointerEvent) {
    if (e.pointerType === 'touch') return;

    // still somewhere inside the element we're already tracking — keep it
    if (target && target.contains(e.target as Node)) return;

    const next = titledAncestor(e.target);
    if (next === target) return;

    reset();
    if (!next) return;

    target = next;
    timer = setTimeout(() => {
      if (!target) return;
      stashed = target.getAttribute('title');
      text = (stashed ?? '').trim();
      if (!text) return;
      target.removeAttribute('title');
      visible = true;
      pos = { left: 0, top: -9999, origin: 'left top' };
      queueMicrotask(place);
    }, DELAY);
  }
</script>

<svelte:window
  onpointerover={onOver}
  onpointerdown={reset}
  onwheel={reset}
  onblur={reset}
  onmouseleave={reset}
  onkeydown={(e) => e.key === 'Escape' && reset()}
/>

{#if visible && text}
  <div
    bind:this={el}
    use:portal
    role="tooltip"
    class="notab-tip pointer-events-none fixed z-[90] max-w-[15rem] rounded-md bg-ink px-2 py-1 text-[11px] font-medium leading-snug text-canvas shadow-pop"
    style:left="{pos.left}px"
    style:top="{pos.top}px"
    style:visibility={pos.top === -9999 ? 'hidden' : 'visible'}
    style:transform-origin={pos.origin}
  >
    {text}
  </div>
{/if}
