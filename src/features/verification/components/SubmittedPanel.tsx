import { FileWarning } from 'lucide-react';
import { Badge } from '@/components/ui';
import { CATEGORY_LABEL, DOCUMENT_KIND_LABEL, FIELD_LABEL } from '@/domain/labels';
import { displayValue, submittedValue } from '@/domain/rules/fieldValues';
import { missingRequiredDocs } from '@/domain/status/flags';
import type { FdrView } from '@/domain/selectors/views';
import { VERIFIABLE_FIELDS, type AppState } from '@/domain/types';
import { Panel } from './Panel';

export function SubmittedPanel({ view, state }: { view: FdrView; state: AppState }) {
  const f = view.fdr;
  const missing = missingRequiredDocs(f.category, view.documentKinds, state.settings);
  return (
    <Panel n={1} tone="slate" title="Submitted information" tag={<Badge>Entered by the institution</Badge>}>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        {VERIFIABLE_FIELDS.map((k) => (
          <div key={k}><dt className="text-xs text-slate-500">{FIELD_LABEL[k]}</dt><dd className="font-medium text-slate-900">{displayValue(state, k, submittedValue(f, k))}</dd></div>
        ))}
        <div><dt className="text-xs text-slate-500">Category</dt><dd className="font-medium text-slate-900">{CATEGORY_LABEL[f.category]}</dd></div>
        <div><dt className="text-xs text-slate-500">Linked institution code</dt><dd className="font-medium text-slate-900">{view.institution?.aicteCode ?? '—'}</dd></div>
      </dl>
      {missing.length > 0 && (
        <p className="mt-3 flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700"><FileWarning size={14} aria-hidden /> Missing required document: {missing.map((k) => DOCUMENT_KIND_LABEL[k]).join(', ')}</p>
      )}
    </Panel>
  );
}
