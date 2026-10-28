import { InstrumentDetailsSchema, instrumentIssues, type InstrumentDetails } from '@/domain/schemas';
import type { Fdr, InstrumentCategory } from '@/domain/types';

export interface InstrumentDraft {
  referenceNo: string;
  bankId: string;
  branch: string;
  amountPaise: number | null;
  issueDate: string;
  maturityDate: string;
  category: InstrumentCategory | '';
  declaredInstitutionCode: string;
  remarks: string;
}

export const emptyDraft = (code = ''): InstrumentDraft => ({ referenceNo: '', bankId: '', branch: '', amountPaise: null, issueDate: '', maturityDate: '', category: '', declaredInstitutionCode: code, remarks: '' });

export const draftFromFdr = (f: Fdr): InstrumentDraft => ({
  referenceNo: f.referenceNo, bankId: f.bankId, branch: f.branch, amountPaise: f.amountPaise, issueDate: f.issueDate, maturityDate: f.maturityDate,
  category: f.category, declaredInstitutionCode: f.declaredInstitutionCode, remarks: f.remarks ?? '',
});

export const FIELD_LABELS: Record<string, string> = {
  referenceNo: 'FDR reference', bankId: 'Bank', branch: 'Branch', amountPaise: 'Amount', issueDate: 'Issue date', maturityDate: 'Maturity date',
  category: 'Category', declaredInstitutionCode: 'Institution code on instrument', remarks: 'Remarks', documents: 'Documents', institutionId: 'Institution', acknowledgeDuplicate: 'Possible duplicate',
};

/** Same zod schema as the command handler (single validation source) plus date/cap rules. */
export function validateDraft(d: InstrumentDraft, today: string, cap: number): { ok: true; details: InstrumentDetails } | { ok: false; errors: Record<string, string> } {
  const parsed = InstrumentDetailsSchema.safeParse({ ...d, amountPaise: d.amountPaise ?? Number.NaN, category: d.category || undefined, remarks: d.remarks || undefined });
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const i of parsed.error.issues) { const k = String(i.path[0]); if (!errors[k]) errors[k] = k === 'category' ? 'Select a category.' : k === 'amountPaise' && d.amountPaise === null ? 'Enter a valid amount.' : i.message; }
  if (d.amountPaise !== null) Object.assign(errors, Object.fromEntries(Object.entries(instrumentIssues({ amountPaise: d.amountPaise, issueDate: d.issueDate, maturityDate: d.maturityDate }, today, cap)).filter(([k]) => !errors[k])));
  if (Object.keys(errors).length || !parsed.success) return { ok: false, errors };
  return { ok: true, details: parsed.data };
}
