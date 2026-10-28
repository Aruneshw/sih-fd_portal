import type { AppState } from '@/domain/types';

export type StoreStatus =
  | { kind: 'loading' }
  | { kind: 'ready'; state: AppState }
  | { kind: 'recovery'; reason: string; corruptKey: string };

/** Minimal external store for useSyncExternalStore. */
export function createStore(initial: StoreStatus) {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set(next: StoreStatus) {
      current = next;
      for (const l of listeners) l();
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export type Store = ReturnType<typeof createStore>;
