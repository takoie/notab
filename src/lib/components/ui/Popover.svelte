<script lang="ts">
  import type { Snippet } from 'svelte';
  import { tick } from 'svelte';
  import { portal } from '$lib/actions/portal';
  import { computePosition, type Placement } from '$lib/popover';
  import { cn } from '$lib/cn';

  let {
    anchor,
    open = $bindable(false),
    placement = 'bottom-start',
    class: klass = '',
    label,
    onclose,
    children,
  }: {
    /** element the panel sprouts from */
    anchor: HTMLElement | undefined | null;
    open?: boolean;
    placement?: Placement;
    class?: string;
    label?: string;
    onclose?: () => void;
    children: Snippet;
  } = $props();

  let panelEl = $state<HTMLDivElement | null>(null);
  let pos = $state({ left: 0, top: -9999, origin: 'left top' });

  function reposition() {
    if (!anchor || !panelEl) return;
    const a = anchor.getBoundingClientRect();
    const r = computePosition(
      { x: a.x, y: a.y, width: a.width, height: a.height },
      { width: panelEl.offsetWidth, height: panelEl.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
      placement,
    );
    pos = { left: r.left, top: r.top, origin: r.origin };
  }

  function close() {
    if (!open) return;
    open = false;
    onclose?.();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  }

  function onPointerdown(e: Event) {
    const t = e.target as Node;
    if (panelEl && !panelEl.contains(t) && anchor && !anchor.contains(t)) close();
  }

  $effect(() => {
    if (!open) return;
    pos = { left: 0, top: -9999, origin: 'left top' };
    void tick().then(reposition);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('keydown', onKeydown, true);
    window.addEventListener('pointerdown', onPointerdown, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('keydown', onKeydown, true);
      window.removeEventListener('pointerdown', onPointerdown, true);
    };
  });
</script>

{#if open}
  <div
    bind:this={panelEl}
    use:portal
    role="dialog"
    aria-label={label}
    class={cn(
      'notab-popover fixed z-[60] min-w-[10rem] rounded-[14px] border border-border bg-surface-raised p-1.5 text-[13px] text-ink shadow-pop ring-1 ring-black/[0.04] dark:ring-white/[0.04]',
      klass,
    )}
    style:left="{pos.left}px"
    style:top="{pos.top}px"
    style:visibility={pos.top === -9999 ? 'hidden' : 'visible'}
    style:transform-origin={pos.origin}
  >
    {@render children()}
  </div>
{/if}
