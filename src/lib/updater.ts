/**
 * In-app updates via the Tauri updater plugin.
 *
 * `checkForUpdate()` is safe to call anywhere: it no-ops in a plain browser
 * (`npm run dev:web`), in dev builds, and in the pinned popup windows — only the
 * main desktop window ever talks to the updater.
 */
import type { Update } from '@tauri-apps/plugin-updater';
import { inTauri } from './tauri';
import { toasts } from './stores/toasts.svelte';

let inFlight = false;
let installing = false;

function isMainWindow(): boolean {
  try {
    return new URLSearchParams(location.search).get('window') !== 'pin';
  } catch {
    return true;
  }
}

/**
 * @param opts.silent  when true (the automatic startup check) stay quiet if the
 *                      app is already up to date or the check fails.
 */
export async function checkForUpdate(opts: { silent?: boolean } = {}): Promise<void> {
  const { silent = false } = opts;
  if (!inTauri || !isMainWindow() || inFlight || installing) return;

  inFlight = true;
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (!update) {
      if (!silent) toasts.push('Du har den nyeste versjonen av NotaB!', 'success');
      return;
    }

    let toastId = -1;
    toastId = toasts.push(`NotaB! ${update.version} er tilgjengelig`, {
      tone: 'info',
      sticky: true,
      action: {
        label: 'Installer og start på nytt',
        run: () => installUpdate(update, toastId),
      },
    });
  } catch (err) {
    console.error('update check failed', err);
    if (!silent) toasts.error('Kunne ikke se etter oppdateringer');
  } finally {
    inFlight = false;
  }
}

async function installUpdate(update: Update, toastId: number): Promise<void> {
  if (installing) return;
  installing = true;
  toasts.update(toastId, { message: 'Laster ned oppdatering…', action: undefined });
  try {
    await update.downloadAndInstall();
    toasts.update(toastId, { message: 'Starter på nytt…' });
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (err) {
    console.error('update install failed', err);
    installing = false;
    toasts.update(toastId, {
      message: 'Oppdateringen feilet. Prøv igjen senere.',
      tone: 'error',
      sticky: false,
      action: undefined,
    });
    setTimeout(() => toasts.dismiss(toastId), 5000);
  }
}
