import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { METHOD_LABEL } from '../../labels';
import type { Finding, VerifiableField } from '../../types';
import { findDuplicates } from '../duplicate';
import { displayValue, fieldLabel, sameValue, submittedValue } from '../fieldValues';
import type { Rule } from '../types';

export const R02: Rule = {
  id: 'R-02', title: 'Exact duplicate reference', severity: 'BLOCKING', appliesTo: 'FDR',
  evaluate: ({ fdrs }) =>
    fdrs.flatMap((f) =>
      findDuplicates(f, fdrs)
        .filter((m) => m.kind === 'EXACT')
        .map((m): Finding => ({
          key: `R-02:${f.id}:${m.other.id}`, ruleId: 'R-02', severity: 'BLOCKING', title: 'Exact duplicate reference',
          explanation: `Reference ${f.referenceNo} at this bank is also recorded on ${m.other.id}.`,
          entityRefs: [{ type: 'FDR', id: f.id }, { type: 'FDR', id: m.other.id }], field: 'referenceNo',
          evidence: { submitted: f.referenceNo, compared: m.other.referenceNo, source: m.other.id },
          suggestedReview: 'Compare both records and their documents; only one instrument can carry this reference.',
        })),
    ),
};

export const R03: Rule = {
  id: 'R-03', title: 'Possible duplicate', severity: 'REVIEW', appliesTo: 'FDR',
  evaluate: ({ fdrs }) =>
    fdrs.flatMap((f) =>
      findDuplicates(f, fdrs)
        .filter((m) => m.kind === 'POSSIBLE')
        .map((m): Finding => ({
          key: `R-03:${f.id}:${m.other.id}`, ruleId: 'R-03', severity: 'REVIEW', title: 'Possible duplicate',
          explanation: `This record resembles ${m.other.id} (${m.other.referenceNo}): ${m.reason}.`,
          entityRefs: [{ type: 'FDR', id: f.id }, { type: 'FDR', id: m.other.id }], field: 'referenceNo',
          evidence: { submitted: f.referenceNo, compared: m.other.referenceNo, source: m.other.id },
          suggestedReview: 'Open both records and confirm with the issuing bank, through an approved channel, that they are different instruments.',
        })),
    ),
};

export const R08: Rule = {
  id: 'R-08', title: 'Document value mismatch', severity: 'REVIEW', appliesTo: 'FDR',
  evaluate: ({ fdrs, state }) =>
    fdrs.flatMap((f) => {
      const ex = state.extracted[f.id];
      if (!ex) return [];
      return (Object.entries(ex.values) as [VerifiableField, string][])
        .filter(([field, v]) => v !== undefined && v !== '' && !sameValue(field, v, submittedValue(f, field)))
        .map(([field, v]): Finding => {
          const read = displayValue(state, field, v);
          const sub = displayValue(state, field, submittedValue(f, field));
          return {
            key: `R-08:${f.id}:${field}`, ruleId: 'R-08', severity: 'REVIEW', title: 'Document value mismatch',
            explanation: `The ${fieldLabel(field)} read from the uploaded document (${read}) differs from the submitted ${fieldLabel(field)} (${sub}). Review the document and confirm the correct value with the issuing bank through an approved channel.`,
            entityRefs: [{ type: 'FDR', id: f.id }], field,
            evidence: { submitted: sub, compared: read, source: ex.source === 'OCR_PORT' ? 'OCR port' : 'Values as read from document (manual)' },
            suggestedReview: 'Compare the document with the submission and record the confirmed value under "Independently verified information".',
          };
        });
    }),
};

export const R10: Rule = {
  id: 'R-10', title: 'Conflicting records', severity: 'REVIEW', appliesTo: 'FDR',
  evaluate: ({ fdrs }) =>
    fdrs.flatMap((f) =>
      fdrs
        .filter((o) => o.id !== f.id && o.referenceNorm === f.referenceNorm && o.bankId === f.bankId)
        .filter((o) => o.amountPaise !== f.amountPaise || o.issueDate !== f.issueDate || o.maturityDate !== f.maturityDate)
        .map((o): Finding => ({
          key: `R-10:${f.id}:${o.id}`, ruleId: 'R-10', severity: 'REVIEW', title: 'Conflicting records',
          explanation: `${f.id} and ${o.id} carry the same reference and bank but differ in amount or dates (${formatINR(f.amountPaise)}, ${formatDate(f.maturityDate)} vs ${formatINR(o.amountPaise)}, ${formatDate(o.maturityDate)}).`,
          entityRefs: [{ type: 'FDR', id: f.id }, { type: 'FDR', id: o.id }],
          suggestedReview: 'Establish which record reflects the instrument and correct or reject the other through the workflow.',
        })),
    ),
};

export const R12: Rule = {
  id: 'R-12', title: 'Verified value differs from submitted', severity: 'REVIEW', appliesTo: 'FDR',
  evaluate: ({ fdrs, state }) => {
    const byFdr = new Map<string, typeof state.verified[string][]>();
    for (const v of Object.values(state.verified)) byFdr.set(v.fdrId, [...(byFdr.get(v.fdrId) ?? []), v]);
    return fdrs.flatMap((f) =>
      (byFdr.get(f.id) ?? [])
        .filter((v) => !sameValue(v.field, v.value, submittedValue(f, v.field)))
        .map((v): Finding => ({
          key: `R-12:${f.id}:${v.field}`, ruleId: 'R-12', severity: 'REVIEW', title: 'Verified value differs from submitted',
          explanation: `The ${fieldLabel(v.field)} recorded as verified (${displayValue(state, v.field, v.value)}, method: ${METHOD_LABEL[v.method]}) differs from the submitted value (${displayValue(state, v.field, submittedValue(f, v.field))}).`,
          entityRefs: [{ type: 'FDR', id: f.id }], field: v.field,
          evidence: { submitted: displayValue(state, v.field, submittedValue(f, v.field)), compared: displayValue(state, v.field, v.value), source: METHOD_LABEL[v.method] },
          suggestedReview: 'Flag a discrepancy or ask the institution to correct the submission.',
        })),
    );
  },
};
