<script lang="ts">
  import { Trash2, Lock } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { startOfToday, toDateInput, fromDateInput } from '$lib/date';
  import { PALETTE } from '$lib/colors';
  import Modal from '../ui/Modal.svelte';
  import Select from '../ui/Select.svelte';
  import ConfirmMenu from '../ui/ConfirmMenu.svelte';

  let {
    open = $bindable(false),
    eventId = null,
    defaultDate,
  }: { open?: boolean; eventId?: string | null; defaultDate?: number } = $props();

  const editing = $derived(eventId != null);

  let title = $state('');
  let startTs = $state<number>(startOfToday());
  let endTs = $state<number>(startOfToday());
  // '' = personal · 'tab:<id>' = fane · 'cal:<id>' = delt kalender
  let where = $state<string>('');
  let color = $state<string | null>(null);
  let busy = $state(false);
  // the loaded event belongs to a shared calendar this user may not edit
  let readOnly = $state(false);

  let delBtn = $state<HTMLButtonElement | undefined>();
  let confirmOpen = $state(false);

  const whereOptions = $derived([
    { value: '', label: 'Ingen (personlig)' },
    ...notab.visibleCalendars
      .filter((c) => notab.canEditCalendar(c.id))
      .map((c) => ({ value: `cal:${c.id}`, label: `Kalender: ${c.name}` })),
    ...notab.visibleTabs.map((t) => ({ value: `tab:${t.id}`, label: `Fane: ${t.name}` })),
  ]);

  const target = $derived.by(() => {
    if (where.startsWith('cal:')) return { tabId: null as string | null, calId: where.slice(4) };
    if (where.startsWith('tab:')) return { tabId: where.slice(4), calId: null as string | null };
    return { tabId: null as string | null, calId: null as string | null };
  });

  const whereHint = $derived(
    where.startsWith('cal:')
      ? 'Deles med alle som har koden til denne kalenderen.'
      : where.startsWith('tab:')
        ? 'Deles med alle som har fanen.'
        : 'Synkroniseres til profilen din (ikke delt med andre).',
  );

  // (re)load fields whenever the dialog opens
  $effect(() => {
    if (!open) return;
    const ev = eventId ? notab.getEvent(eventId) : undefined;
    title = ev?.title ?? '';
    startTs = ev?.startDate ?? defaultDate ?? startOfToday();
    endTs = ev?.endDate ?? defaultDate ?? startOfToday();
    where = ev?.calId ? `cal:${ev.calId}` : ev?.tabId ? `tab:${ev.tabId}` : '';
    color = ev?.color ?? null;
    readOnly = !!ev?.calId && !notab.canEditCalendar(ev.calId);
  });

  async function save() {
    if (busy || readOnly || !title.trim()) return;
    busy = true;
    try {
      const fields = {
        title: title.trim(),
        startDate: startTs,
        endDate: endTs,
        tabId: target.tabId,
        calId: target.calId,
        color,
      };
      if (eventId) await notab.updateEvent(eventId, fields);
      else await notab.addEvent(fields);
      open = false;
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Kunne ikke lagre hendelsen');
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!eventId || readOnly) return;
    await notab.deleteEvent(eventId);
    open = false;
  }
</script>

<Modal title={editing ? 'Rediger hendelse' : 'Ny hendelse'} bind:open>
  <div class="space-y-3">
    {#if readOnly}
      <div
        class="flex items-center gap-2 rounded-lg bg-surface-sunken px-3 py-2 text-[12px] text-ink-soft"
      >
        <Lock size={13} class="shrink-0" />
        Denne hendelsen tilhører en skrivebeskyttet delt kalender.
      </div>
    {/if}

    <input
      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14px] font-medium text-ink outline-none focus:border-accent disabled:opacity-60"
      placeholder="Tittel"
      disabled={readOnly}
      bind:value={title}
      onkeydown={(e) => {
        if (e.key === 'Enter') save();
      }}
    />

    <div class="flex gap-2">
      <label class="flex-1 text-[12px] text-ink-soft">
        Fra
        <input
          type="date"
          class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]"
          disabled={readOnly}
          value={toDateInput(startTs)}
          onchange={(e) => {
            const v = fromDateInput(e.currentTarget.value);
            if (v != null) {
              startTs = v;
              if (endTs < v) endTs = v;
            }
          }}
        />
      </label>
      <label class="flex-1 text-[12px] text-ink-soft">
        Til
        <input
          type="date"
          class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]"
          disabled={readOnly}
          value={toDateInput(endTs)}
          onchange={(e) => {
            const v = fromDateInput(e.currentTarget.value);
            if (v != null) endTs = v;
          }}
        />
      </label>
    </div>

    <div class="text-[12px] text-ink-soft">
      Kalender / fane
      <Select
        value={where}
        options={whereOptions}
        label="Kalender / fane"
        disabled={readOnly}
        class="mt-1 w-full"
        onChange={(v) => (where = v)}
      />
      <p class="mt-1 text-[11px] text-ink-faint">{whereHint}</p>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-[12px] text-ink-soft">Farge</span>
      {#each PALETTE as c (c ?? 'none')}
        <button
          type="button"
          disabled={readOnly}
          class="grid h-5 w-5 place-items-center rounded-full border border-border transition-transform hover:scale-110 disabled:opacity-50 disabled:hover:scale-100"
          class:ring-2={color === c}
          class:ring-accent={color === c}
          class:ring-offset-1={color === c}
          class:ring-offset-surface-raised={color === c}
          style:background-color={c ?? 'transparent'}
          aria-label={c ? `Farge ${c}` : 'Ingen farge'}
          onclick={() => (color = c)}
        >
          {#if c === null}<span class="text-[11px] leading-none text-ink-faint">×</span>{/if}
        </button>
      {/each}
    </div>
  </div>

  {#snippet footer()}
    {#if editing && !readOnly}
      <button
        bind:this={delBtn}
        type="button"
        class="mr-auto flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-danger hover:bg-danger/10"
        onclick={() => (confirmOpen = true)}
      >
        <Trash2 size={13} /> Slett
      </button>
    {/if}
    <button
      type="button"
      class="rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-ink-soft hover:bg-surface-sunken"
      onclick={() => (open = false)}
    >
      {readOnly ? 'Lukk' : 'Avbryt'}
    </button>
    {#if !readOnly}
      <button
        type="button"
        class="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
        disabled={busy || !title.trim()}
        onclick={save}
      >
        {editing ? 'Lagre' : 'Legg til'}
      </button>
    {/if}
  {/snippet}
</Modal>

<ConfirmMenu
  anchor={delBtn}
  bind:open={confirmOpen}
  message="Slette denne hendelsen?"
  confirmLabel="Slett"
  onconfirm={remove}
/>
