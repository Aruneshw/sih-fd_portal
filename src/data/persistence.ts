import { AppStateSchema, PersistedEnvelopeSchema } from '@/domain/schemas';
import { CURRENT_SCHEMA_VERSION } from '@/domain/defaults';
import type { AppState } from '@/domain/types';
import { migrate } from './migrations';
import { KEYS, type StorageAdapter } from './storage/StorageAdapter';

export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'ok'; state: AppState; migrated: boolean }
  | { kind: 'corrupt'; reason: string; corruptKey: string };

/** Load sequence (architecture.md §10): parse → migrate → validate. Never auto-wipes. */
export function loadState(adapter: StorageAdapter, nowTs: string): LoadResult {
  const raw = adapter.get(KEYS.state);
  if (raw === null) return { kind: 'empty' };
  const quarantine = (reason: string): LoadResult => {
    const corruptKey = KEYS.corrupt(nowTs.replace(/[^0-9]/g, ''));
    try { adapter.set(corruptKey, raw); } catch { /* keep going: the original key still holds it */ }
    return { kind: 'corrupt', reason, corruptKey };
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return quarantine('Stored data is not valid JSON.');
  }
  const env = PersistedEnvelopeSchema.safeParse(parsed);
  if (!env.success || typeof env.data.data !== 'object' || env.data.data === null) return quarantine('Stored data has an unknown format.');
  if (env.data.schemaVersion > CURRENT_SCHEMA_VERSION) return quarantine(`Stored data is from a newer version (${env.data.schemaVersion}).`);
  let data = env.data.data as Record<string, unknown>;
  const migrated = env.data.schemaVersion < CURRENT_SCHEMA_VERSION;
  if (migrated) {
    try { data = migrate(data, env.data.schemaVersion); } catch (e) { return quarantine((e as Error).message); }
  }
  const valid = AppStateSchema.safeParse(data);
  if (!valid.success) {
    const first = valid.error.issues[0];
    return quarantine(`Stored data failed validation at "${first?.path.join('.') ?? '?'}": ${first?.message ?? ''}`);
  }
  return { kind: 'ok', state: valid.data as unknown as AppState, migrated };
}

export function serialiseState(state: AppState, savedAt: string): string {
  return JSON.stringify({ schemaVersion: state.schemaVersion, savedAt, data: state });
}

export function saveState(adapter: StorageAdapter, state: AppState, savedAt: string): void {
  adapter.set(KEYS.state, serialiseState(state, savedAt));
}

export function isQuotaError(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
}
