<script lang="ts">
  import Modal from '../ui/Modal.svelte';
  import ConfirmMenu from '../ui/ConfirmMenu.svelte';
  import { Copy, Check, Users, Trash2 } from '@lucide/svelte';
  import type { SharedCalendar } from '$lib/types';
  import { PALETTE } from '$lib/colors';
  import { session } from '$lib/stores/session.svelte';
  import { convexConfigured } from '$lib/convex.svelte';
  import * as cs from '$lib/calendarSharing';
  import type { Member } from '$lib/sharing';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { notab } from '$lib/stores/notab.svelte';

  let {
    open = $bindable(false),
    calendar,
  }: { open?: boolean; calendar: SharedCalendar | null } = $props();

  let code = $state('');
  let members = $state<Member[]>([]);
  let joinCode = $state('');
  let busy = $state(false);
  let copied = $state(false);
  let name = $state('');
  let delBtn = $state<HTMLButtonElement>();
  let confirmDel = $state(false);

  const canShare = $derived(convexConfigured && session.signedIn);
  const isOwner = $derived(!!calendar && !calendar.joined);

  $effect(() => {
    if (open && calendar) {
      code = calendar.shareCode ?? '';
      name = calendar.name;
      if (calendar.shareCode && canShare && isOwner) void refreshMembers();
    }
  });

  function commitName() {
    if (calendar && name.trim() && name.trim() !== calendar.name) {
      void notab.renameCalendar(calendar.id, name.trim());
    }
  }

  async function del() {
    if (!calendar) return;
    const id = calendar.id;
    open = false;
    if (calendar.joined) await cs.leaveCalendar(id);
    else await notab.deleteCalendar(id);
  }

  async function refreshMembers() {
    if (!calendar) return;
    try {
      members = await cs.listCalendarMembers(calendar.id);
    } catch {
      members = [];
    }
  }

  async function generate() {
    if (!calendar) return;
    busy = true;
    try {
      code = await cs.createCalendarShareCode(calendar.id);
      toasts.success('Delingskode laget');
      await refreshMembers();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Kunne ikke lage kode');
    } finally {
      busy = false;
    }
  }

  async function revoke() {
    if (!calendar) return;
    busy = true;
    try {
      await cs.revokeCalendarShareCode(calendar.id);
      code = '';
      members = [];
      toasts.success('Deling opphevet');
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Feil');
    } finally {
      busy = false;
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }

  async function join() {
    busy = true;
    try {
      await cs.joinCalendarByCode(joinCode);
      joinCode = '';
      toasts.success('Ble med i kalenderen');
      open = false;
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Ugyldig kode');
    } finally {
      busy = false;
    }
  }

  async function kick(userId: string) {
    if (!calendar) return;
    await cs.removeCalendarMember(calendar.id, userId);
    await refreshMembers();
  }

  function toggleAllowEdit(e: Event) {
    if (!calendar) return;
    void notab.setCalendarAllowEdit(calendar.id, (e.currentTarget as HTMLInputElement).checked);
  }
</script>

<Modal title="Del kalender" bind:open>
  {#if !canShare}
    <p class="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-ink-soft">
      Du må være innlogget (og ha Convex satt opp) for å dele kalendere.
    </p>
  {:else if calendar && isOwner}
    <section class="space-y-2">
      <input
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[14px] font-medium text-ink outline-none focus:border-accent"
        placeholder="Navn på kalenderen"
        bind:value={name}
        onblur={commitName}
        onkeydown={(e) => e.key === 'Enter' && commitName()}
      />

      <div class="flex flex-wrap items-center gap-1.5">
        <span class="mr-1 text-[12px] text-ink-soft">Farge</span>
        {#each PALETTE as c (c ?? 'none')}
          <button
            type="button"
            class="grid h-5 w-5 place-items-center rounded-full border border-border transition-transform hover:scale-110"
            class:ring-2={calendar.color === c}
            class:ring-accent={calendar.color === c}
            class:ring-offset-1={calendar.color === c}
            class:ring-offset-surface-raised={calendar.color === c}
            style:background-color={c ?? 'transparent'}
            aria-label={c ? `Farge ${c}` : 'Ingen farge'}
            onclick={() => calendar && notab.setCalendarColor(calendar.id, c)}
          >
            {#if c === null}<span class="text-[11px] leading-none text-ink-faint">×</span>{/if}
          </button>
        {/each}
      </div>

      {#if code}
        <div class="flex items-center gap-2">
          <code
            class="flex-1 rounded-lg border border-border bg-surface-sunken px-3 py-2 text-center text-[15px] font-semibold tracking-widest text-ink"
            >{code}</code
          >
          <button
            class="grid h-9 w-9 place-items-center rounded-lg border border-border text-ink-soft hover:bg-surface-sunken"
            onclick={copy}
          >
            {#if copied}<Check size={15} class="text-success" />{:else}<Copy size={15} />{/if}
          </button>
        </div>
        <p class="text-[12px] text-ink-faint">
          Del denne koden. Andre limer den inn under for å få kalenderen.
        </p>

        <label class="mt-1 flex items-center gap-2 text-[12px] text-ink-soft">
          <input type="checkbox" checked={calendar.allowMemberEdit} onchange={toggleAllowEdit} />
          La alle med koden legge til og endre hendelser
        </label>

        <button
          class="text-[12px] font-medium text-danger hover:underline"
          onclick={revoke}
          disabled={busy}>Opphev deling</button
        >

        {#if members.length}
          <div class="mt-3 space-y-1 border-t border-border pt-3">
            <p class="flex items-center gap-1.5 text-[12px] font-medium text-ink-soft">
              <Users size={13} /> Medlemmer
            </p>
            {#each members as m}
              <div class="flex items-center justify-between text-[13px]">
                <span class="text-ink">{m.username}</span>
                <button
                  class="text-[11px] text-ink-faint hover:text-danger"
                  onclick={() => kick(m.userId)}>Fjern</button
                >
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <button
          class="rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink disabled:opacity-40"
          onclick={generate}
          disabled={busy}
        >
          Lag delingskode
        </button>
      {/if}

      <button
        bind:this={delBtn}
        class="flex items-center gap-1 pt-1 text-[12px] font-medium text-danger hover:underline"
        onclick={() => (confirmDel = true)}
      >
        <Trash2 size={12} /> Slett kalenderen
      </button>
    </section>
  {:else if calendar}
    <section class="space-y-2">
      <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {calendar.name}
      </h3>
      <p class="text-[12px] text-ink-soft">
        Delt med deg av en annen.{calendar.allowMemberEdit
          ? ' Du kan legge til og endre hendelser.'
          : ' Skrivebeskyttet – bare eieren kan endre hendelser.'}
      </p>
      <button
        bind:this={delBtn}
        class="flex items-center gap-1 text-[12px] font-medium text-danger hover:underline"
        onclick={() => (confirmDel = true)}
      >
        <Trash2 size={12} /> Forlat kalenderen
      </button>
    </section>
  {/if}

  {#if canShare}
    <section class="space-y-2 border-t border-border pt-4">
      <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        Bli med i en delt kalender
      </h3>
      <div class="flex gap-2">
        <input
          class="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] tracking-widest outline-none focus:border-accent"
          placeholder="XXX-XXX-XXX"
          bind:value={joinCode}
        />
        <button
          class="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-ink-soft hover:bg-surface-sunken disabled:opacity-40"
          disabled={busy || joinCode.trim().length < 6}
          onclick={join}
        >
          Bli med
        </button>
      </div>
    </section>
  {/if}
</Modal>

<ConfirmMenu
  anchor={delBtn}
  bind:open={confirmDel}
  message={calendar?.joined ? 'Forlate denne kalenderen?' : 'Slette denne kalenderen for alle?'}
  confirmLabel={calendar?.joined ? 'Forlat' : 'Slett'}
  onconfirm={del}
/>
