<script lang="ts">
  import { sanitizeHtml } from '$lib/richtext';
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

  function onClick(e: MouseEvent) {
    if (!interactive || !onchange) return;
    const target = e.target as HTMLElement;
    const li = target.closest('li');
    if (!li || !li.parentElement?.hasAttribute('data-checklist')) return;
    if (e.offsetX > 22) return;
    e.preventDefault();
    li.toggleAttribute('data-checked');
    const root = li.closest('.rich-body') as HTMLElement | null;
    if (root) onchange(root.innerHTML);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class={cn('rich-body text-[13px] leading-relaxed text-ink-soft', klass)} onclick={onClick}>
  {@html safe}
</div>
