import { useState } from 'react';
import { Badge, Button, Checkbox, Field, Modal, Select, Textarea } from '@/components/ui';
import { DOCUMENT_KIND_LABEL, FIELD_LABEL, VERIFICATION_STATUS_LABEL } from '@/domain/labels';
import type { ActionId } from '@/domain/permissions/actions';
import { openBlocking } from '@/domain/rules/engine';
import type { FdrView } from '@/domain/selectors/views';
import type { Transition } from '@/domain/workflows/machine';
import type { DocumentKind, VerifiableField, VerificationStatus } from '@/domain/types';
import { useAppState, useCommand } from '@/app/hooks';

const NOTE_ACTIONS: Partial<Record<ActionId, { key: string; label: string; min: number; required: boolean }>> = {
  'verification.requestInfo': { key: 'message', label: 'Message to the institution', min: 10, required: true },
  'verification.flag': { key: 'observation', label: 'Observation (what is inconsistent and why)', min: 20, required: true },
  'verification.resolveFlag': { key: 'note', label: 'Resolution note', min: 5, required: true },
  'verification.escalate': { key: 'note', label: 'Reason for further scrutiny', min: 10, required: true },
  'verification.resumeReview': { key: 'note', label: 'Note (optional)', min: 0, required: false },
  'verification.recommendAccept': { key: 'note', label: 'Recommendation note', min: 5, required: true },
  'verification.recommendReject': { key: 'reason', label: 'Reason for recommending rejection', min: 20, required: true },
  'verification.accept': { key: 'note', label: 'Decision note (optional)', min: 0, required: false },
  'verification.reject': { key: 'reason', label: 'Written reason for rejection (required, C-04)', min: 10, required: true },
  'verification.returnToOfficer': { key: 'note', label: 'Note to the officer', min: 5, required: true },
  'verification.startReview': { key: 'note', label: 'Note (optional)', min: 0, required: false },
};

/** One dialog for every verification transition; payload shape follows the handler schema. */
export function ActionDialog({ action, view, onClose, savedChecklist }: { action: Transition<VerificationStatus>; view: FdrView; onClose: () => void; savedChecklist: Record<string, boolean> }) {
  const state = useAppState();
  const { run, pending, fieldErrors } = useCommand();
  const f = view.fdr;
  const spec = NOTE_ACTIONS[action.action];
  const [text, setText] = useState('');
  const [override, setOverride] = useState('');
  const [link, setLink] = useState(view.openFindings.find((x) => x.severity !== 'INFO')?.key ?? '');
  const [docKinds, setDocKinds] = useState<DocumentKind[]>([]);
  const checklistItems = state.settings.categoryRequirements[f.category]?.checklist ?? [];
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => Object.fromEntries(checklistItems.map((c) => [c, !!savedChecklist[c]])));
  const blocking = openBlocking(view.findings);
  const isAccept = action.action === 'verification.recommendAccept';
  const tooShort = spec?.required && text.trim().length < spec.min;
  const checklistOpen = isAccept && checklistItems.some((c) => !checklist[c]);
  const needsOverride = isAccept && blocking.length > 0 && override.trim().length < 20;

  const submit = () => {
    const payload: Record<string, unknown> = { fdrId: f.id };
    if (spec && text.trim()) payload[spec.key] = text.trim();
    if (action.action === 'verification.flag') {
      if (link.startsWith('field:')) payload.field = link.slice(6);
      else payload.findingKey = link;
    }
    if (action.action === 'verification.requestInfo') payload.documentsRequested = docKinds;
    if (isAccept) { payload.checklist = checklist; if (override.trim()) payload.overrideNote = override.trim(); }
    const r = run({ type: action.action, payload, expectedVersion: f.version }, { success: `${action.label} — recorded.` });
    if (r.ok) onClose();
  };

  const to = action.to ?? f.verificationStatus;
  const succ = f.predecessorId && (action.action === 'verification.accept' || action.action === 'verification.reject');
  return (
    <Modal open onClose={onClose} size="lg" title={`${action.label} — ${f.id}`}
      description={<span>Status will change from <strong>{VERIFICATION_STATUS_LABEL[f.verificationStatus]}</strong> to <strong>{VERIFICATION_STATUS_LABEL[to]}</strong>. This action is recorded in the audit trail.</span>}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={action.action.includes('reject') ? 'danger' : 'primary'} loading={pending} onClick={submit} disabled={!!tooShort || checklistOpen || needsOverride || (action.action === 'verification.flag' && !link)}>{action.label}</Button></>}>
      <div className="space-y-4">
        {succ && (
          <p className="rounded-md border border-violet-700/30 bg-violet-50 px-3 py-2 text-xs text-violet-700">
            This is a {action.action === 'verification.accept' ? 'renewal successor: accepting it will mark' : 'renewal successor: rejecting it will return'} predecessor {f.predecessorId} {action.action === 'verification.accept' ? 'as Superseded (its history is retained).' : 'to Renewal due.'}
          </p>
        )}
        {action.action === 'verification.flag' && (
          <Field label="Linked finding or field" required error={fieldErrors.findingKey}>
            <Select value={link} onChange={(e) => setLink(e.target.value)}>
              <option value="">Select…</option>
              <optgroup label="Open findings">
                {view.openFindings.map((x) => <option key={x.key} value={x.key}>{x.ruleId} · {x.title}</option>)}
              </optgroup>
              <optgroup label="Fields">
                {(Object.keys(FIELD_LABEL) as VerifiableField[]).map((k) => <option key={k} value={`field:${k}`}>{FIELD_LABEL[k]}</option>)}
              </optgroup>
            </Select>
          </Field>
        )}
        {action.action === 'verification.requestInfo' && (
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-sm font-medium text-slate-800">Documents requested</legend>
            {(['FDR_SCAN', 'BANK_CONFIRMATION', 'AUTHORISATION_LETTER'] as DocumentKind[]).map((k) => (
              <Checkbox key={k} label={DOCUMENT_KIND_LABEL[k]} checked={docKinds.includes(k)} onChange={(on) => setDocKinds((d) => (on ? [...d, k] : d.filter((x) => x !== k)))} />
            ))}
          </fieldset>
        )}
        {isAccept && (
          <fieldset className="space-y-1.5 rounded-md border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium text-slate-800">Mandatory checklist (FR-M07-5)</legend>
            {checklistItems.map((c) => <Checkbox key={c} label={c} checked={!!checklist[c]} onChange={(on) => setChecklist((x) => ({ ...x, [c]: on }))} />)}
            {checklistOpen && <p className="text-xs text-amber-700">Complete every checklist item to recommend acceptance.</p>}
          </fieldset>
        )}
        {spec && (
          <Field label={spec.label} required={spec.required} error={fieldErrors[spec.key]} hint={spec.min ? `At least ${spec.min} characters (${text.trim().length} so far).` : undefined}>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} data-autofocus />
          </Field>
        )}
        {isAccept && blocking.length > 0 && (
          <div className="space-y-2 rounded-md border border-red-700/30 bg-red-50 p-3">
            <p className="text-sm text-red-800"><strong>{blocking.length} blocking potential issue{blocking.length === 1 ? '' : 's'} open:</strong> {blocking.map((b) => <Badge key={b.key} tone="red" className="ml-1">{b.ruleId} {b.title}</Badge>)}</p>
            <Field label="Override justification (audited, FR-M07-7)" required error={fieldErrors.overrideNote} hint="At least 20 characters explaining why acceptance can still be recommended.">
              <Textarea value={override} onChange={(e) => setOverride(e.target.value)} maxLength={2000} />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}
