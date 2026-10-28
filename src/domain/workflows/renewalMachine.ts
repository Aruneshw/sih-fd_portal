import type { Fdr } from '../types';

/**
 * Renewal / replacement rules (architecture.md §7.2). Renewal is not a table
 * of its own: it is a guard on the predecessor plus side effects applied when
 * the successor's verification is decided.
 */
export function canRenew(fdr: Fdr): { ok: boolean; reason?: string } {
  if (fdr.verificationStatus !== 'ACCEPTED') return { ok: false, reason: 'Only an accepted instrument can be renewed or replaced.' };
  if (fdr.adminStatus === 'RELEASED' || fdr.adminStatus === 'SUPERSEDED') return { ok: false, reason: 'This instrument is already released or superseded.' };
  if (fdr.adminStatus === 'RELEASE_REQUESTED') return { ok: false, reason: 'A release/refund request is open for this instrument.' };
  if (fdr.renewalStatus === 'SUBMITTED') return { ok: false, reason: 'A renewal is already under verification.' };
  return { ok: true };
}
