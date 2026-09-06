import { describe, it, expect } from 'vitest';
import {
  isReleaseVersion,
  bumpJsonVersion,
  bumpCargoVersion,
  buildLatestJson,
  parseEnvFile,
} from './release.mjs';

describe('isReleaseVersion', () => {
  it('accepts plain x.y.z', () => {
    expect(isReleaseVersion('0.1.0')).toBe(true);
    expect(isReleaseVersion('12.3.45')).toBe(true);
  });
  it('rejects pre-release, v-prefix and junk', () => {
    expect(isReleaseVersion('v0.1.0')).toBe(false);
    expect(isReleaseVersion('0.1.0-beta')).toBe(false);
    expect(isReleaseVersion('0.1')).toBe(false);
    expect(isReleaseVersion('')).toBe(false);
  });
});

describe('bumpJsonVersion', () => {
  it('replaces only the first version field', () => {
    const src = '{\n  "name": "notab",\n  "version": "0.1.0",\n  "deps": { "version": "9.9.9" }\n}';
    const out = bumpJsonVersion(src, '0.2.0');
    expect(out).toContain('"version": "0.2.0"');
    expect(out).toContain('"deps": { "version": "9.9.9" }');
  });
});

describe('bumpCargoVersion', () => {
  it('replaces the package version at line start', () => {
    const src = '[package]\nname = "notab"\nversion = "0.1.0"\nedition = "2021"\n';
    expect(bumpCargoVersion(src, '0.2.0')).toContain('version = "0.2.0"');
  });
  it('leaves indented dependency versions alone', () => {
    const src = '[package]\nversion = "0.1.0"\n\n[dependencies]\ntauri = { version = "2" }\n';
    const out = bumpCargoVersion(src, '0.2.0');
    expect(out).toContain('version = "0.2.0"');
    expect(out).toContain('tauri = { version = "2" }');
  });
});

describe('buildLatestJson', () => {
  it('shapes the Tauri updater manifest', () => {
    const m = buildLatestJson({
      version: '0.2.0',
      notes: 'hi',
      signature: 'SIG',
      url: 'https://example/setup.exe',
      pubDate: '2026-01-01T00:00:00.000Z',
    });
    expect(m).toEqual({
      version: '0.2.0',
      notes: 'hi',
      pub_date: '2026-01-01T00:00:00.000Z',
      platforms: { 'windows-x86_64': { signature: 'SIG', url: 'https://example/setup.exe' } },
    });
  });
  it('defaults pub_date to an ISO string', () => {
    const m = buildLatestJson({ version: '1.0.0', notes: '', signature: 's', url: 'u' });
    expect(m.pub_date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('parseEnvFile', () => {
  it('reads KEY=VALUE, trims, strips quotes, skips comments', () => {
    const env = parseEnvFile(
      '# comment\nTAURI_SIGNING_PRIVATE_KEY = C:\\keys\\notab.key \nPASS=""\nEMPTY=\n',
    );
    expect(env.TAURI_SIGNING_PRIVATE_KEY).toBe('C:\\keys\\notab.key');
    expect(env.PASS).toBe('');
    expect(env.EMPTY).toBe('');
    expect(env['# comment']).toBeUndefined();
  });
});
