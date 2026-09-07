import { appStore } from '../tauri';

const KEY = 'notab.proofLang';
const SKEY = 'proofLang';

export type ProofLang = 'off' | 'system' | 'nb' | 'nn' | 'en' | 'sv' | 'da' | 'de';

export const PROOF_LANGS: { value: ProofLang; label: string }[] = [
  { value: 'off', label: 'Av — ingen stavekontroll' },
  { value: 'system', label: 'Systemstandard' },
  { value: 'nb', label: 'Norsk bokmål' },
  { value: 'nn', label: 'Norsk nynorsk' },
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
  { value: 'da', label: 'Dansk' },
  { value: 'de', label: 'Deutsch' },
];

function isLang(v: unknown): v is ProofLang {
  return typeof v === 'string' && PROOF_LANGS.some((l) => l.value === v);
}

class Settings {
  proofLang = $state<ProofLang>('system');

  /** whether editable fields should run the browser spell checker at all */
  get spellcheck(): boolean {
    return this.proofLang !== 'off';
  }

  /** BCP-47 code for `lang=`, or undefined to defer to the OS / no hint */
  get lang(): string | undefined {
    return this.proofLang === 'system' || this.proofLang === 'off'
      ? undefined
      : this.proofLang;
  }

  async init() {
    let local: ProofLang | null = null;
    try {
      const v = localStorage.getItem(KEY);
      if (isLang(v)) local = v;
    } catch {
      /* ignore */
    }
    if (local) this.proofLang = local;

    if (!local) {
      try {
        const stored = await (await appStore()).get<ProofLang>(SKEY);
        if (isLang(stored)) {
          this.proofLang = stored;
          this.#writeLocal(stored);
        }
      } catch {
        /* ignore */
      }
    }
  }

  setProofLang(value: ProofLang) {
    this.proofLang = value;
    this.#writeLocal(value);
    void this.#writeStore(value);
  }

  #writeLocal(value: ProofLang) {
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
  }

  async #writeStore(value: ProofLang) {
    try {
      const s = await appStore();
      await s.set(SKEY, value);
      await s.save();
    } catch {
      /* ignore */
    }
  }
}

export const settings = new Settings();
