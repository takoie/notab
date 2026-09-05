<script lang="ts">
  import Modal from './ui/Modal.svelte';
  import { Copy, Check, Users } from '@lucide/svelte';
  import type { Tab } from '$lib/types';
  import { session } from '$lib/stores/session.svelte';
  import { convexConfigured } from '$lib/convex.svelte';
  import * as sharing from '$lib/sharing';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { notab } from '$lib/stores/notab.svelte';

  let { open = $bindable(false), tab }: { open?: boolean; tab: Tab | null } = $props();

  let code = $state('');
  let members = $state<sharing.Member[]>([]);
  let joinCode = $state('');
  let busy = $state(false);
  let copied = $state(false);

  const canShare = $derived(convexConfigured && session.signedIn);

  $effect(() => {
    if (open && tab) {
      code = tab.shareCode ?? '';
      if (tab.shareCode && canShare) void refreshMembers();
    }
  });

  async function refreshMembers() {
    if (!tab) return;
    try {
      members = await sharing.listMembers(tab.id);
    } catch {
      members = [];
    }
  }

  async function generate() {
    if (!tab) return;
    busy = true;
    try {
      code = await sharing.createShareCode(tab.id);
      toasts.success('Delingskode laget');
      await refreshMembers();
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Kunne ikke lage kode');
    } finally {
      busy = false;
    }
  }

  async function revoke() {
    if (!tab) return;
    busy = true;
    try {
      await sharing.revokeShareCode(tab.id);
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
      const cid = await sharing.joinByCode(joinCode);
      notab.activeTabId = cid;
      joinCode = '';
      toasts.success('Ble med i fanen');
      open = false;
    } catch (e) {
      toasts.error(e instanceof Error ? e.message : 'Ugyldig kode');
    } finally {
      busy = false;
    }
  }

  async function kick(userId: string) {
    if (!tab) return;
    await sharing.removeMember(tab.id, userId);
    await refreshMembers();
  }
</script>

<Modal title="Del fane" bind:open>
  {#if !canShare}
    <p class="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-ink-soft">
      Du må være innlogget (og ha Convex satt opp) for å dele faner.
    </p>
  {:else if tab}
    <section class="space-y-2">
      <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        {tab.name}
      </h3>
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
          Del denne koden. Andre limer den inn under for å få fanen.
        </p>
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
    </section>
  {/if}

  {#if canShare}
    <section class="space-y-2 border-t border-border pt-4">
      <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        Bli med i en delt fane
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
