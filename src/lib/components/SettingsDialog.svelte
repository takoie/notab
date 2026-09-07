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
  import { inTauri, openExternal } from '$lib/tauri';
  import { checkForUpdate } from '$lib/updater';
  import { CHANGELOG } from '$lib/changelog';
  import { LICENSES } from '$lib/licenses';
  import { RotateCcw, Trash2, ExternalLink } from '@lucide/svelte';
  import { cn } from '$lib/cn';
  import type { ThemePref } from '$lib/stores/theme.svelte';
  import type { ProofLang } from '$lib/stores/settings.svelte';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  type PageId = 'general' | 'security' | 'account' | 'archive' | 'updates' | 'licenses';
  const PAGES: { id: PageId; label: string }[] = [
    { id: 'general', label: 'Generelt' },
    { id: 'security', label: 'Sikkerhet' },
    { id: 'account', label: 'Konto' },
    { id: 'archive', label: 'Arkiv' },
    { id: 'updates', label: 'Oppdateringer' },
    { id: 'licenses', label: 'Lisenser' },
  ];
  let page = $state<PageId>('general');

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

  const appVersion = __APP_VERSION__;
  let checking = $state(false);

  async function lookForUpdate() {
    checking = true;
    try {
      await checkForUpdate();
    } finally {
      checking = false;
    }
  }
</script>

<Modal title="Innstillinger" bind:open size="lg">
  <div class="flex gap-4">
    <nav class="w-36 shrink-0 space-y-0.5">
      {#each PAGES as p (p.id)}
        <button
          class={cn(
            'flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors',
            page === p.id
              ? 'bg-accent-soft text-accent'
              : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
          )}
          onclick={() => (page = p.id)}
        >
          {p.label}
        </button>
      {/each}
    </nav>

    <div class="min-h-[18rem] max-h-[70vh] min-w-0 flex-1 space-y-4 overflow-y-auto pr-1">
      {#if page === 'general'}
        <section class="space-y-2">
          <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Tema</h3>
          <div class="flex gap-1.5">
            {#each THEME_OPTS as t (t.value)}
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
          <p class="text-[12px] text-ink-soft">
            Språk for stavekontroll i notatfelt. Velg «Av» for å slå den helt av.
            (Å legge til egne ord i ordlista styres av operativsystemet.)
          </p>
          <Select
            value={settings.proofLang}
            options={PROOF_LANGS}
            label="Korrekturspråk"
            class="w-full"
            onChange={(v) => settings.setProofLang(v as ProofLang)}
          />
        </section>
      {:else if page === 'security'}
        <section class="space-y-2">
          <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">PIN-lås</h3>
          {#if lock.enabled}
            <p class="text-[12px] text-ink-soft">
              Auto-lås etter inaktivitet. Du kan også låse fra tittellinja.
            </p>
            <div class="flex gap-1.5">
              {#each IDLE_CHOICES as m (m)}
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
      {:else if page === 'account'}
        <section class="space-y-2">
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
      {:else if page === 'archive'}
        <section class="space-y-2">
          <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
            Arkiverte faner
          </h3>
          {#if notab.archivedTabs.length > 0}
            <ul class="space-y-1">
              {#each notab.archivedTabs as t (t.id)}
                <li class="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                  {#if t.color}
                    <span
                      class="h-2.5 w-2.5 shrink-0 rounded-full"
                      style:background-color={t.color}
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
          {:else}
            <p class="text-[12px] text-ink-faint">Ingen arkiverte faner.</p>
          {/if}
        </section>
      {:else if page === 'updates'}
        <section class="space-y-3">
          <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">Om NotaB!</h3>
          <div class="flex items-center justify-between">
            <span class="text-[13px] text-ink-soft">
              Versjon <b class="text-ink">{appVersion}</b>
            </span>
            {#if inTauri}
              <button
                class="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken disabled:opacity-40"
                disabled={checking}
                onclick={lookForUpdate}
              >
                {checking ? 'Ser etter…' : 'Se etter oppdateringer'}
              </button>
            {/if}
          </div>
          <p class="text-[12px] text-ink-faint">
            Appen ser etter oppdateringer ved oppstart og varsler med en toast når en
            nyere versjon er klar.
          </p>
        </section>

        <section class="space-y-3 border-t border-border pt-4">
          <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
            Endringslogg
          </h3>
          {#each CHANGELOG as s (s.heading)}
            <div>
              <h4 class="text-[12px] font-semibold text-ink">{s.heading}</h4>
              <ul class="mt-1 list-disc space-y-1 pl-4 text-[12px] text-ink-soft">
                {#each s.bullets as b (b)}
                  <li>{b}</li>
                {/each}
              </ul>
            </div>
          {/each}
        </section>
      {:else if page === 'licenses'}
        <section class="space-y-2">
          <h3 class="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
            Åpen kildekode
          </h3>
          <p class="text-[12px] text-ink-soft">
            NotaB! er bygget med disse frie programvarebibliotekene. Takk til
            vedlikeholderne.
          </p>
          <ul class="space-y-1.5">
            {#each LICENSES as l (l.name)}
              <li class="rounded-lg border border-border px-2.5 py-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[13px] font-medium text-ink">{l.name}</span>
                  <span class="shrink-0 text-[11px] text-ink-faint">{l.license}</span>
                </div>
                {#if l.note}
                  <p class="mt-0.5 text-[11px] text-ink-faint">{l.note}</p>
                {/if}
                <button
                  class="mt-1 flex items-center gap-1 text-[11px] text-accent hover:underline"
                  onclick={() => openExternal(l.url)}
                >
                  <ExternalLink size={11} />{l.url}
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  </div>
</Modal>
