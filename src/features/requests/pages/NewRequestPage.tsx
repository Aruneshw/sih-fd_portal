import { Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Field, FormErrorSummary, PageHeader, Select, Textarea } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import type { DocumentDraft } from '@/domain/schemas';
import { scopedFdrs } from '@/domain/selectors/scope';
import { OPEN_REQUEST_STAGES } from '@/domain/workflows/requestMachine';
import { useAppState, useCommand, useUser } from '@/app/hooks';
import { DocumentUploader } from '@/features/shared';

/** FR-M09-1/3: one open request per FDR; FDR must be accepted and not superseded or released. */
export function NewRequestPage() {
  const state = useAppState();
  const user = useUser();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { run, pending, fieldErrors } = useCommand();
  const open = new Set(Object.values(state.requests).filter((r) => OPEN_REQUEST_STAGES.includes(r.stage)).map((r) => r.fdrId));
  const eligible = scopedFdrs(state, user).filter((f) => f.verificationStatus === 'ACCEPTED' && f.adminStatus === 'RECORDED' && f.renewalStatus !== 'SUBMITTED' && !open.has(f.id)).sort((a, b) => a.id.localeCompare(b.id));
  const [fdrId, setFdrId] = useState(eligible.some((f) => f.id === params.get('fdr')) ? params.get('fdr')! : '');
  const [type, setType] = useState<'RELEASE' | 'REFUND'>('RELEASE');
  const [reason, setReason] = useState('');
  const [docs, setDocs] = useState<DocumentDraft[]>([]);
  const submit = () => {
    const r = run({ type: 'request.submit', payload: { fdrId, type, reason, documents: docs } });
    if (!r.ok) return;
    const v = r.value as { requestId: string; stage: string };
    nav(`/requests/${v.requestId}`);
  };
  const f = state.fdrs[fdrId];
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New release / refund request" description="System validation runs automatically on submission: the reason must be at least 30 characters and a supporting document must be attached, otherwise the request is returned for correction." />
      <Card>
        <CardBody className="space-y-4">
          <FormErrorSummary errors={fieldErrors} />
          <Field label="Instrument" required error={fieldErrors.fdrId} hint={eligible.length ? 'Only accepted instruments without an open request, pending renewal, release or supersession are listed.' : 'No eligible instruments.'}>
            <Select value={fdrId} onChange={(e) => setFdrId(e.target.value)}>
              <option value="">Select instrument…</option>
              {eligible.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.referenceNo} · {formatINR(x.amountPaise)} · matures {formatDate(x.maturityDate)}</option>)}
            </Select>
          </Field>
          {f && <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">{state.institutions[f.institutionId]?.name} · {state.banks[f.bankId]?.name} · {f.branch}</p>}
          <Field label="Request type" required>
            <Select value={type} onChange={(e) => setType(e.target.value as 'RELEASE' | 'REFUND')}>
              <option value="RELEASE">Release</option>
              <option value="REFUND">Refund</option>
            </Select>
          </Field>
          <Field label="Reason" required error={fieldErrors.reason} hint={`${reason.trim().length} characters (30 or more needed to pass validation).`}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={2000} />
          </Field>
          <DocumentUploader drafts={docs} onChange={setDocs} kinds={['REQUEST_SUPPORT']} />
        </CardBody>
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <Button onClick={() => nav(-1)}>Cancel</Button>
          <Button variant="primary" icon={<Send size={16} aria-hidden />} loading={pending} disabled={!fdrId || !reason.trim()} onClick={submit}>Submit request</Button>
        </div>
      </Card>
    </div>
  );
}
