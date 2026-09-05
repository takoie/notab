# Notab

Quick note & todo lists for teachers (and anyone). Tabs per class / subject /
category, checkable notes, sort by importance or date, drag-and-drop priority
order, offline-first with optional realtime-shared tabs, an in-app PIN lock, and
always-on-top pinned popup windows.

**Stack:** Tauri v2 (Rust shell) · Svelte 5 runes + Vite + Tailwind · Convex
(accounts, sharing, sync). See [`docs/plans/2026-09-05-notab-design.md`](docs/plans/2026-09-05-notab-design.md)
for the full design and [`ARCHITECTURE_TEMPLATE.md`](ARCHITECTURE_TEMPLATE.md)
for the skeleton it is built on.

## Prerequisites

- Node 20+ and npm
- Rust toolchain (`rustup`) — for the desktop shell
- A [Convex](https://convex.dev) account — for accounts / sharing / cross-device sync

## First run

```bash
npm install

# 1. Provision the Convex deployment (interactive, one time).
#    Writes .env.local and regenerates convex/_generated/ with real types.
npx convex dev            # leave running, or Ctrl-C after it finishes the first push

# 2a. Web dev (fast UI loop, runs Convex + Vite together)
npm run dev:web

# 2b. Desktop dev (Tauri window — needed for the title bar, PIN lock,
#     pinned popup windows and the updater)
npm run dev:desktop
```

Notab runs **without** Convex too — it is fully usable offline/local-only; you
just can't sign in or share tabs until `npx convex dev` has been run once.

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` | Vite only (browser) |
| `npm run dev:web` | Convex + Vite |
| `npm run dev:desktop` | Convex + Tauri |
| `npm run build` | Build frontend to `dist/` |
| `npm run check` | `svelte-check` (frontend types) |
| `npm test` | Vitest unit + store tests |
| `npm run tauri build` | Build the desktop installers (NSIS + MSI) |

## Layout

```
src/                     frontend
  App.svelte             main window root
  PinnedApp.svelte       popup window root (?window=pin)
  lib/
    stores/              notab (data), session, lock, theme, toasts  (Svelte 5 runes)
    sync/                offline-first engine: outbox → pushOps, delta pullTab, LWW reconcile
    db/local.ts          IndexedDB (source of truth the UI renders from)
    components/          UI
    crypto.ts            PBKDF2 for the PIN
    tauri.ts             Tauri wrappers (no-op in a plain browser)
convex/                  backend
  schema.ts              users, sessions, tabs, tabMembers, notes
  auth.ts                register / login / logout / me
  tabs.ts                share codes, join, members
  sync.ts                pushOps / pullTab / myTabs
  security.ts            password hashing + auth & tab-access guards
src-tauri/               Rust shell: frameless window, open_pinned_window command,
                         store / process / updater / opener plugins
```

## Notes

- **`convex/*.ts` type-checks only after `npx convex dev`.** Until codegen runs,
  `convex/_generated/` holds generic placeholders and TypeScript reports
  "index not found" errors when checking that folder in isolation. The frontend
  (`npm run check`) is unaffected.
- **Sync model:** every local edit is applied to IndexedDB immediately and queued
  in an outbox. When online + signed in the queue flushes to `sync.pushOps`;
  changes pull back per-tab via `sync.pullTab` (delta on `updatedAt`). Conflicts
  resolve per-note, last-write-wins (server clock authoritative). Manual order
  uses fractional-index keys so drag-and-drop reorders merge sanely.
- **PIN lock:** 4–6 digits, PBKDF2-hashed on disk (Tauri store). Auto-locks after
  15 min idle (configurable) or manually from the title bar; the lock broadcasts
  to pinned popup windows.
- **Auto-updater / release pipeline:** not wired yet (deferred). The updater
  plugin is compiled in; add signing keys + `plugins.updater` in
  `src-tauri/tauri.conf.json` and a `latest.json` publish step when ready.
