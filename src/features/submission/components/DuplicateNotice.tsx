import { AlertTriangle, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Checkbox } from '@/components/ui';
import type { DuplicateMatch } from '@/domain/rules/duplicate';

/** FR-M06-4: exact match blocks; possible duplicate needs acknowledgement. */
export function DuplicateNotice({ matches, canView, acknowledged, onAcknowledge }: { matches: DuplicateMatch[]; canView: (fdrInstitutionId: string) => boolean; acknowledged: boolean; onAcknowledge: (v: boolean) => void }) {
  const exact = matches.find((m) => m.kind === 'EXACT');
  const possible = matches.filter((m) => m.kind === 'POSSIBLE');
  const ref = (m: DuplicateMatch) => (canView(m.other.institutionId) ? <Link className="font-semibold underline" to={`/fdrs/${m.other.id}`}>{m.other.id}</Link> : <strong>{m.other.id}</strong>);
  if (exact) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-md border border-red-700/30 bg-red-50 px-3 py-2.5 text-sm text-red-800">
        <Ban size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span><strong>Exact duplicate — submission blocked.</strong> This reference at this bank is already recorded as {ref(exact)}. Check the reference number, or open the existing record.</span>
      </div>
    );
  }
  if (!possible.length) return null;
  return (
    <div role="alert" className="space-y-2 rounded-md border border-amber-600/40 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          <strong>Potential issue — requires review.</strong> This instrument resembles {possible.map((m, i) => <span key={m.other.id}>{i > 0 && ', '}{ref(m)} ({m.reason})</span>)}. You can continue; a review finding will be created for the verification officer.
        </span>
      </div>
      <Checkbox label="I have checked the reference and confirm this is a different instrument." checked={acknowledged} onChange={onAcknowledge} />
    </div>
  );
}
