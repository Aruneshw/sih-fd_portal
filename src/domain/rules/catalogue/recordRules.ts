import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { missingRequiredDocs } from '../../status/flags';
import { DOCUMENT_KIND_LABEL } from '../../labels';
import type { Finding } from '../../types';
import type { Rule } from '../types';
import { daysBetween } from '@/lib/dates';

const fdrRef = (id: string) => [{ type: 'FDR' as const, id }];

export const R01: Rule = {
  id: 'R-01', title: 'Missing required field', severity: 'BLOCKING', appliesTo: 'FDR',
  evaluate: ({ fdrs }) => {
    const out: Finding[] = [];
    const req: [keyof typeof fdrs[number], string][] = [
      ['referenceNo', 'FDR reference'], ['bankId', 'bank'], ['branch', 'branch'], ['issueDate', 'issue date'],
      ['maturityDate', 'maturity date'], ['declaredInstitutionCode', 'institution code on instrument'],
    ];
    for (const f of fdrs) {
      for (const [field, label] of req) {
        if (!String(f[field] ?? '').trim()) {
          out.push({
            key: `R-01:${f.id}:${String(field)}`, ruleId: 'R-01', severity: 'BLOCKING', title: 'Missing required field',
            explanation: `The ${label} is empty on this record.`, entityRefs: fdrRef(f.id), field: String(field),
            suggestedReview: 'Request the missing detail from the institution before concluding verification.',
          });
        }
      }
    }
    return out;
  },
};

export const R04: Rule = {
  id: 'R-04', title: 'Invalid date sequence', severity: 'BLOCKING', appliesTo: 'FDR',
  evaluate: ({ fdrs, today }) =>
    fdrs.flatMap((f): Finding[] => {
      if (f.maturityDate <= f.issueDate) {
        return [{
          key: `R-04:${f.id}`, ruleId: 'R-04', severity: 'BLOCKING', title: 'Invalid date sequence',
          explanation: `The maturity date (${formatDate(f.maturityDate)}) is not after the issue date (${formatDate(f.issueDate)}).`,
          entityRefs: fdrRef(f.id), field: 'maturityDate', evidence: { submitted: f.maturityDate, compared: f.issueDate },
          suggestedReview: 'Check both dates against the instrument and ask the institution to correct the record.',
        }];
      }
      if (f.issueDate > today) {
        return [{
          key: `R-04:${f.id}`, ruleId: 'R-04', severity: 'BLOCKING', title: 'Invalid date sequence',
          explanation: `The issue date (${formatDate(f.issueDate)}) is in the future.`, entityRefs: fdrRef(f.id), field: 'issueDate',
          suggestedReview: 'Confirm the issue date printed on the instrument.',
        }];
      }
      return [];
    }),
};

export const R05: Rule = {
  id: 'R-05', title: 'Maturity approaching', severity: 'INFO', appliesTo: 'FDR',
  evaluate: ({ fdrs, today, settings }) =>
    fdrs.flatMap((f): Finding[] => {
      if (f.adminStatus === 'RELEASED' || f.adminStatus === 'SUPERSEDED') return [];
      const d = daysBetween(today, f.maturityDate);
      if (d < 0 || d > settings.expiringSoonDays) return [];
      return [{
        key: `R-05:${f.id}`, ruleId: 'R-05', severity: 'INFO', title: 'Maturity approaching',
        explanation: `This instrument matures on ${formatDate(f.maturityDate)} — in ${d} day${d === 1 ? '' : 's'}.`,
        entityRefs: fdrRef(f.id), field: 'maturityDate',
        suggestedReview: 'Confirm whether a renewal or replacement is being arranged by the institution.',
      }];
    }),
};

export const R06: Rule = {
  id: 'R-06', title: 'Maturity passed', severity: 'REVIEW', appliesTo: 'FDR',
  evaluate: ({ fdrs, today }) =>
    fdrs.flatMap((f): Finding[] => {
      if (f.adminStatus === 'RELEASED' || f.adminStatus === 'SUPERSEDED') return [];
      const d = daysBetween(today, f.maturityDate);
      if (d >= 0) return [];
      return [{
        key: `R-06:${f.id}`, ruleId: 'R-06', severity: 'REVIEW', title: 'Maturity passed',
        explanation: `This instrument matured on ${formatDate(f.maturityDate)}, ${-d} day${d === -1 ? '' : 's'} ago, and no renewal or release has been recorded.`,
        entityRefs: fdrRef(f.id), field: 'maturityDate',
        suggestedReview: 'Matured — action required. Follow up with the institution on renewal, replacement or release.',
      }];
    }),
};

export const R07: Rule = {
  id: 'R-07', title: 'Institution identifier mismatch', severity: 'REVIEW', appliesTo: 'FDR',
  evaluate: ({ fdrs, state }) =>
    fdrs.flatMap((f): Finding[] => {
      const inst = state.institutions[f.institutionId];
      if (!inst || !f.declaredInstitutionCode.trim()) return [];
      if (f.declaredInstitutionCode.trim().toUpperCase() === inst.aicteCode.toUpperCase()) return [];
      return [{
        key: `R-07:${f.id}`, ruleId: 'R-07', severity: 'REVIEW', title: 'Institution identifier mismatch',
        explanation: `The institution code written on the instrument (${f.declaredInstitutionCode}) differs from the linked institution's code (${inst.aicteCode}).`,
        entityRefs: [{ type: 'FDR', id: f.id }, { type: 'INSTITUTION', id: inst.id }], field: 'institutionCode',
        evidence: { submitted: f.declaredInstitutionCode, compared: inst.aicteCode, source: 'Institution registry' },
        suggestedReview: 'Check whether the instrument was issued in favour of this institution.',
      }];
    }),
};

export const R09: Rule = {
  id: 'R-09', title: 'Missing supporting document', severity: 'BLOCKING', appliesTo: 'FDR',
  evaluate: ({ fdrs, state, settings }) =>
    fdrs.flatMap((f): Finding[] => {
      const kinds = f.documentIds.map((d) => state.documents[d]?.kind).filter(Boolean) as string[];
      return missingRequiredDocs(f.category, kinds, settings).map((kind) => ({
        key: `R-09:${f.id}:${kind}`, ruleId: 'R-09', severity: 'BLOCKING' as const, title: 'Missing supporting document',
        explanation: `The ${DOCUMENT_KIND_LABEL[kind].toLowerCase()} required for this instrument category is not attached.`,
        entityRefs: fdrRef(f.id), field: kind,
        suggestedReview: 'Request the document from the institution using "Request additional documents".',
      }));
    }),
};

export const R11: Rule = {
  id: 'R-11', title: 'Amount outside configured range', severity: 'REVIEW', appliesTo: 'FDR',
  evaluate: ({ fdrs, settings }) =>
    fdrs.flatMap((f): Finding[] =>
      f.amountPaise <= 0 || f.amountPaise > settings.amountCapPaise
        ? [{
            key: `R-11:${f.id}`, ruleId: 'R-11', severity: 'REVIEW', title: 'Amount outside configured range',
            explanation: `The amount ${formatINR(f.amountPaise)} is outside the configured range (up to ${formatINR(settings.amountCapPaise)}).`,
            entityRefs: fdrRef(f.id), field: 'amountPaise',
            suggestedReview: 'Confirm the amount on the instrument and the applicable deposit requirement.',
          }]
        : [],
    ),
};
