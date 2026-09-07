const KEY = 'notab.proofLang';

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
