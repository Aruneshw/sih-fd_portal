import { canonicalJSON, sha256Sync } from '@/lib/hash';
import type { AuditEvent } from '@/domain/types';

export const GENESIS = 'GENESIS';

export function hashEvent(e: Omit<AuditEvent, 'hash'> & { hash?: string }): string {
  const { hash: _omit, ...rest } = e;
  return sha256Sync(canonicalJSON(rest));
}

export type ChainCheck = { ok: true; count: number } | { ok: false; firstBrokenSeq: number; reason: string };

/** Recompute every hash and link (FR-M12-4). */
export function verifyChain(audit: AuditEvent[]): ChainCheck {
  let prev = GENESIS;
  for (let i = 0; i < audit.length; i++) {
    const e = audit[i];
    if (e.prevHash !== prev) return { ok: false, firstBrokenSeq: e.seq, reason: 'Link to the previous event does not match.' };
    if (hashEvent(e) !== e.hash) return { ok: false, firstBrokenSeq: e.seq, reason: 'Event content does not match its stored hash.' };
    if (i > 0 && e.seq !== audit[i - 1].seq + 1) return { ok: false, firstBrokenSeq: e.seq, reason: 'Sequence number gap.' };
    prev = e.hash;
  }
  return { ok: true, count: audit.length };
}
