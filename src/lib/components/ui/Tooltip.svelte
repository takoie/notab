<script lang="ts">
  /**
   * App-wide themed replacement for native `title=""` tooltips. Mount once.
   * It watches for hovering any element with a `title`, temporarily removes the
   * attribute (so the OS chip never shows), and renders a styled chip instead.
   */
  import { portal } from '$lib/actions/portal';
  import { computePosition } from '$lib/popover';

  const DELAY = 450;

  let text = $state('');
  let visible = $state(false);
  let pos = $state({ left: 0, top: -9999, origin: 'left top' });
  let el = $state<HTMLDivElement | null>(null);

  let currentTarget: HTMLElement | null = null;
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

  function hide() {
    clearTimeout(timer);
    visible = false;
    if (currentTarget && stashed != null && !currentTarget.hasAttribute('title')) {
      currentTarget.setAttribute('title', stashed);
    }
    currentTarget = null;
    stashed = null;
  }

  function place() {
    if (!el || !currentTarget) return;
    const a = currentTarget.getBoundingClientRect();
    pos = computePosition(
      { x: a.x, y: a.y, width: a.width, height: a.height },
      { width: el.offsetWidth, height: el.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      'bottom',
    );
  }

  function onOver(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    const t = titledAncestor(e.target);
    if (t === currentTarget) return;
    hide();
    if (!t) return;
    currentTarget = t;
    stashed = t.getAttribute('title');
    text = stashed ?? '';
    t.removeAttribute('title');
    timer = setTimeout(() => {
      if (!currentTarget) return;
      visible = true;
      pos = { left: 0, top: -9999, origin: 'left top' };
      queueMicrotask(place);
    }, DELAY);
  }
</script>

<svelte:window
  onpointerover={onOver}
  onpointerdown={hide}
  onwheel={hide}
  onblur={hide}
  onkeydown={(e) => e.key === 'Escape' && hide()}
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
