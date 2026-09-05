<script lang="ts">
  import { Clock, CalendarDays, X } from '@lucide/svelte';
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

  let {
    value = $bindable(null),
    align = 'left',
  }: { value?: number | null; align?: 'left' | 'right' } = $props();

  let open = $state(false);

  const presets: { label: string; at: () => number }[] = [
    { label: 'I dag', at: () => startOfToday() },
    { label: 'Denne uka', at: () => endOfIsoWeek() },
    { label: '+1 uke', at: () => addDays(startOfToday(), 7) },
    { label: '+2 uker', at: () => addDays(startOfToday(), 14) },
    { label: 'Neste måned', at: () => addDays(startOfToday(), 30) },
  ];

  const chosenLabel = $derived(value != null ? dueLabel(value) : null);

  function pick(ts: number) {
    value = value === ts ? null : ts;
  }
</script>

<div class="flex flex-col">
  <button
    type="button"
    class="flex h-8 items-center gap-1.5 self-start rounded-lg px-1.5 transition-colors"
    class:text-accent={value != null || open}
    class:text-ink-faint={value == null && !open}
    class:hover:bg-surface-sunken={true}
    title={value != null ? dueTooltip(value) : 'Sett frist'}
    aria-label="Sett frist"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <Clock size={16} />
    {#if chosenLabel}
      <span class="text-[11px] font-semibold tabular-nums">{chosenLabel}</span>
    {/if}
  </button>

  <div
    class="grid transition-[grid-template-rows] duration-300 ease-soft"
    style:grid-template-rows={open ? '1fr' : '0fr'}
  >
    <div class="overflow-hidden">
      <div
        class={[
          'mt-2 flex flex-wrap items-center gap-1.5 transition-[opacity,filter,transform,clip-path] duration-300 ease-soft',
          align === 'right' ? 'justify-end' : '',
          open ? 'opacity-100 blur-0 translate-x-0' : 'opacity-0 blur-[3px] -translate-x-2',
        ].join(' ')}
        style:clip-path={open ? 'inset(0 0 0 0)' : `inset(0 ${align === 'right' ? '0 0 100%' : '100% 0 0'})`}
        style:transition-property="opacity, filter, transform, clip-path"
      >
        {#each presets as p (p.label)}
          {@const ts = p.at()}
          <button
            type="button"
            class={[
              'rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors',
              value === ts
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
            value={toDateInput(value)}
            onchange={(e) => (value = fromDateInput(e.currentTarget.value))}
          />
        </label>

        {#if value != null}
          <button
            type="button"
            class="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-ink-faint hover:text-danger"
            onclick={() => (value = null)}
          >
            <X size={12} /> Fjern
          </button>
        {/if}

        <span class="ml-auto pr-1 text-[11px] text-ink-faint">uke {isoWeek()}</span>
      </div>
    </div>
  </div>
</div>
