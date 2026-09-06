const KEY = 'notab.proofLang';

export type ProofLang = 'system' | 'nb' | 'nn' | 'en' | 'sv' | 'da' | 'de';

export const PROOF_LANGS: { value: ProofLang; label: string }[] = [
  { value: 'system', label: 'Systemstandard' },
  { value: 'nb', label: 'Norsk bokmål' },
  { value: 'nn', label: 'Norsk nynorsk' },
  { value: 'en', label: 'English' },
  { value: 'sv', label: 'Svenska' },
  { value: 'da', label: 'Dansk' },
  { value: 'de', label: 'Deutsch' },
];

class Settings {
  proofLang = $state<ProofLang>('system');

  /** BCP-47 code for `lang=` / spellcheck, or undefined to defer to the OS */
  get lang(): string | undefined {
    return this.proofLang === 'system' ? undefined : this.proofLang;
  }

  init() {
    try {
      const saved = localStorage.getItem(KEY) as ProofLang | null;
      if (saved && PROOF_LANGS.some((l) => l.value === saved)) this.proofLang = saved;
    } catch {
      /* ignore */
    }
  }

  setProofLang(value: ProofLang) {
    this.proofLang = value;
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
  }
}

export const settings = new Settings();
