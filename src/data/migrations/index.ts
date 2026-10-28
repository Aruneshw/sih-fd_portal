import { CURRENT_SCHEMA_VERSION } from '@/domain/defaults';
import { migrateToV1 } from './v1';

type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

/** Index i migrates from version i to i + 1. */
const MIGRATIONS: Migration[] = [migrateToV1];

export function migrate(data: Record<string, unknown>, fromVersion: number): Record<string, unknown> {
  let d = data;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`No migration from schema version ${v}.`);
    d = m(d);
  }
  return d;
}
