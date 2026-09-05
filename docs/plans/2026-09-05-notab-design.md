# Notab — Design

A cross-platform desktop note/todo app for teachers (and anyone). Quick checklists
organized into tabs, offline-first, with optional realtime-shared tabs, an in-app
PIN lock, and always-on-top pinned popup windows.

Stack: **Tauri v2** (Rust shell) + **Svelte 5 runes** + Vite + Tailwind + **Convex**
(auth, sharing, sync backend). See `ARCHITECTURE_TEMPLATE.md` for the wiring baseline.

---

## Decisions (from brainstorming, 2026-09-05)

| Topic | Decision |
| --- | --- |
| Accounts | Username + password (PBKDF2 hash in Convex). Username required for sharing. |
| Sharing | Owner generates a share code; others join by code. Owner sees members, can remove; members can leave. Realtime sync when online. |
| Offline | Full offline-first. Local store is source of truth; Convex syncs in background. |
| Offline conflicts (shared) | Per-note last-write-wins (server timestamp authoritative). New notes from all sides kept. Manual order may reshuffle slightly. |
| Pinned popups | Small always-on-top interactive Tauri windows, one per pinned note/tab. Position/size persisted. Close independently of main window. |
| PIN lock | 4–6 digits, PBKDF2-hashed, stored on disk (Tauri store). Auto-lock after 15 min idle + manual lock. Fade to lock screen. Popups lock too. |
| Sorting | Per-tab sort mode: `manual` / `importance` / `due` / `done-last`. Drag-and-drop active in `manual`, sets order via fractional index. |
| Content model | Tab → flat list of notes. Note = title + optional body + checkbox. "List" = a whole tab. Pin a single note or a whole tab. |
| Visual style | Light, airy, soft, friendly. Light + dark mode. Rounded corners, pastel accents, generous spacing. |
| v1 scope | Everything above. Auto-updater / release pipeline deferred. |

---

## Architecture

- **Shell:** Tauri v2, frameless window with custom title bar, multiwindow for popups.
- **Frontend:** Svelte 5 runes, Vite, Tailwind (design tokens in `tailwind.config.js`), light + dark.
- **Local storage:** IndexedDB (thin wrapper) — object stores `tabs`, `notes`, `outbox`, `meta`. Everything renders from here.
- **Backend:** Convex — auth, shared tabs, sync endpoints.
- **Window roles:** `App.svelte` (main) vs `PinnedView.svelte` (popup), chosen on `?window=` query param in the same `index.html`.

### Data model (Convex schema)

| Table | Fields | Indexes |
| --- | --- | --- |
| `users` | username, passwordHash, passwordSalt, createdAt, lastActiveAt | by_username |
| `tabs` | name, color?, ownerId, shareCode?, sortMode, createdAt, updatedAt, deleted? | by_owner, by_shareCode, by_updatedAt |
| `tabMembers` | tabId, userId, joinedAt | by_tab, by_user |
| `notes` | tabId, title, body?, done, importance (`low`/`med`/`high`), dueDate?, orderKey (fractional index string), createdAt, updatedAt, createdBy, deleted? | by_tab, by_tab_updatedAt |

Tombstones (`deleted: true`) instead of hard deletes so deletions propagate through sync.
Timestamps are `number` (`Date.now()`).

Local IndexedDB mirrors `tabs` and `notes` plus a client-only `orderKey` and sync bookkeeping in `meta` (per-tab `lastPulledAt`, session, PIN hash reference).

### Sync engine (`src/lib/sync/`)

- **Write:** mutate IndexedDB → append op to `outbox` (`upsertNote` / `deleteNote` / `reorderNote` / `upsertTab` / `deleteTab`) with `clientUpdatedAt`.
- **Push:** `api.sync.pushOps({ ops })` in batches. Server stamps authoritative `updatedAt`, applies whole-note LWW (ignore op if stored `updatedAt` > `clientUpdatedAt`), returns applied results. Op removed from outbox on success; exponential backoff retry otherwise.
- **Pull:** `api.sync.pullTab({ tabId, since })` per member tab + a reactive `useQuery` subscription for realtime while online. Reconcile: newer `updatedAt` wins, unknown ids inserted, tombstones removed locally.
- **Status:** subtle indicator ("Frakoblet" / "Synker…" / "Lagret").

### Accounts & session

- Username + password, PBKDF2 hashing in `convex/security.ts`.
- On login, store `userId` + `username` in `localStorage`; stay logged in locally. PIN is the day-to-day gate.
- Register/login screen shown only when no local session exists.

### Shared tabs

- Owner hits **Del** → `createShareCode` generates a short code (indexed on `tabs.shareCode`).
- Others paste code → `joinByCode` inserts a `tabMembers` row; tab appears and syncs.
- Owner sees member list, can `removeMember`; member can `leaveTab`.
- `requireTabAccess(ctx, userId, tabId)` guard at the top of every notes query/mutation.

### PIN lock

- 4–6 digits, PBKDF2-hashed, stored in Tauri store (disk).
- First-run setup in settings.
- Auto-lock: idle timer (15 min, configurable later) in `$effect`, reset on pointer/key. Manual lock button in the title bar.
- Lock screen is a Svelte overlay with CSS fade. Main window emits a `lock` Tauri event; popup windows listen and lock too. Each window runs its own idle timer.

### Pinned popup windows

- Rust command `open_pinned_window(kind, id)` creates a `WebviewWindow`: `always_on_top: true`, small, `decorations: false`, url `…?window=pin&kind=note|tab&id=…`.
- `PinnedView.svelte` renders the note/tab from the same IndexedDB (shared origin), interactive — checking off works directly.
- Position/size persisted to disk per id; reopened where they were.
- Capabilities extended: `core:window:*`, `core:webview:allow-create-webview-window`, `core:event:*`.

### Error handling

- Sync failure → op stays in outbox, backoff retry, status shows "Frakoblet".
- Convex validation error on an op → drop that op, log, subtle toast.
- Auth error → back to login.
- Popup for missing data (deleted note) → window shows "Notatet finnes ikke" and closes.

### Testing (Vitest + `convex-test`)

- Pure helpers: LWW reconcile, fractional-index ordering, outbox queue, PIN hash/verify, sort comparator, share-code gen/validate.
- Convex functions: auth, `pushOps` LWW, access guards, `joinByCode`.
- Components: lock-screen idle timer, drag reorder (light).

---

## Build order (phased, built directly on `main`)

1. Scaffold — Tauri + Svelte + Tailwind + Convex files, CSP, `convex.svelte.ts`.
2. Local core (offline only) — IndexedDB store, tabs/notes/checklist, sort modes, drag-and-drop.
3. Convex schema + auth + login/register UI + local session.
4. Sync engine — outbox + pull/push + reconcile + status indicator.
5. Shared tabs — share code, join, membership guards.
6. PIN lock.
7. Pinned popup windows.
8. (later) auto-updater + release pipeline.

> Convex note: `npx convex dev` needs an interactive login and provisions a
> deployment. The `convex/` modules are authored here; the project owner runs
> `npx convex dev` once to create the deployment and generate `convex/_generated/`.
