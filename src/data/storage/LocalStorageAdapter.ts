import type { StorageAdapter } from './StorageAdapter';

export class LocalStorageAdapter implements StorageAdapter {
  get(key: string) {
    try { return window.localStorage.getItem(key); } catch { return null; }
  }
  set(key: string, value: string) {
    window.localStorage.setItem(key, value); // may throw QuotaExceededError — handled by the caller
  }
  remove(key: string) {
    try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ }
  }
  keys() {
    try { return Object.keys(window.localStorage); } catch { return []; }
  }
}
