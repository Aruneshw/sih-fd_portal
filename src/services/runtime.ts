import { err, ok, type Result } from '@/lib/result';
import type { Clock } from '@/lib/clock';
import { can } from '@/domain/permissions/can';
import type { AppState, DemoUser } from '@/domain/types';
import { createStore, type Store } from '@/data/store';
import { isQuotaError, loadState, saveState } from '@/data/persistence';
import { KEYS, type StorageAdapter } from '@/data/storage/StorageAdapter';
import { appendAudit } from './audit/appendAudit';
import { execute, recordDenied } from './commands/dispatcher';
import type { Command, DomainError } from './commands/types';
import { syncNotifications } from './notifications/generate';
import { generateSeed } from './seed/generate';

export interface Runtime {
  store: Store;
  clock: Clock;
  adapter: StorageAdapter;
  init(): void;
  getState(): AppState | null;
  dispatch(command: Command, userId: string): Result<unknown, DomainError>;
  recordRouteDenied(userId: string, action: string, path: string): void;
  resetDemo(userId: string, confirmation: string): Result<void, DomainError>;
  recoverWithFreshSeed(): void;
  readCorrupt(): string | null;
  syncNotifications(): void;
  onExternalUpdate(cb: () => void): () => void;
  /** Submission wizard drafts (architecture.md §10: securefdr:v1:draft:<userId>). */
  drafts: { load(userId: string): unknown; save(userId: string, draft: unknown): void; clear(userId: string): void };
}

const STORAGE_MESSAGE = 'Browser storage is full or unavailable. Free some space (for example, reset demo data) and try again. Your last change was not saved.';

/** Glue between the pure pipeline and persistence (architecture.md §9 steps 9–10, §10). */
export function createRuntime(adapter: StorageAdapter, clock: Clock): Runtime {
  const store = createStore({ kind: 'loading' });
  const external = new Set<() => void>();
  let lastWritten: string | null = null;
  let initialised = false;

  const current = (): AppState | null => {
    const s = store.get();
    return s.kind === 'ready' ? s.state : null;
  };

  /** Persist then publish; on failure the in-memory state is left as it was (rollback). */
  function commit(next: AppState): Result<void, DomainError> {
    try {
      saveState(adapter, next, clock.now());
      lastWritten = adapter.get(KEYS.state);
    } catch (e) {
      return err({ code: 'STORAGE', message: isQuotaError(e) ? STORAGE_MESSAGE : `Could not save: ${(e as Error).message}` });
    }
    store.set({ kind: 'ready', state: next });
    return ok(undefined);
  }

  function loadFromStorage(): void {
    const res = loadState(adapter, clock.now());
    if (res.kind === 'empty') {
      const seeded = generateSeed(clock.today());
      const c = commit(seeded);
      if (!c.ok) store.set({ kind: 'ready', state: seeded }); // run in memory if storage is blocked
      return;
    }
    if (res.kind === 'corrupt') {
      store.set({ kind: 'recovery', reason: res.reason, corruptKey: res.corruptKey });
      return;
    }
    const synced = syncNotifications(res.state, clock.today(), clock.now());
    if (synced !== res.state || res.migrated) commit(synced);
    else store.set({ kind: 'ready', state: res.state });
    lastWritten = adapter.get(KEYS.state);
  }

  const userOf = (state: AppState, id: string): DemoUser | undefined => state.users[id];

  const runtime: Runtime = {
    store,
    clock,
    adapter,
    init() {
      if (initialised) return;
      initialised = true;
      loadFromStorage();
      if (typeof window !== 'undefined') {
        // Multi-tab: reload when another tab writes the state key.
        window.addEventListener('storage', (e) => {
          if (e.key !== KEYS.state || e.newValue === lastWritten) return;
          loadFromStorage();
          for (const cb of external) cb();
        });
      }
    },
    getState: current,
    dispatch(command, userId) {
      const state = current();
      if (!state) return err({ code: 'STORAGE', message: 'Data is not loaded.' });
      const user = userOf(state, userId);
      if (!user) return err({ code: 'FORBIDDEN', message: 'No active session.' });
      const exec = execute(state, command, { user, now: clock.now(), today: clock.today(), seeding: false });
      const c = commit(exec.state);
      if (!c.ok) return c;
      return exec.ok ? ok(exec.result) : err(exec.error);
    },
    recordRouteDenied(userId, action, path) {
      const state = current();
      const user = state && userOf(state, userId);
      if (!state || !user) return;
      commit(recordDenied(state, user, action, path, clock.now()));
    },
    resetDemo(userId, confirmation) {
      const state = current();
      const user = state && userOf(state, userId);
      if (!state || !user) return err({ code: 'FORBIDDEN', message: 'No active session.' });
      const decision = can(user, 'demo.reset');
      if (!decision.allowed) {
        commit(appendAudit(state, { action: 'demo.reset', entityType: 'SYSTEM', entityId: 'demo-data', outcome: 'DENIED', comment: decision.reason }, user, clock.now()));
        return err({ code: 'FORBIDDEN', message: decision.reason ?? 'Not permitted.' });
      }
      if (confirmation !== 'RESET') return err({ code: 'VALIDATION', message: 'Type RESET to confirm.', fieldErrors: { confirmation: 'Type RESET to confirm.' } });
      const fresh = generateSeed(clock.today(), { resetBy: user, resetAt: clock.now() });
      for (const k of adapter.keys()) if (k.startsWith('securefdr:v1:draft:')) adapter.remove(k);
      return commit(fresh);
    },
    recoverWithFreshSeed() {
      const fresh = generateSeed(clock.today());
      const c = commit(fresh);
      if (!c.ok) store.set({ kind: 'ready', state: fresh });
    },
    readCorrupt() {
      const s = store.get();
      return s.kind === 'recovery' ? adapter.get(s.corruptKey) ?? adapter.get(KEYS.state) : null;
    },
    syncNotifications() {
      const state = current();
      if (!state) return;
      const next = syncNotifications(state, clock.today(), clock.now());
      if (next !== state) commit(next);
    },
    onExternalUpdate(cb) {
      external.add(cb);
      return () => external.delete(cb);
    },
    drafts: {
      load(userId) {
        try { const raw = adapter.get(KEYS.draft(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
      },
      save(userId, draft) {
        try { adapter.set(KEYS.draft(userId), JSON.stringify(draft)); } catch { /* drafts are best-effort */ }
      },
      clear(userId) { adapter.remove(KEYS.draft(userId)); },
    },
  };
  return runtime;
}
