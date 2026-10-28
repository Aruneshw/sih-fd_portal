import { levenshtein } from '@/lib/text';
import type { Fdr } from '../types';

export type DuplicateKind = 'EXACT' | 'POSSIBLE';

export interface DuplicateMatch {
  kind: DuplicateKind;
  other: Fdr;
  reason: string;
}

/** Duplicate detection shared by R-02/R-03 and the submission wizard (FR-M06-4). */
export function findDuplicates(
  candidate: Pick<Fdr, 'referenceNorm' | 'bankId' | 'amountPaise' | 'issueDate'> & { id?: string },
  others: Fdr[],
): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  for (const o of others) {
    if (o.id === candidate.id || o.verificationStatus === 'REJECTED') continue;
    if (o.referenceNorm === candidate.referenceNorm && o.bankId === candidate.bankId) {
      out.push({ kind: 'EXACT', other: o, reason: 'same reference and same bank' });
    } else if (o.referenceNorm === candidate.referenceNorm) {
      out.push({ kind: 'POSSIBLE', other: o, reason: 'same reference at a different bank' });
    } else if (o.bankId === candidate.bankId && candidate.referenceNorm.length > 4 && levenshtein(o.referenceNorm, candidate.referenceNorm) <= 1) {
      out.push({ kind: 'POSSIBLE', other: o, reason: 'reference differs by one character at the same bank' });
    } else if (o.bankId === candidate.bankId && o.amountPaise === candidate.amountPaise && o.issueDate === candidate.issueDate) {
      out.push({ kind: 'POSSIBLE', other: o, reason: 'same bank, amount and issue date' });
    }
  }
  return out;
}
