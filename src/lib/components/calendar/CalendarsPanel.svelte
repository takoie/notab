<script lang="ts">
  import { Layers, Plus, Settings2, KeyRound } from '@lucide/svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { convexConfigured } from '$lib/convex.svelte';
  import { toasts } from '$lib/stores/toasts.svelte';
  import type { SharedCalendar } from '$lib/types';
  import Popover from '../ui/Popover.svelte';
  import CalendarShareDialog from './CalendarShareDialog.svelte';

  let btn = $state<HTMLButtonElement>();
  let open = $state(false);
  let manageOpen = $state(false);
  let manageTarget = $state<SharedCalendar | null>(null);

  const canShare = $derived(convexConfigured && session.signedIn);

  function manage(cal: SharedCalendar | null) {
    manageTarget = cal;
    manageOpen = true;
    open = false;
  }

  async function create() {
    if (!canShare) {
      toasts.push('Logg inn for å lage en delt kalender.');
      return;
    }
    const cal = await notab.createCalendar('Ny kalender');
    manage(notab.getCalendar(cal.id) ?? cal);
  }
</script>

<button
  bind:this={btn}
  type="button"
  class="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
  title="Kalendere"
  onclick={() => (open = !open)}
>
  <Layers size={14} /> Kalendere
</button>

<Popover anchor={btn} bind:open placement="bottom-end" label="Kalendere" class="w-72 p-2">
  <p class="px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
    Vis i kalenderen
  </p>

  <label class="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-[13px] text-ink">
    <input type="checkbox" checked disabled class="opacity-60" />
    <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-accent"></span>
    Personlig
  </label>

  {#each notab.visibleCalendars as cal (cal.id)}
    <div class="flex items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-surface-sunken">
      <label class="flex flex-1 items-center gap-2 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={!notab.hiddenCalendars[cal.id]}
          onchange={() => notab.toggleCalendarHidden(cal.id)}
        />
        <span
          class="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
          style:background-color={cal.color ?? 'transparent'}
        ></span>
        <span class="truncate">{cal.name}</span>
        {#if cal.joined && !cal.allowMemberEdit}
          <span class="text-[10px] text-ink-faint">(les)</span>
        {/if}
      </label>
      <button
        type="button"
        class="grid h-6 w-6 shrink-0 place-items-center rounded text-ink-faint hover:bg-surface hover:text-ink"
        title="Administrer"
        onclick={() => manage(cal)}
      >
        <Settings2 size={13} />
      </button>
    </div>
  {/each}

  <div class="mt-1 flex gap-1 border-t border-border pt-2">
    <button
      type="button"
      class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-2 py-1.5 text-[12px] font-semibold text-accent-ink disabled:opacity-40"
      onclick={create}
    >
      <Plus size={13} /> Ny delt kalender
    </button>
    <button
      type="button"
      class="flex items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken disabled:opacity-40"
      disabled={!canShare}
      onclick={() => manage(null)}
    >
      <KeyRound size={13} /> Bli med
    </button>
  </div>
</Popover>

<CalendarShareDialog bind:open={manageOpen} calendar={manageTarget} />
