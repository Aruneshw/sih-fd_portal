import { padded } from '@/lib/ids';
import type { AppState, AuditEvent, DemoUser, EntityType } from '@/domain/types';
import { GENESIS, hashEvent } from './hashChain';

export interface AuditDraft {
  action: string;
  entityType: EntityType;
  entityId: string;
  before?: unknown;
  after?: unknown;
  comment?: string;
  outcome?: AuditEvent['outcome'];
  /** Override for system-generated events (e.g. automatic request validation). */
  system?: boolean;
}

/**
 * The only function that writes audit events. There is deliberately no update
 * or delete counterpart anywhere in the codebase (C-11).
 */
export function appendAudit(state: AppState, draft: AuditDraft, actor: DemoUser | null, at: string): AppState {
  const last = state.audit[state.audit.length - 1];
  const seq = (last?.seq ?? 0) + 1;
  const base: Omit<AuditEvent, 'hash'> = {
    id: padded('AUD-', seq, 6),
    seq,
    at,
    userId: draft.system || !actor ? 'SYSTEM' : actor.id,
    role: draft.system || !actor ? 'SYSTEM' : actor.role,
    action: draft.action,
    entityType: draft.entityType,
    entityId: draft.entityId,
    before: draft.before,
    after: draft.after,
    comment: draft.comment,
    outcome: draft.outcome ?? 'SUCCESS',
    prevHash: last?.hash ?? GENESIS,
  };
  // Drop undefined keys so the stored JSON and the hashed canonical form match exactly.
  const clean = JSON.parse(JSON.stringify(base)) as Omit<AuditEvent, 'hash'>;
  const event: AuditEvent = { ...clean, hash: hashEvent(clean) };
  return { ...state, audit: [...state.audit, event] };
}

/** Only changed keys, for compact before/after snapshots. */
export function diff<T extends object>(before: T, after: T, ignore: string[] = ['version', 'updatedAt']): { before: Partial<T>; after: Partial<T> } {
  const b: Partial<T> = {};
  const a: Partial<T> = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof T & string>;
  for (const k of keys) {
    if (ignore.includes(k)) continue;
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return { before: b, after: a };
}
