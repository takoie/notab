<script lang="ts">
  import { Lock, Moon, Sun, Settings, NotebookPen, CalendarDays } from '@lucide/svelte';
  import { theme } from '$lib/stores/theme.svelte';
  import { lock } from '$lib/stores/lock.svelte';
  import { toasts } from '$lib/stores/toasts.svelte';
  import { view } from '$lib/stores/view.svelte';
  import { cn } from '$lib/cn';
  import Logo from './Logo.svelte';
  import WindowControls from './WindowControls.svelte';

  let { onOpenSettings }: { onOpenSettings: () => void } = $props();

  function lockNow() {
    if (lock.enabled) {
      lock.lockNow();
    } else {
      onOpenSettings();
      toasts.push('Sett en PIN-kode i innstillinger for å låse NotaB!');
    }
  }
</script>

<header
  class="drag-region flex h-11 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 pl-3 select-none"
>
  <Logo class="h-[24px] w-[24px]" />
  <span class="text-[17px] font-bold tracking-[-0.02em] text-ink">NotaB<span class="text-accent">!</span></span>

  <div class="flex-1"></div>

  <div
    class="no-drag flex items-center gap-0.5 rounded-lg bg-surface-sunken p-0.5 text-[12px] font-medium"
  >
    <button
      class={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors',
        view.mode === 'notes'
          ? 'bg-surface text-ink shadow-card'
          : 'text-ink-faint hover:text-ink',
      )}
      onclick={() => view.set('notes')}
    >
      <NotebookPen size={14} /> Notater
    </button>
    <button
      class={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors',
        view.mode === 'calendar'
          ? 'bg-surface text-ink shadow-card'
          : 'text-ink-faint hover:text-ink',
      )}
      onclick={() => view.set('calendar')}
    >
      <CalendarDays size={14} /> Kalender
    </button>
  </div>

  <div class="flex-1"></div>

  <button
    class={[
      'no-drag flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium transition-colors',
      lock.enabled
        ? 'text-ink-soft hover:bg-accent-soft hover:text-accent'
        : 'text-ink-faint hover:bg-surface-sunken hover:text-ink',
    ].join(' ')}
    title={lock.enabled
      ? `Lås NotaB! (auto etter ${lock.idleMinutes} min)`
      : 'Lås NotaB! — krever PIN-kode'}
    onclick={lockNow}
  >
    <Lock size={15} />
    <span>Lås</span>
  </button>

  <div class="mx-0.5 h-5 w-px bg-border"></div>

  <button
    class="no-drag grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    title="Innstillinger"
    onclick={onOpenSettings}
  >
    <Settings size={16} />
  </button>
  <button
    class="no-drag grid h-8 w-8 place-items-center rounded-lg text-ink-soft hover:bg-surface-sunken hover:text-ink"
    title="Bytt tema"
    onclick={() => theme.toggle()}
  >
    {#if theme.resolved === 'dark'}<Sun size={16} />{:else}<Moon size={16} />{/if}
  </button>

  <div class="mx-1 h-5 w-px bg-border"></div>

  <WindowControls />
</header>
