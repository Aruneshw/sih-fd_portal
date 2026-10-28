/** Key-value persistence port (architecture.md §10). */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export const KEYS = {
  state: 'securefdr:v1:state',
  session: 'securefdr:v1:session',
  draft: (userId: string) => `securefdr:v1:draft:${userId}`,
  corrupt: (ts: string) => `securefdr:v1:corrupt:${ts}`,
} as const;

export class MemoryStorageAdapter implements StorageAdapter {
  private m = new Map<string, string>();
  failNextWrite = false;
  get(key: string) { return this.m.get(key) ?? null; }
  set(key: string, value: string) {
    if (this.failNextWrite) {
      this.failNextWrite = false;
      throw new DOMException('Simulated quota exceeded', 'QuotaExceededError');
    }
    this.m.set(key, value);
  }
  remove(key: string) { this.m.delete(key); }
  keys() { return [...this.m.keys()]; }
}
