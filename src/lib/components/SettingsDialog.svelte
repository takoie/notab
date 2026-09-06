<script lang="ts">
  import Modal from './ui/Modal.svelte';
  import Select from './ui/Select.svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { logout } from '$lib/auth';
  import { isValidPin } from '$lib/crypto';
  import { notab } from '$lib/stores/notab.svelte';
  import { settings, PROOF_LANGS } from '$lib/stores/settings.svelte';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { RotateCcw, Trash2 } from '@lucide/svelte';
  import type { ThemePref } from '$lib/stores/theme.svelte';
  import type { ProofLang } from '$lib/stores/settings.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let newPin = $state('');
  let confirmPin = $state('');
  let currentPin = $state('');

  const IDLE_CHOICES = [5, 15, 30, 0];
  const THEME_OPTS: { value: ThemePref; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Lyst' },
    { value: 'dark', label: 'Mørkt' },
  ];

  async function savePin() {
    if (!isValidPin(newPin)) return toasts.error('PIN må være 4–6 siffer');
    if (newPin !== confirmPin) return toasts.error('PIN-kodene er ikke like');
    await lock.setPin(newPin);
    newPin = confirmPin = '';
    toasts.success('PIN-kode lagret');
  }

  async function removePin() {
    const ok = await lock.disablePin(currentPin);
    currentPin = '';
    if (ok) toasts.success('PIN-lås slått av');
    else toasts.error('Feil PIN-kode');
  }

  async function doLogout() {
    await logout();
    toasts.success('Logget ut');
    open = false;
  }
</script>

<Modal title="Innstillinger" bind:open>
  <section class="space-y-2">
    <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Tema</h3>
    <div class="flex gap-1.5">
      {#each THEME_OPTS as t}
        <button
          class="flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium"
          class:border-accent={theme.pref === t.value}
          class:text-accent={theme.pref === t.value}
          class:border-border={theme.pref !== t.value}
          class:text-ink-soft={theme.pref !== t.value}
          onclick={() => theme.set(t.value)}
        >
          {t.label}
        </button>
      {/each}
    </div>
  </section>

  <section class="space-y-2 border-t border-border pt-4">
    <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
      Korrekturspråk
    </h3>
    <p class="text-[12px] text-ink-soft">Språk for stavekontroll i notatfelt.</p>
    <Select
      value={settings.proofLang}
      options={PROOF_LANGS}
      label="Korrekturspråk"
      class="w-full"
      onChange={(v) => settings.setProofLang(v as ProofLang)}
    />
  </section>

  <section class="space-y-2 border-t border-border pt-4">
    <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
      PIN-lås
    </h3>
    {#if lock.enabled}
      <p class="text-[12px] text-ink-soft">
        Auto-lås etter inaktivitet. Du kan også låse fra tittellinja.
      </p>
      <div class="flex gap-1.5">
        {#each IDLE_CHOICES as m}
          <button
            class="flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium"
            class:border-accent={lock.idleMinutes === m}
            class:text-accent={lock.idleMinutes === m}
            class:border-border={lock.idleMinutes !== m}
            class:text-ink-soft={lock.idleMinutes !== m}
            onclick={() => lock.setIdleMinutes(m)}
          >
            {m === 0 ? 'Aldri' : `${m} min`}
          </button>
        {/each}
      </div>
      <div class="mt-2 flex gap-2">
        <input
          class="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          type="password"
          inputmode="numeric"
          maxlength="6"
          placeholder="Nåværende PIN"
          bind:value={currentPin}
        />
        <button
          class="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-danger hover:bg-danger/10"
          onclick={removePin}
        >
          Slå av
        </button>
      </div>
    {:else}
      <div class="flex gap-2">
        <input
          class="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          type="password"
          inputmode="numeric"
          maxlength="6"
          placeholder="Ny PIN (4–6 siffer)"
          bind:value={newPin}
        />
        <input
          class="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[13px] outline-none focus:border-accent"
          type="password"
          inputmode="numeric"
          maxlength="6"
          placeholder="Bekreft"
          bind:value={confirmPin}
        />
      </div>
      <button
        class="mt-1 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-ink disabled:opacity-40"
        disabled={!newPin || !confirmPin}
        onclick={savePin}
      >
        Lagre PIN
      </button>
    {/if}
  </section>

  {#if notab.archivedTabs.length > 0}
    <section class="space-y-2 border-t border-border pt-4">
      <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Arkiv</h3>
      <ul class="space-y-1">
        {#each notab.archivedTabs as t (t.id)}
          <li class="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
            {#if t.color}
              <span class="h-2.5 w-2.5 shrink-0 rounded-full" style:background-color={t.color}
              ></span>
            {/if}
            <span class="flex-1 truncate text-[13px] text-ink">{t.name}</span>
            <button
              class="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
              onclick={() => notab.unarchiveTab(t.id)}
            >
              <RotateCcw size={13} /> Gjenopprett
            </button>
            <button
              class="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-faint hover:text-danger"
              onclick={() => notab.deleteTab(t.id)}
            >
              <Trash2 size={13} /> Slett
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <section class="space-y-2 border-t border-border pt-4">
    <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Konto</h3>
    {#if session.signedIn}
      <div class="flex items-center justify-between">
        <span class="text-[13px] text-ink">Innlogget som <b>{session.username}</b></span>
        <button
          class="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken"
          onclick={doLogout}
        >
          Logg ut
        </button>
      </div>
    {:else}
      <p class="text-[12px] text-ink-faint">Ikke innlogget. Faner lagres bare lokalt.</p>
    {/if}
  </section>
</Modal>
