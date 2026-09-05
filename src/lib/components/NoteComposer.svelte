<script lang="ts">
  import { Plus, CalendarDays, X } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import {
    startOfToday,
    endOfIsoWeek,
    isoWeek,
    dueTooltip,
    toDateInput,
    fromDateInput,
  } from '$lib/date';

  let { tabId, tabName }: { tabId: string; tabName: string } = $props();
  let value = $state('');
  let due = $state<number | null>(null);
  let input = $state<HTMLInputElement | null>(null);

  const thisWeek = isoWeek();

  // autofocus the field right after a new tab is created
  $effect(() => {
    if (input && notab.focusComposerFor === tabId) {
      input.focus();
      notab.focusComposerFor = null;
    }
  });

  async function submit() {
    const text = value.trim();
    if (!text) return;
    value = '';
    const carry = due;
    due = null;
    await notab.addNote(tabId, text, { dueDate: carry });
    input?.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }

  function toggle(ts: number) {
    due = due === ts ? null : ts;
  }
</script>

<div class="flex flex-col gap-2 px-4 py-3">
  <div class="flex items-center gap-2">
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

  <div class="flex flex-wrap items-center gap-1.5 pl-1 text-[12px]">
    <CalendarDays size={13} class="text-ink-faint" />
    <button
      class="rounded-lg px-2 py-1 font-medium transition-colors"
      class:bg-accent-soft={due === startOfToday()}
      class:text-accent={due === startOfToday()}
      class:text-ink-soft={due !== startOfToday()}
      class:hover:bg-surface-sunken={due !== startOfToday()}
      onclick={() => toggle(startOfToday())}
    >
      I dag
    </button>
    <button
      class="rounded-lg px-2 py-1 font-medium transition-colors"
      class:bg-accent-soft={due === endOfIsoWeek()}
      class:text-accent={due === endOfIsoWeek()}
      class:text-ink-soft={due !== endOfIsoWeek()}
      class:hover:bg-surface-sunken={due !== endOfIsoWeek()}
      onclick={() => toggle(endOfIsoWeek())}
    >
      Uke {thisWeek}
    </button>

    <label class="flex items-center gap-1 rounded-lg px-2 py-1 text-ink-soft hover:bg-surface-sunken">
      Frist
      <input
        type="date"
        class="bg-transparent text-ink outline-none [color-scheme:light] dark:[color-scheme:dark]"
        value={toDateInput(due)}
        onchange={(e) => (due = fromDateInput(e.currentTarget.value))}
      />
    </label>

    {#if due != null}
      <span
        class="ml-1 flex items-center gap-1 rounded-lg bg-accent-soft px-2 py-1 font-medium text-accent"
        title={dueTooltip(due)}
      >
        {dueTooltip(due)}
        <button class="hover:text-danger" aria-label="Fjern frist" onclick={() => (due = null)}>
          <X size={12} />
        </button>
      </span>
    {/if}
  </div>
</div>
