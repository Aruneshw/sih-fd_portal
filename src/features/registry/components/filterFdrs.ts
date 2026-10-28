import { normaliseReference } from '@/lib/text';
import { parseRupeesInput } from '@/lib/money';
import type { FdrView } from '@/domain/selectors/views';

export interface FdrFilters {
  inst: string; q: string; bank: string; min: string; max: string; band: string; vstatus: string; status: string; renewal: string;
}

export const FILTER_KEYS: (keyof FdrFilters)[] = ['inst', 'q', 'bank', 'min', 'max', 'band', 'vstatus', 'status', 'renewal'];

/** FR-M05-2 — status/vstatus accept comma-separated lists so dashboard KPIs can link to combined views. */
export function filterFdrs(views: FdrView[], f: FdrFilters): FdrView[] {
  const list = (s: string) => s.split(',').filter(Boolean);
  const statuses = list(f.status);
  const vstatuses = list(f.vstatus);
  const min = f.min ? parseRupeesInput(f.min) : null;
  const max = f.max ? parseRupeesInput(f.max) : null;
  const q = f.q.trim().toLowerCase();
  const qn = normaliseReference(f.q);
  return views.filter((v) => {
    if (f.inst && v.fdr.institutionId !== f.inst) return false;
    if (f.bank && v.fdr.bankId !== f.bank) return false;
    if (q && !(v.fdr.id.toLowerCase().includes(q) || (qn && v.fdr.referenceNorm.includes(qn)) || v.fdr.applicationRef.toLowerCase().includes(q))) return false;
    if (min !== null && v.fdr.amountPaise < min) return false;
    if (max !== null && v.fdr.amountPaise > max) return false;
    if (f.band && v.derived.band !== f.band) return false;
    if (statuses.length && !statuses.includes(v.derived.status)) return false;
    if (vstatuses.length && !vstatuses.includes(v.fdr.verificationStatus)) return false;
    if (f.renewal && v.fdr.renewalStatus !== f.renewal) return false;
    return true;
  });
}
