<script lang="ts">
  import { Plus, Clock, CalendarDays, X } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import {
    startOfToday,
    endOfIsoWeek,
    addDays,
    isoWeek,
    dueLabel,
    dueTooltip,
    toDateInput,
    fromDateInput,
  } from '$lib/date';

  let { tabId, tabName }: { tabId: string; tabName: string } = $props();
  let value = $state('');
  let due = $state<number | null>(null);
  let pickerOpen = $state(false);
  let input = $state<HTMLInputElement | null>(null);

  // autofocus the field right after a new tab is created
  $effect(() => {
    if (input && notab.focusComposerFor === tabId) {
      input.focus();
      notab.focusComposerFor = null;
    }
  });

  type Preset = { label: string; at: () => number };
  const presets: Preset[] = [
    { label: 'I dag', at: () => startOfToday() },
    { label: 'Denne uka', at: () => endOfIsoWeek() },
    { label: '+1 uke', at: () => addDays(startOfToday(), 7) },
    { label: '+2 uker', at: () => addDays(startOfToday(), 14) },
    { label: 'Neste måned', at: () => addDays(startOfToday(), 30) },
  ];

  const chosenLabel = $derived(due != null ? dueLabel(due) : null);

  function pick(ts: number) {
    due = due === ts ? null : ts;
  }

  async function submit() {
    const text = value.trim();
    if (!text) return;
    value = '';
    const carry = due;
    due = null;
    pickerOpen = false;
    await notab.addNote(tabId, text, { dueDate: carry });
    input?.focus();
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void submit();
    }
  }
</script>

<div class="flex flex-col px-4 py-3">
  <div class="flex items-center gap-2">
    <div
      class="flex flex-1 items-center gap-2 rounded-xl border border-border bg-surface pr-3 pl-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20"
    >
      <button
        class="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors"
        class:text-accent={due != null || pickerOpen}
        class:text-ink-faint={due == null && !pickerOpen}
        class:hover:bg-surface-sunken={true}
        title={due != null ? dueTooltip(due) : 'Sett frist'}
        aria-label="Sett frist"
        aria-expanded={pickerOpen}
        onclick={() => (pickerOpen = !pickerOpen)}
      >
        <Clock size={16} />
      </button>

      {#if chosenLabel}
        <span class="shrink-0 text-[11px] font-semibold text-accent tabular-nums">
          {chosenLabel}
        </span>
      {/if}

      <input
        bind:this={input}
        bind:value
        {onkeydown}
        placeholder={`Legg til noe for ${tabName}…`}
        class="min-w-0 flex-1 bg-transparent py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint"
      />
    </div>

    <button
      class="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink transition-[filter] hover:brightness-105 disabled:opacity-40"
      disabled={!value.trim()}
      onclick={submit}
    >
      <Plus size={15} />
      Legg til
    </button>
  </div>

  <!-- deadline bar: grows out from the clock (left → right) -->
  <div
    class="grid transition-[grid-template-rows] duration-300 ease-soft"
    style:grid-template-rows={pickerOpen ? '1fr' : '0fr'}
  >
    <div class="overflow-hidden">
      <div
        class={[
          'mt-2 ml-0.5 flex flex-wrap items-center gap-1.5 origin-left transition-[opacity,filter,transform] duration-300 ease-soft',
          pickerOpen ? 'opacity-100 blur-0 translate-x-0' : 'opacity-0 blur-[3px] -translate-x-2',
        ].join(' ')}
        style:clip-path={pickerOpen ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)'}
        style:transition-property="opacity, filter, transform, clip-path"
      >
        {#each presets as p (p.label)}
          {@const ts = p.at()}
          <button
            class={[
              'rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors',
              due === ts
                ? 'bg-accent text-accent-ink'
                : 'bg-surface-sunken text-ink-soft hover:bg-border/60 hover:text-ink',
            ].join(' ')}
            onclick={() => pick(ts)}
          >
            {p.label}
          </button>
        {/each}

        <label
          class="flex items-center gap-1 rounded-lg bg-surface-sunken px-2 py-1 text-[12px] font-medium text-ink-soft hover:bg-border/60 hover:text-ink"
          title="Egendefinert dato"
        >
          <CalendarDays size={13} />
          <input
            type="date"
            class="w-[7.5rem] bg-transparent text-ink outline-none [color-scheme:light] dark:[color-scheme:dark]"
            value={toDateInput(due)}
            onchange={(e) => (due = fromDateInput(e.currentTarget.value))}
          />
        </label>

        {#if due != null}
          <button
            class="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-faint hover:text-danger"
            onclick={() => (due = null)}
          >
            <X size={12} /> Fjern
          </button>
        {/if}

        <span class="ml-auto pr-1 text-[11px] text-ink-faint">uke {isoWeek()}</span>
      </div>
    </div>
  </div>
</div>
