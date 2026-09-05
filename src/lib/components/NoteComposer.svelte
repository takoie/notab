<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';

  let { tabId, tabName }: { tabId: string; tabName: string } = $props();
  let value = $state('');
  let input = $state<HTMLInputElement | null>(null);

  async function submit() {
    const text = value.trim();
    if (!text) return;
    value = '';
    await notab.addNote(tabId, text);
    input?.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }
</script>

<div class="flex items-center gap-2 px-4 py-3">
  <div
    class="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
  >
    <input
      bind:this={input}
      bind:value
      {onkeydown}
      placeholder={`Legg til noe for ${tabName}…`}
      class="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
    />
  </div>
  <button
    class="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink transition-colors hover:brightness-105 disabled:opacity-40"
    disabled={!value.trim()}
    onclick={submit}
  >
    <Plus size={15} />
    Legg til
  </button>
</div>
