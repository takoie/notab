# 🚀 Release & Byggemanual for Atlantasy Desktop

Denne guiden beskriver hvordan du publiserer nye oppdateringer og installasjonsprogrammer for **Atlantasy Desktop** raskt og smertefritt.

---

## ⚡ Rask 1-2-3 Guide

### 1. Oppdater versjonsnummer
Når du skal lage en ny versjon (f.eks. `0.6.0`), oppdater versjonen i følgende filer:
- `package.json` (`"version": "0.6.0"`)
- `src-tauri/tauri.conf.json` (`"version": "0.6.0"`)
- `src-tauri/Cargo.toml` (`version = "0.6.0"`)
- `src/lib/components/Sidebar.svelte` (v0.6.0 badge)
- `src/App.svelte` (`currentVersion="0.6.0"`)
- `src/lib/components/UpdateModal.svelte` (`currentVersion = "0.6.0"`)

---

### 2. Kompiler og signer installasjonsfilene
Kjør i terminalen:

```powershell
npm run build:exe
```

Dette bygger frontend, kompilerer, signerer med kryptografisk nøkkel og genererer:
- `src-tauri/target/release/bundle/nsis/Atlantasy_<VERSJON>_x64-setup.exe` (NSIS-installer)
- `src-tauri/target/release/bundle/msi/Atlantasy_<VERSJON>_x64_en-US.msi` (MSI-pakke)
- `src-tauri/target/release/bundle/nsis/Atlantasy_<VERSJON>_x64-setup.exe.sig` (Kryptografisk signatur)
- `latest.json` (Automatisk generert manifest for sømløs in-app oppdatering)

---

### 3. Publiser til GitHub
Kjør følgende kommandoer for å pushe og opprette releasen på GitHub:

```powershell
# 1. Commit og tagg
git commit -am "release: v0.7.1"
git tag -a v0.7.1 -m "Atlantasy Desktop v0.7.1"

# 2. Push til GitHub
git push origin main --tags

# 3. Last opp installasjonsfilene og latest.json til GitHub Releases
gh release create v0.7.1 "src-tauri/target/release/bundle/nsis/Atlantasy_0.7.1_x64-setup.exe" "src-tauri/target/release/bundle/msi/Atlantasy_0.7.1_x64_en-US.msi" "latest.json" --title "Atlantasy Desktop v0.7.1" --notes "### 🚀 Endringslogg for v0.7.1"
```

---

## 💡 Hjelp fra AI Agent
Du kan når som helst bare be agenten:
> *"Lag en ny release v0.6.0, bygg exe og push til GitHub"*

Agenten vil automatisk følge instruksene definert i [`.agents/rules/release-guide.md`](file:///.agents/rules/release-guide.md).
