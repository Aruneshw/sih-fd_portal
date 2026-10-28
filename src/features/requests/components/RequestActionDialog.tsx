import { useState } from 'react';
import { Button, Field, Input, Modal, Select, Textarea } from '@/components/ui';
import { REQUEST_STAGE_LABEL, SIMULATED_DECISION_LABEL } from '@/domain/labels';
import type { DocumentDraft } from '@/domain/schemas';
import type { Transition } from '@/domain/workflows/machine';
import type { ReleaseRequest, RequestStage } from '@/domain/types';
import { useAppState, useCommand } from '@/app/hooks';
import { DocumentUploader } from '@/features/shared';

/** FR-M09-4: approve/reject need a confirmation, decision reference and reason, with the C-05 label. */
export function RequestActionDialog({ action, request, onClose }: { action: Transition<RequestStage>; request: ReleaseRequest; onClose: () => void }) {
  const state = useAppState();
  const { run, pending, fieldErrors } = useCommand();
  const a = action.action;
  const [text, setText] = useState(a === 'request.resubmit' ? request.reason : '');
  const [ref, setRef] = useState('');
  const [officer, setOfficer] = useState('');
  const [rec, setRec] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [docs, setDocs] = useState<DocumentDraft[]>([]);
  const decision = a === 'request.approve' || a === 'request.reject';

  const payload = (): Record<string, unknown> => {
    const p: Record<string, unknown> = { requestId: request.id };
    switch (a) {
      case 'request.resubmit': return { ...p, reason: text, documents: docs };
      case 'request.assign': return { ...p, officerId: officer };
      case 'request.requestInfo': return { ...p, message: text };
      case 'request.respond': return { ...p, note: text, documents: docs };
      case 'request.recommend': return { ...p, recommendation: rec, notes: text };
      case 'request.approve':
      case 'request.reject': return { ...p, decisionRef: ref, reason: text };
      case 'request.returnToOfficer': return { ...p, note: text };
      case 'request.recordAction': return { ...p, finalActionRef: ref };
      case 'request.close': return { ...p, note: text || undefined };
      default: return p;
    }
  };
  const submit = () => {
    const r = run({ type: a, payload: payload(), expectedVersion: request.version }, { success: `${action.label} — recorded.` });
    if (r.ok) onClose();
  };
  const textLabel: Record<string, string> = {
    'request.resubmit': 'Corrected reason', 'request.requestInfo': 'Information required', 'request.respond': 'Response note', 'request.recommend': 'Review notes',
    'request.approve': 'Decision note', 'request.reject': 'Reason for rejection', 'request.returnToOfficer': 'Note to the officer', 'request.close': 'Closure note (optional)',
  };
  return (
    <Modal open onClose={onClose} size="lg" title={`${action.label} — ${request.id}`}
      description={<span>Stage will change from <strong>{REQUEST_STAGE_LABEL[request.stage]}</strong>{action.to ? <> to <strong>{REQUEST_STAGE_LABEL[action.to]}</strong></> : null}. Recorded in the audit trail.</span>}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={a === 'request.reject' ? 'danger' : 'primary'} loading={pending} onClick={submit}>{action.label}</Button></>}>
      <div className="space-y-4">
        {decision && <p className="rounded-md border border-amber-600/40 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">{SIMULATED_DECISION_LABEL}. This records a decision in the prototype only — no refund is paid and no funds are released.</p>}
        {a === 'request.recordAction' && <p className="rounded-md border border-amber-600/40 bg-amber-50 px-3 py-2 text-sm text-amber-700">Records that the final administrative action was taken outside this system. The instrument's administrative status becomes “Released (simulated)”.</p>}
        {a === 'request.assign' && (
          <Field label="Verification officer" required error={fieldErrors.officerId}>
            <Select value={officer} onChange={(e) => setOfficer(e.target.value)} data-autofocus>
              <option value="">Select officer…</option>
              {Object.values(state.users).filter((u) => u.role === 'VERIFICATION_OFFICER' && u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </Field>
        )}
        {a === 'request.recommend' && (
          <Field label="Recommendation" required>
            <Select value={rec} onChange={(e) => setRec(e.target.value as 'APPROVE' | 'REJECT')}><option value="APPROVE">Recommend approval</option><option value="REJECT">Recommend rejection</option></Select>
          </Field>
        )}
        {(decision || a === 'request.recordAction') && (
          <Field label={a === 'request.recordAction' ? 'Final action reference' : 'Decision reference'} required error={fieldErrors.decisionRef ?? fieldErrors.finalActionRef} hint="e.g. AICTE/RB/DEMO/2026/014">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} data-autofocus />
          </Field>
        )}
        {textLabel[a] && (
          <Field label={textLabel[a]} required={a !== 'request.close' && a !== 'request.respond'} error={fieldErrors.reason ?? fieldErrors.message ?? fieldErrors.notes ?? fieldErrors.note}>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} />
          </Field>
        )}
        {(a === 'request.resubmit' || a === 'request.respond') && <DocumentUploader drafts={docs} onChange={setDocs} kinds={['REQUEST_SUPPORT', 'INFO_RESPONSE']} />}
      </div>
    </Modal>
  );
}
