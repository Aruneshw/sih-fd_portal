import clsx from 'clsx';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, CardBody, CardHeader, EmptyState, PageHeader, StageBadge, Timeline } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { REQUEST_STAGE_LABEL, SIMULATED_DECISION_LABEL } from '@/domain/labels';
import { can } from '@/domain/permissions/can';
import { availableActions, type Transition } from '@/domain/workflows/machine';
import { REQUEST_STAGE_ORDER, requestMachine } from '@/domain/workflows/requestMachine';
import type { RequestStage } from '@/domain/types';
import { useAppState, useUser } from '@/app/hooks';
import { AuditList, DocumentList, FdrLink, useUserName } from '@/features/shared';
import { RequestActionDialog } from '../components/RequestActionDialog';

/** FR-M09-5: full stage timeline with actor, timestamp and notes. */
export function RequestDetailPage() {
  const { id = '' } = useParams();
  const state = useAppState();
  const user = useUser();
  const name = useUserName();
  const [action, setAction] = useState<Transition<RequestStage> | null>(null);
  const r = state.requests[id];
  if (!r || !can(user, 'fdr.view', { institutionId: r.institutionId }).allowed) return <EmptyState title={`Request ${id} not found`} action={<Link to="/requests" className="text-sm text-navy-700 underline">Back to requests</Link>} />;
  const fdr = state.fdrs[r.fdrId];
  const actions = availableActions(requestMachine, r.stage, user, { institutionId: r.institutionId, assignedOfficerId: r.assignedOfficerId });
  const reached = (s: RequestStage) => r.reviewNotes.some((n) => n.stage === s) || r.stage === s;
  const currentIdx = REQUEST_STAGE_ORDER.indexOf(r.stage === 'REJECTED' ? 'APPROVED' : r.stage === 'INFO_REQUESTED' ? 'UNDER_REVIEW' : r.stage === 'RETURNED_FOR_CORRECTION' ? 'SUBMITTED' : r.stage);
  const docs = r.documentIds.map((d) => state.documents[d]).filter(Boolean);
  const audit = state.audit.filter((e) => e.entityId === r.id);

  return (
    <div>
      <PageHeader
        eyebrow={<Link to="/requests" className="hover:underline">Release & refund</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{r.id} <StageBadge stage={r.stage} /></span>}
        description={`${r.type === 'RELEASE' ? 'Release' : 'Refund'} request · ${state.institutions[r.institutionId]?.name ?? r.institutionId}`}
        actions={actions.map((a) => <Button key={a.action} variant={a.action === 'request.reject' ? 'danger' : a.confirm ? 'primary' : 'secondary'} onClick={() => setAction(a)}>{a.label}</Button>)}
      />
      {(r.stage === 'APPROVED' || r.stage === 'REJECTED' || r.decisionRef) && (
        <div className="mb-4 rounded-md border border-amber-600/40 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          <strong>{r.stage === 'REJECTED' ? 'Rejected' : 'Approved'} — {SIMULATED_DECISION_LABEL.toLowerCase()}</strong> (Ref: {r.decisionRef}). {r.finalActionRef ? `Release action recorded (Ref: ${r.finalActionRef}). ` : ''}No funds are moved by this system.
        </div>
      )}
      <Card className="mb-4 p-4">
        <ol className="flex flex-wrap gap-2" aria-label="Request stages">
          {REQUEST_STAGE_ORDER.map((s, i) => {
            const done = i < currentIdx || (r.stage === 'CLOSED' && reached(s));
            const active = i === currentIdx && r.stage !== 'CLOSED';
            const label = s === 'APPROVED' && (r.stage === 'REJECTED' || r.reviewNotes.some((n) => n.stage === 'REJECTED')) ? 'Rejected (simulated)' : s === 'APPROVED' ? 'Approved (simulated)' : REQUEST_STAGE_LABEL[s].split(' —')[0];
            return (
              <li key={s} className={clsx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs', done ? 'bg-teal-50 text-teal-700' : active ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-500')} aria-current={active ? 'step' : undefined}>
                {done && <Check size={12} aria-hidden />}{label}
              </li>
            );
          })}
        </ol>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Stage timeline" />
            <CardBody>
              <Timeline items={[...r.reviewNotes].reverse().map((n, i) => ({ id: `${i}`, title: REQUEST_STAGE_LABEL[n.stage], meta: `${formatDateTime(n.at)} · ${name(n.by)}`, body: n.text, tone: n.stage === 'REJECTED' || n.stage === 'RETURNED_FOR_CORRECTION' ? 'red' : n.stage === 'APPROVED' || n.stage === 'ACTION_RECORDED' || n.stage === 'CLOSED' ? 'teal' : 'navy' }))} />
            </CardBody>
          </Card>
          <Card><CardHeader title="Supporting documents" /><CardBody><DocumentList docs={docs} /></CardBody></Card>
          <Card><CardHeader title="Audit history" /><CardBody><AuditList events={audit} /></CardBody></Card>
        </div>
        <Card className="self-start">
          <CardHeader title="Request details" />
          <CardBody>
            <dl className="space-y-2 text-sm">
              {[
                ['Linked FDR', fdr ? <FdrLink key="f" id={fdr.id} /> : r.fdrId],
                ['Instrument', fdr ? `${fdr.referenceNo} · ${formatINR(fdr.amountPaise)} · matures ${formatDate(fdr.maturityDate)}` : '—'],
                ['Type', r.type === 'RELEASE' ? 'Release' : 'Refund'],
                ['Submitted', formatDateTime(r.submittedAt)],
                ['Reason', r.reason],
                ['Assigned officer', name(r.assignedOfficerId)],
                ['Recommendation', r.recommendation ? (r.recommendation === 'APPROVE' ? 'Approve' : 'Reject') : '—'],
                ['Decision reference', r.decisionRef ?? '—'],
                ['Decision reason', r.decisionReason ?? '—'],
                ['Final action reference', r.finalActionRef ?? '—'],
                ['Closure date', r.closedAt ? formatDate(r.closedAt) : '—'],
              ].map(([k, v]) => <div key={k as string}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>)}
            </dl>
          </CardBody>
        </Card>
      </div>
      {action && <RequestActionDialog action={action} request={r} onClose={() => setAction(null)} />}
    </div>
  );
}
