<script lang="ts">
  import { onMount, untrack } from 'svelte';
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
  import OnboardingWizard from '$lib/components/OnboardingWizard.svelte';

  import { theme } from '$lib/stores/theme.svelte';
  import { view } from '$lib/stores/view.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { session } from '$lib/stores/session.svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { notab } from '$lib/stores/notab.svelte';
  import { syncEngine } from '$lib/sync/engine.svelte';
  import { getMeta, setMeta } from '$lib/db/local';
  import { checkForUpdate } from '$lib/updater';
  import { LogIn, ChevronsDownUp, ChevronsUpDown } from '@lucide/svelte';

  let ready = $state(false);
  let showAuth = $state(false);
  let settingsOpen = $state(false);
  let shareOpen = $state(false);

  // mark the tab you're looking at as seen (clears its "new" badge).
  // untrack the call: markSeen reads *and* writes notab.lastSeen, so without
  // this the effect would depend on the value it just changed and loop forever.
  $effect(() => {
    const id = notab.activeTabId;
    if (ready && id) untrack(() => notab.markSeen(id));
  });

  onMount(async () => {
    await Promise.all([theme.init(), settings.init(), view.init()]);
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
            {@const allCollapsed = notab.allNotesCollapsed(notab.activeTab.id)}
            <div class="flex items-center justify-end gap-0.5 px-4 pb-1">
              <button
                type="button"
                class="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
                title={allCollapsed ? 'Utvid alle notater' : 'Slå sammen alle notater'}
                onclick={() =>
                  notab.activeTab &&
                  notab.setAllNotesCollapsed(notab.activeTab.id, !allCollapsed)}
              >
                {#if allCollapsed}<ChevronsUpDown size={14} />{:else}<ChevronsDownUp
                    size={14}
                  />{/if}
                <span class="hidden sm:inline">{allCollapsed ? 'Utvid alle' : 'Slå sammen'}</span>
              </button>
              <SortMenu
                value={notab.activeTab.sortMode}
                onChange={(m) => notab.activeTab && notab.setSortMode(notab.activeTab.id, m)}
              />
            </div>
            <NoteList tab={notab.activeTab} />
          {/key}
        {:else}
          <OnboardingWizard />
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
