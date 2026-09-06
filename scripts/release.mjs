#!/usr/bin/env node
/**
 * One-command NotaB! desktop release.
 *
 *   node scripts/release.mjs <version> [--notes "text"] [--skip-checks] [--dry-run]
 *   npm run release -- 0.2.0 --notes "Retter synk-feil"
 *
 * Does, in order:
 *   1. sanity-checks git (clean tree, on main) and the signing env
 *   2. bumps the version in package.json, tauri.conf.json, Cargo.toml
 *   3. runs `npm run check` + `npm test` (unless --skip-checks)
 *   4. `npx tauri build` — signs and bundles the NSIS installer + MSI
 *   5. assembles `latest.json` from the generated .sig
 *   6. commits, tags `v<version>`, pushes
 *   7. `gh release create` with the installer, MSI and latest.json
 *   8. re-reads the uploaded installer's real asset URL and patches latest.json
 *
 * The private signing key never leaves your machine — the script only reads the
 * path from `.env.release` (gitignored) and hands it to `tauri build` via env.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GH_OWNER = 'takoie';
const GH_REPO = 'notab';

/* ----------------------------- pure helpers ------------------------------ */

/** Validate a plain `x.y.z` semver (no pre-release / build metadata). */
export function isReleaseVersion(v) {
  return /^\d+\.\d+\.\d+$/.test(v);
}

/** Replace `"version": "…"` (JSON) — returns the new file text. */
export function bumpJsonVersion(text, version) {
  return text.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
}

/** Replace the first `version = "…"` in a Cargo.toml `[package]` block. */
export function bumpCargoVersion(text, version) {
  return text.replace(/^(version\s*=\s*")[^"]*(")/m, `$1${version}$2`);
}

/**
 * Build the Tauri updater manifest.
 * @param {{version:string, notes:string, signature:string, url:string, pubDate?:string}} o
 */
export function buildLatestJson({ version, notes, signature, url, pubDate }) {
  return {
    version,
    notes,
    pub_date: pubDate ?? new Date().toISOString(),
    platforms: {
      'windows-x86_64': { signature, url },
    },
  };
}

/** Parse a minimal KEY=VALUE .env file (no interpolation, `#` comments). */
export function parseEnvFile(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trimStart().startsWith('#')) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

/* ------------------------------- runner -------------------------------- */

// We shell out through a single command *string* (execSync) rather than
// execFileSync(file, args, { shell: true }) — the latter concatenates args
// without escaping and Node now warns about it (DEP0190). Quote each arg here.
function quoteArg(a) {
  a = String(a);
  if (a === '') return '""';
  if (/^[A-Za-z0-9_@%+=:,./\\-]+$/.test(a)) return a;
  return `"${a.replace(/"/g, '""')}"`; // cmd.exe + POSIX both accept "" for a literal "
}

function toLine(cmd, args) {
  return [cmd, ...args.map(quoteArg)].join(' ');
}

function run(cmd, args, opts = {}) {
  const line = toLine(cmd, args);
  console.log(`\n$ ${line}`);
  return execSync(line, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function capture(cmd, args) {
  return execSync(toLine(cmd, args), { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const version = argv.find((a) => !a.startsWith('--'));
  const dryRun = argv.includes('--dry-run');
  const skipChecks = argv.includes('--skip-checks');
  const notesIdx = argv.indexOf('--notes');
  const notes =
    notesIdx !== -1 && argv[notesIdx + 1]
      ? argv[notesIdx + 1]
      : `NotaB! v${version}`;

  if (!version || !isReleaseVersion(version)) {
    fail('Usage: node scripts/release.mjs <x.y.z> [--notes "…"] [--skip-checks] [--dry-run]');
  }
  const tag = `v${version}`;

  // 1. git + env sanity
  const branch = capture('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch !== 'main') fail(`On branch "${branch}" — releases are cut from main.`);
  if (capture('git', ['status', '--porcelain'])) fail('Working tree is dirty — commit or stash first.');
  if (capture('git', ['tag', '--list', tag])) fail(`Tag ${tag} already exists.`);

  const envPath = join(ROOT, '.env.release');
  if (!existsSync(envPath)) fail('.env.release not found — see RELEASE.md ("Engangsoppsett").');
  Object.assign(process.env, parseEnvFile(readFileSync(envPath, 'utf8')));
  if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
    fail('TAURI_SIGNING_PRIVATE_KEY is not set in .env.release.');
  }
  process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??= '';

  // 2. bump versions
  const files = {
    'package.json': bumpJsonVersion,
    'src-tauri/tauri.conf.json': bumpJsonVersion,
    'src-tauri/Cargo.toml': bumpCargoVersion,
  };
  for (const [rel, fn] of Object.entries(files)) {
    const p = join(ROOT, rel);
    const next = fn(readFileSync(p, 'utf8'), version);
    if (dryRun) console.log(`would bump ${rel} → ${version}`);
    else writeFileSync(p, next);
  }
  // (Cargo.lock picks up the new package version during `tauri build` below,
  // so it lands in the same commit.)

  // 2b. fold the release notes into CHANGELOG.md (best-effort, line-based)
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    const today = new Date().toISOString().slice(0, 10);
    const entry = notes
      .split('\n')
      .map((l) => (l.trim() ? (l.trimStart().startsWith('-') ? l.trimStart() : `- ${l.trim()}`) : ''))
      .filter((l, i, a) => l || (i > 0 && a[i - 1])) // collapse blank runs
      .join('\n');
    const lines = readFileSync(changelogPath, 'utf8').split('\n');
    const out = [];
    let inserted = false;
    let dropUntilNextH2 = false;
    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (!inserted) {
          out.push(`## ${version} — ${today}`, '', entry, '');
          inserted = true;
        }
        dropUntilNextH2 = line.trim() === '## Ikke utgitt';
        if (dropUntilNextH2) continue;
      } else if (dropUntilNextH2) {
        continue;
      }
      out.push(line);
    }
    if (!inserted) out.push('', `## ${version} — ${today}`, '', entry);
    if (dryRun) console.log(`would prepend v${version} to CHANGELOG.md`);
    else writeFileSync(changelogPath, out.join('\n'));
  }

  // 3. checks
  if (!skipChecks) {
    run('npm', ['run', 'check']);
    run('npm', ['test']);
  }

  // 4. build (frontend build runs via beforeBuildCommand)
  if (dryRun) {
    console.log('\n[dry-run] stopping before `tauri build`.');
    return;
  }
  run('npx', ['tauri', 'build']);

  // 5. locate artifacts + assemble latest.json
  const bundle = join(ROOT, 'src-tauri/target/release/bundle');
  const nsisDir = join(bundle, 'nsis');
  const msiDir = join(bundle, 'msi');
  const setupExe = readdirSync(nsisDir).find((f) => f.endsWith('-setup.exe'));
  const sigFile = readdirSync(nsisDir).find((f) => f.endsWith('-setup.exe.sig'));
  const msi = readdirSync(msiDir).find((f) => f.endsWith('.msi'));
  if (!setupExe || !sigFile) fail(`Could not find NSIS installer / .sig in ${nsisDir}`);

  const signature = readFileSync(join(nsisDir, sigFile), 'utf8').trim();
  let latest = buildLatestJson({
    version,
    notes,
    signature,
    url: `https://github.com/${GH_OWNER}/${GH_REPO}/releases/download/${tag}/${encodeURIComponent(setupExe)}`,
  });
  const latestPath = join(bundle, 'latest.json');
  writeFileSync(latestPath, JSON.stringify(latest, null, 2));

  // 6. commit + tag + push
  run('git', ['commit', '-am', `release: ${tag}`]);
  run('git', ['tag', '-a', tag, '-m', `NotaB! ${tag}`]);
  run('git', ['push', '--follow-tags', 'origin', 'main']);

  // 7. GitHub release
  const assets = [join(nsisDir, setupExe), msi && join(msiDir, msi), latestPath].filter(Boolean);
  run('gh', [
    'release', 'create', tag,
    ...assets,
    '--title', `NotaB! ${tag}`,
    '--notes', notes,
  ]);

  // 8. reconcile the installer's real asset URL (GitHub can rewrite "NotaB!" etc.)
  const uploaded = JSON.parse(capture('gh', ['release', 'view', tag, '--json', 'assets']));
  const realExe = uploaded.assets.find((a) => a.name.endsWith('-setup.exe'));
  if (realExe && realExe.url !== latest.platforms['windows-x86_64'].url) {
    console.log(`\nPatching latest.json installer URL →\n  ${realExe.url}`);
    latest.platforms['windows-x86_64'].url = realExe.url;
    writeFileSync(latestPath, JSON.stringify(latest, null, 2));
    run('gh', ['release', 'upload', tag, latestPath, '--clobber']);
  }

  console.log(`\n✔ Released ${tag}. Existing installs will see the update toast on next launch.`);
}

// only run when invoked directly (not when imported by tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => fail(e?.message ?? String(e)));
}
