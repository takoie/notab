<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { focusOnMount } from '$lib/actions/focus';
  import Popover from '../ui/Popover.svelte';
  import Select from '../ui/Select.svelte';

  let {
    anchor,
    open = $bindable(false),
    ts,
  }: { anchor: HTMLElement | undefined; open?: boolean; ts: number } = $props();

  let title = $state('');
  let tabId = $state<string | undefined>(undefined);
  let busy = $state(false);

  const tabOptions = $derived(
    notab.visibleTabs.map((t) => ({ value: t.id, label: t.name })),
  );

  // default to the first visible tab the first time the popover opens
  $effect(() => {
    if (open && !notab.visibleTabs.some((t) => t.id === tabId)) {
      tabId = notab.visibleTabs[0]?.id;
    }
  });

  async function submit() {
    const t = title.trim();
    if (busy || !t || !tabId) return;
    busy = true;
    try {
      await notab.addNote(tabId, t, { dueDate: ts, kind: 'small' });
      title = '';
      open = false;
    } finally {
      busy = false;
    }
  }
</script>

<Popover {anchor} bind:open placement="bottom-start" label="Nytt notat" class="w-64 space-y-2 p-2.5">
  <input
    class="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none ring-accent/40 focus:ring-1"
    placeholder="Nytt notat …"
    bind:value={title}
    use:focusOnMount={true}
    onkeydown={(e) => {
      if (e.key === 'Enter') submit();
    }}
  />
  <Select
    bind:value={tabId}
    options={tabOptions}
    label="Fane"
    placeholder="Velg fane …"
    class="w-full"
  />
  <button
    type="button"
    class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink transition-[filter] hover:brightness-105 disabled:opacity-40"
    disabled={!title.trim() || !tabId || busy}
    onclick={submit}
  >
    <Plus size={14} /> Legg til
  </button>
</Popover>
