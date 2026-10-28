/** v0 (pre-release drafts without banks/notification resolution) → v1. Pure. */
export function migrateToV1(old: Record<string, unknown>): Record<string, unknown> {
  return {
    ...old,
    banks: old.banks ?? {},
    counters: old.counters ?? {},
    schemaVersion: 1,
  };
}
