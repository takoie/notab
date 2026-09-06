<script lang="ts">
  import { toasts } from '$lib/stores/toasts.svelte';
  import { CircleAlert, CircleCheck, Info, X } from '@lucide/svelte';

  const icon = { info: Info, error: CircleAlert, success: CircleCheck };

  async function runAction(t: (typeof toasts.items)[number]) {
    if (!t.action) return;
    try {
      await t.action.run();
    } catch (err) {
      console.error('toast action failed', err);
    }
  }
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-3 z-[60] flex flex-col items-center gap-2 px-3">
  {#each toasts.items as t (t.id)}
    {@const Icon = icon[t.tone]}
    <div
      class="pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-[13px] shadow-card"
      class:text-danger={t.tone === 'error'}
      class:text-success={t.tone === 'success'}
    >
      <Icon size={16} class="mt-0.5 shrink-0" />
      <span class="flex-1 text-ink">{t.message}</span>
      {#if t.action}
        <button
          class="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[12px] font-medium text-accent-ink hover:brightness-110"
          onclick={() => runAction(t)}
        >
          {t.action.label}
        </button>
      {/if}
      <button class="text-ink-faint hover:text-ink" onclick={() => toasts.dismiss(t.id)}>
        <X size={14} />
      </button>
    </div>
  {/each}
</div>
