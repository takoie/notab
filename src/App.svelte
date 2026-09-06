<script lang="ts">
  import { onMount } from 'svelte';
  import TitleBar from '$lib/components/TitleBar.svelte';
  import TabBar from '$lib/components/TabBar.svelte';
  import NoteComposer from '$lib/components/NoteComposer.svelte';
  import SortMenu from '$lib/components/SortMenu.svelte';
  import NoteList from '$lib/components/NoteList.svelte';
  import LockScreen from '$lib/components/LockScreen.svelte';
  import AuthView from '$lib/components/AuthView.svelte';
  import SettingsDialog from '$lib/components/SettingsDialog.svelte';
  import ShareDialog from '$lib/components/ShareDialog.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import ImageLightbox from '$lib/components/ImageLightbox.svelte';
  import SyncStatus from '$lib/components/SyncStatus.svelte';
  import CalendarView from '$lib/components/calendar/CalendarView.svelte';

  import { theme } from '$lib/stores/theme.svelte';
  import { view } from '$lib/stores/view.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { syncEngine } from '$lib/sync/engine.svelte';
  import { getMeta, setMeta } from '$lib/db/local';
  import { checkForUpdate } from '$lib/updater';
  import { NotebookPen, LogIn } from '@lucide/svelte';

  let ready = $state(false);
  let showAuth = $state(false);
  let settingsOpen = $state(false);
  let shareOpen = $state(false);

  onMount(async () => {
    theme.init();
    settings.init();
    view.init();
    session.load();
    await notab.init();
    await lock.init();
    syncEngine.start();

    const onboarded = await getMeta<boolean>('onboarded');
    if (!onboarded && !session.signedIn) showAuth = true;
    ready = true;

    // Look for a new desktop release in the background; stays silent unless one
    // is found (then a toast with an "install & restart" button appears).
    void checkForUpdate({ silent: true });
  });

  async function finishAuth() {
    showAuth = false;
    await setMeta('onboarded', true);
    await syncEngine.pullEverything().catch(() => {});
    await notab.reload();
  }
</script>

<div class="flex h-full w-full flex-col bg-canvas">
  <TitleBar onOpenSettings={() => (settingsOpen = true)} />

  {#if !ready}
    <div class="grid flex-1 place-items-center text-ink-faint">Laster…</div>
  {:else if showAuth}
    <AuthView onDone={finishAuth} />
  {:else}
    {#if view.mode === 'calendar'}
      <CalendarView />
    {:else}
      <TabBar onShare={() => (shareOpen = true)} />

      <main class="flex min-h-0 flex-1 flex-col">
        {#if notab.activeTab}
          {#key notab.activeTab.id}
            <NoteComposer tabId={notab.activeTab.id} tabName={notab.activeTab.name} />
            <div class="flex justify-end px-4 pb-1">
              <SortMenu
                value={notab.activeTab.sortMode}
                onChange={(m) => notab.activeTab && notab.setSortMode(notab.activeTab.id, m)}
              />
            </div>
            <NoteList tab={notab.activeTab} />
          {/key}
        {:else}
          <div class="grid flex-1 place-items-center p-8 text-center">
            <div class="space-y-3">
              <div
                class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"
              >
                <NotebookPen size={22} />
              </div>
              <p class="text-[13px] text-ink-soft">Ingen faner ennå</p>
              <button
                class="rounded-xl bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink"
                onclick={() => notab.createTab('Å gjøre')}
              >
                Lag din første fane
              </button>
            </div>
          </div>
        {/if}
      </main>
    {/if}

    <footer
      class="flex h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-3"
    >
      <SyncStatus />
      {#if !session.signedIn}
        <button
          class="flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
          onclick={() => (showAuth = true)}
        >
          <LogIn size={11} /> Logg inn for å synke &amp; dele
        </button>
      {:else}
        <span class="text-[11px] text-ink-faint">{session.username}</span>
      {/if}
    </footer>
  {/if}

  {#if lock.locked}
    <LockScreen />
  {/if}

  <SettingsDialog bind:open={settingsOpen} />
  <ShareDialog bind:open={shareOpen} tab={notab.activeTab} />
  <ImageLightbox />
  <Toasts />
</div>
