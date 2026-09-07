<script lang="ts">
  import { Trash2 } from '@lucide/svelte';
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
  let tabId = $state<string | null>(null);
  let color = $state<string | null>(null);
  let busy = $state(false);

  let delBtn = $state<HTMLButtonElement | undefined>();
  let confirmOpen = $state(false);

  const tabOptions = $derived([
    ...notab.visibleTabs.map((t) => ({ value: t.id, label: t.name })),
    { value: '', label: 'Ingen — bare lokalt (synkes ikke)' },
  ]);

  // (re)load fields whenever the dialog opens
  $effect(() => {
    if (!open) return;
    const ev = eventId ? notab.getEvent(eventId) : undefined;
    title = ev?.title ?? '';
    startTs = ev?.startDate ?? defaultDate ?? startOfToday();
    endTs = ev?.endDate ?? defaultDate ?? startOfToday();
    // new events default to the current tab so they sync + get backed up
    tabId = ev
      ? ev.tabId
      : (notab.activeTab?.id ?? notab.visibleTabs[0]?.id ?? null);
    color = ev?.color ?? null;
  });

  async function save() {
    if (busy || !title.trim()) return;
    busy = true;
    try {
      if (eventId) {
        await notab.updateEvent(eventId, {
          title: title.trim(),
          startDate: startTs,
          endDate: endTs,
          tabId,
          color,
        });
      } else {
        await notab.addEvent({
          title: title.trim(),
          startDate: startTs,
          endDate: endTs,
          tabId,
          color,
        });
      }
      if (!tabId) {
        toasts.push(
          'Hendelsen er ikke koblet til en fane — den lagres bare på denne enheten.',
          'info',
          5000,
        );
      }
      open = false;
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Kunne ikke lagre hendelsen');
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!eventId) return;
    await notab.deleteEvent(eventId);
    open = false;
  }
</script>

<Modal title={editing ? 'Rediger hendelse' : 'Ny hendelse'} bind:open>
  <div class="space-y-3">
    <input
      class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14px] font-medium text-ink outline-none focus:border-accent"
      placeholder="Tittel"
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
          class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent [color-scheme:light] dark:[color-scheme:dark]"
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
          class="mt-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent [color-scheme:light] dark:[color-scheme:dark]"
          value={toDateInput(endTs)}
          onchange={(e) => {
            const v = fromDateInput(e.currentTarget.value);
            if (v != null) endTs = v;
          }}
        />
      </label>
    </div>

    <div class="text-[12px] text-ink-soft">
      Fane
      <Select
        value={tabId ?? ''}
        options={tabOptions}
        label="Fane"
        class="mt-1 w-full"
        onChange={(v) => (tabId = v || null)}
      />
      <p class="mt-1 text-[11px] text-ink-faint">
        En hendelse må kobles til en fane for å synkroniseres og sikkerhets­kopieres.
        «Ingen» lagres bare på denne enheten.
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-[12px] text-ink-soft">Farge</span>
      {#each PALETTE as c (c ?? 'none')}
        <button
          type="button"
          class="grid h-5 w-5 place-items-center rounded-full border border-border transition-transform hover:scale-110"
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
    {#if editing}
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
      Avbryt
    </button>
    <button
      type="button"
      class="rounded-lg bg-accent px-4 py-1.5 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
      disabled={busy || !title.trim()}
      onclick={save}
    >
      {editing ? 'Lagre' : 'Legg til'}
    </button>
  {/snippet}
</Modal>

<ConfirmMenu
  anchor={delBtn}
  bind:open={confirmOpen}
  message="Slette denne hendelsen?"
  confirmLabel="Slett"
  onconfirm={remove}
/>
