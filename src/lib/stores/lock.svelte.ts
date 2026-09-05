import { appStore, emitAppEvent, listenAppEvent } from '../tauri';
import { hashPin, verifyPin, isValidPin } from '../crypto';

const K_HASH = 'pin.hash';
const K_SALT = 'pin.salt';
const K_IDLE = 'pin.idleMinutes';
const LOCK_EVENT = 'notab://lock';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'];

class LockStore {
  enabled = $state(false);
  locked = $state(false);
  idleMinutes = $state(15);
  #timer: ReturnType<typeof setTimeout> | null = null;
  #wired = false;

  async init() {
    const store = await appStore();
    const hash = await store.get<string>(K_HASH);
    const idle = await store.get<number>(K_IDLE);
    this.enabled = typeof hash === 'string' && hash.length > 0;
    if (typeof idle === 'number' && idle > 0) this.idleMinutes = idle;
    this.locked = this.enabled; // start locked if a PIN exists

    if (!this.#wired) {
      this.#wired = true;
      // lock requests coming from other windows
      void listenAppEvent<null>(LOCK_EVENT, () => {
        if (this.enabled) this.locked = true;
      });
      for (const ev of ACTIVITY_EVENTS) {
        window.addEventListener(ev, this.#bump, { passive: true });
      }
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this.#bump();
      });
    }
    this.#reschedule();
  }

  async setPin(pin: string): Promise<boolean> {
    if (!isValidPin(pin)) return false;
    const { hash, salt } = await hashPin(pin);
    const store = await appStore();
    await store.set(K_HASH, hash);
    await store.set(K_SALT, salt);
    await store.save();
    this.enabled = true;
    this.locked = false;
    this.#reschedule();
    return true;
  }

  async disablePin(currentPin: string): Promise<boolean> {
    if (!(await this.#check(currentPin))) return false;
    const store = await appStore();
    await store.delete(K_HASH);
    await store.delete(K_SALT);
    await store.save();
    this.enabled = false;
    this.locked = false;
    this.#clearTimer();
    return true;
  }

  async setIdleMinutes(minutes: number) {
    this.idleMinutes = minutes;
    const store = await appStore();
    await store.set(K_IDLE, minutes);
    await store.save();
    this.#reschedule();
  }

  async unlock(pin: string): Promise<boolean> {
    if (!(await this.#check(pin))) return false;
    this.locked = false;
    this.#reschedule();
    return true;
  }

  lockNow() {
    if (!this.enabled) return;
    this.locked = true;
    void emitAppEvent(LOCK_EVENT, null);
  }

  async #check(pin: string): Promise<boolean> {
    const store = await appStore();
    const hash = await store.get<string>(K_HASH);
    const salt = await store.get<string>(K_SALT);
    if (!hash || !salt) return false;
    return verifyPin(pin, hash, salt);
  }

  #bump = () => {
    if (this.locked) return;
    this.#reschedule();
  };

  #reschedule() {
    this.#clearTimer();
    if (!this.enabled || this.idleMinutes <= 0) return;
    this.#timer = setTimeout(() => this.lockNow(), this.idleMinutes * 60_000);
  }

  #clearTimer() {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
}

export const lock = new LockStore();
