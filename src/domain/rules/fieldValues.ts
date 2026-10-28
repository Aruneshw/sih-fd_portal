import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { normaliseReference } from '@/lib/text';
import { FIELD_LABEL } from '../labels';
import type { AppState, Fdr, VerifiableField } from '../types';

/** The value the institution submitted, as a comparable string. */
export function submittedValue(fdr: Fdr, field: VerifiableField): string {
  switch (field) {
    case 'amountPaise': return String(fdr.amountPaise);
    case 'institutionCode': return fdr.declaredInstitutionCode;
    default: return String(fdr[field] ?? '');
  }
}

export function sameValue(field: VerifiableField, a: string, b: string): boolean {
  switch (field) {
    case 'referenceNo': return normaliseReference(a) === normaliseReference(b);
    case 'amountPaise': return Number(a) === Number(b);
    case 'branch':
    case 'institutionCode': return a.trim().toUpperCase() === b.trim().toUpperCase();
    default: return a.trim() === b.trim();
  }
}

export function displayValue(state: AppState, field: VerifiableField, value: string | undefined): string {
  if (value === undefined || value === '') return '—';
  switch (field) {
    case 'amountPaise': return Number.isFinite(Number(value)) ? formatINR(Number(value)) : value;
    case 'bankId': return state.banks[value]?.name ?? value;
    case 'issueDate':
    case 'maturityDate': return formatDate(value);
    default: return value;
  }
}

export function fieldLabel(field: VerifiableField): string {
  return FIELD_LABEL[field].toLowerCase();
}
