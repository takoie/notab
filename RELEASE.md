# 🚀 Release- og byggemanual for NotaB!

Slik publiserer du en ny versjon av **NotaB! Desktop** og lar eksisterende
installasjoner oppdatere seg selv (med toast-varsel i appen).

---

## ⚡ Rask 1-2-3

### 0. Deploy Convex FØRST hvis backend er endret
Har `convex/schema.ts` eller `convex/*.ts` endret seg siden forrige deploy
(nye tabeller, nye felt, ny op-type), **må** du deploye før releasen — ellers
avviser serveren de nye synk-operasjonene og brukere mister data:
```powershell
npx convex deploy      # prod-deployment (den appen bygges mot)
```
`npm run release` gjør IKKE dette.

### 1. Bestem versjonsnummer
Semver `x.y.z`, f.eks. `0.2.0`. Du trenger **ikke** redigere filer manuelt —
`npm run release` bumper `package.json`, `src-tauri/tauri.conf.json` og
`src-tauri/Cargo.toml` for deg.

### 2. Kjør releasen
```powershell
npm run release -- 0.2.0 --notes "Kort endringslogg her"
```

Skriptet ([`scripts/release.mjs`](scripts/release.mjs)) gjør alt:

1. Sjekker at git er rent og at du står på `main`.
2. Laster signeringsnøkkel fra `.env.release`.
3. Bumper versjon i de tre filene og folder `--notes` inn i `CHANGELOG.md`
   (erstatter «## Ikke utgitt»-seksjonen). Endringsloggen vises i appen under
   **Innstillinger → Oppdateringer**.
4. Kjører `npm run check` + `npm test` (hopp over med `--skip-checks`).
5. `npx tauri build` → signerer og bygger:
   - `src-tauri/target/release/bundle/nsis/NotaB!_0.2.0_x64-setup.exe` (+ `.sig`)
   - `src-tauri/target/release/bundle/msi/NotaB!_0.2.0_x64_en-US.msi`
6. Lager `latest.json` (oppdateringsmanifest) fra `.sig`-fila.
7. `git commit` + `git tag v0.2.0` + `git push --follow-tags`.
8. `gh release create v0.2.0 …` med installer, MSI og `latest.json`.
9. Leser opp den faktiske asset-URL-en fra GitHub og retter `latest.json`
   hvis GitHub har endret filnavnet (`NotaB!` → `NotaB_` o.l.).

### 3. Ferdig
Neste gang en eksisterende installasjon starter, ser den etter oppdatering mot
`https://github.com/takoie/notab/releases/latest/download/latest.json`.
Finnes en nyere versjon, dukker det opp en toast nederst:
**«NotaB! 0.2.0 er tilgjengelig» → «Installer og start på nytt»**.
Brukeren kan også trykke **Innstillinger → Om NotaB! → Se etter oppdateringer**.

> Tørrkjøring uten å bygge/pushe: `npm run release -- 0.2.0 --dry-run`

---

## 🔧 Engangsoppsett (allerede gjort på denne maskinen)

### Signeringsnøkler
Generert lokalt med:
```powershell
npx tauri signer generate -w "$env:USERPROFILE\.tauri\notab.key" --password "" --force
```

- **Privat nøkkel:** `%USERPROFILE%\.tauri\notab.key` — *aldri* i git. Mister du
  den, kan ingen eksisterende installasjon oppdatere seg (de må reinstalleres
  manuelt fra en ny release signert med ny nøkkel).
- **Offentlig nøkkel:** `%USERPROFILE%\.tauri\notab.key.pub` — innholdet ligger i
  `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
- **`.env.release`** (gitignored) i repo-rota peker byggeskriptet på nøkkelen:
  ```
  TAURI_SIGNING_PRIVATE_KEY=C:\Users\stian.TAKO\.tauri\notab.key
  TAURI_SIGNING_PRIVATE_KEY_PASSWORD=
  ```

### GitHub
- Repo: `https://github.com/takoie/notab` (offentlig — updater henter release-
  filer over vanlig HTTPS, ingen token i appen).
- `gh auth status` må vise en innlogget konto med `repo`- og `workflow`-scope.

### Tauri-oppsett i koden
- `src-tauri/tauri.conf.json`: `bundle.createUpdaterArtifacts: true` +
  `plugins.updater` (endpoint + pubkey).
- `src-tauri/src/lib.rs`: `tauri_plugin_updater` registrert (kun desktop).
- `src-tauri/capabilities/default.json`: `updater:default` + `process:allow-restart`.
- Frontend: [`src/lib/updater.ts`](src/lib/updater.ts) sjekker ved oppstart
  (`App.svelte` `onMount`, kun hovedvinduet) og fra `SettingsDialog.svelte`.

---

## 🛟 Manuell fallback (hvis skriptet feiler halvveis)

```powershell
# 1. Versjon alt bumpet? Ellers rediger package.json, src-tauri/tauri.conf.json,
#    src-tauri/Cargo.toml manuelt.

# 2. Bygg signert (les .env.release inn i miljøet først)
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\Users\stian.TAKO\.tauri\notab.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
npx tauri build

# 3. Lag latest.json for hånd (signaturen er HELE innholdet i .sig-fila)
#    Se scripts/release.mjs -> buildLatestJson for eksakt form.

# 4. Commit, tag, push
git commit -am "release: v0.2.0"
git tag -a v0.2.0 -m "NotaB! v0.2.0"
git push --follow-tags origin main

# 5. Publiser
gh release create v0.2.0 `
  "src-tauri/target/release/bundle/nsis/NotaB!_0.2.0_x64-setup.exe" `
  "src-tauri/target/release/bundle/msi/NotaB!_0.2.0_x64_en-US.msi" `
  "src-tauri/target/release/bundle/latest.json" `
  --title "NotaB! v0.2.0" --notes "### Endringslogg for v0.2.0"

# 6. Sjekk at installer-URL-en i latest.json matcher den faktiske asseten:
gh release view v0.2.0 --json assets
#    Er navnet endret, rett latest.json og:  gh release upload v0.2.0 latest.json --clobber
```

---

## 💡 Fra AI-agent
> *«Lag en ny release v0.2.0, bygg og push til GitHub»*

Agenten følger denne fila: bump via `npm run release -- <versjon>`, verifiser at
`gh release view` viser de tre assetene, og at `latest.json` sin installer-URL
peker på riktig `-setup.exe`.
