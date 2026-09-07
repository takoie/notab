<script lang="ts">
  import { sanitizeHtml } from '$lib/richtext';
  import { hasMath, renderMathIn } from '$lib/math';
  import { cn } from '$lib/cn';

  let {
    html,
    interactive = false,
    onchange,
    class: klass = '',
  }: {
    html: string;
    /** allow ticking checklist items in place */
    interactive?: boolean;
    onchange?: (html: string) => void;
    class?: string;
  } = $props();

  const safe = $derived(sanitizeHtml(html));
  let el = $state<HTMLDivElement | undefined>();

  // render any LaTeX once the sanitised HTML is in the DOM
  $effect(() => {
    const src = safe;
    const node = el;
    if (node && hasMath(src)) queueMicrotask(() => void renderMathIn(node));
  });

  function onClick(e: MouseEvent) {
    if (!interactive || !onchange || !el) return;
    const target = e.target as HTMLElement;
    const li = target.closest('li');
    if (!li || !li.parentElement?.hasAttribute('data-checklist')) return;
    if (e.offsetX > 22) return;
    e.preventDefault();

    // toggle the matching <li> in a fresh parse of the *stored* html, so KaTeX
    // markup rendered into the live DOM never gets written back
    const rendered = Array.from(el.querySelectorAll('ul[data-checklist] > li'));
    const idx = rendered.indexOf(li);
    if (idx < 0) return;
    const doc = new DOMParser().parseFromString(sanitizeHtml(html), 'text/html');
    const src = doc.querySelectorAll('ul[data-checklist] > li')[idx];
    if (!src) return;
    src.toggleAttribute('data-checked');
    onchange(doc.body.innerHTML);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  bind:this={el}
  class={cn('rich-body text-[13px] leading-relaxed text-ink-soft', klass)}
  onclick={onClick}
>
  {@html safe}
</div>
