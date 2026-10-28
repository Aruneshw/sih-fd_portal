import { BookOpenCheck, FilePlus2, MessageSquareReply, Pencil, RefreshCcw, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, EmptyState, PageHeader, StageBadge, StatusBadge, Tabs, Timeline } from '@/components/ui';
import { formatDateTime } from '@/lib/dates';
import { ESCALATION_LABEL, FIELD_LABEL, METHOD_LABEL, NOTIFICATION_CATEGORY_LABEL } from '@/domain/labels';
import { can, canAny } from '@/domain/permissions/can';
import { REVIEW_ACTIONS } from '@/domain/permissions/actions';
import { displayValue } from '@/domain/rules/fieldValues';
import { fdrView } from '@/domain/selectors/views';
import { canRenew } from '@/domain/workflows/renewalMachine';
import { EDITABLE_STATUSES } from '@/domain/workflows/verificationMachine';
import type { VerifiableField } from '@/domain/types';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { AuditList, DocumentList, FindingsList, useUrlState, useUserName } from '@/features/shared';
import { DocumentActionModal } from '../components/DocumentActionModal';
import { EditFdrModal } from '../components/EditFdrModal';
import { FdrSummary } from '../components/FdrSummary';
import { RenewalChain } from '../components/RenewalChain';

export function FdrDetailPage() {
  const { id = '' } = useParams();
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const nav = useNavigate();
  const url = useUrlState();
  const name = useUserName();
  const [modal, setModal] = useState<'edit' | 'upload' | 'respond' | null>(null);
  const v = fdrView(state, today, id);

  const audit = useMemo(() => state.audit.filter((e) => e.entityId === id || (e.entityType === 'FINDING' && e.entityId.includes(`:${id}`))), [state.audit, id]);
  if (!v || !can(user, 'fdr.view', { institutionId: v.fdr.institutionId }).allowed) {
    return <EmptyState title={v ? 'This record belongs to another institution' : `Record ${id} not found`} description="Check the record ID, or return to the registry." action={<Link className="text-sm text-navy-700 underline" to="/fdrs">Back to registry</Link>} />;
  }
  const f = v.fdr;
  const scope = { institutionId: f.institutionId, assignedOfficerId: f.assignedOfficerId };
  const docs = f.documentIds.map((d) => state.documents[d]).filter(Boolean);
  const reviews = Object.values(state.reviews).filter((r) => r.fdrId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const verified = Object.values(state.verified).filter((x) => x.fdrId === id);
  const requests = Object.values(state.requests).filter((r) => r.fdrId === id);
  const reminders = Object.values(state.notifications).filter((n) => n.fdrId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const extracted = state.extracted[id];
  const tab = url.get('tab', 'summary');

  const canEdit = can(user, 'fdr.edit', scope).allowed && EDITABLE_STATUSES.includes(f.verificationStatus);
  const canUpload = can(user, 'document.upload', scope).allowed && user.role !== 'VERIFICATION_OFFICER' && !['RELEASED', 'SUPERSEDED'].includes(f.adminStatus);
  const canRespond = can(user, 'verification.respond', scope).allowed && f.verificationStatus === 'INFO_REQUESTED';
  const renew = canRenew(f);
  const canRenewNow = can(user, 'renewal.submit', scope).allowed && renew.ok;
  const canRequest = can(user, 'request.submit', scope).allowed && f.verificationStatus === 'ACCEPTED' && f.adminStatus === 'RECORDED' && f.renewalStatus !== 'SUBMITTED';
  const inVerification = canAny(user, [...REVIEW_ACTIONS, 'verification.assign']);
  const timeline = audit.filter((e) => e.outcome === 'SUCCESS').map((e) => ({ id: e.id, title: e.comment ?? e.action, meta: `${formatDateTime(e.at)} · ${name(e.userId)} · ${e.action}`, tone: (e.action.includes('reject') ? 'red' : e.action.includes('accept') || e.action.includes('supersede') ? 'teal' : 'navy') as 'red' | 'teal' | 'navy' })).reverse();

  return (
    <div>
      <PageHeader
        eyebrow={<Link to="/fdrs" className="hover:underline">FDR registry</Link>}
        title={<span className="flex flex-wrap items-center gap-3">{f.id} <StatusBadge status={v.derived.status} /></span>}
        description={`${v.institution?.name ?? f.institutionId} · ${f.referenceNo} · ${v.bank?.name ?? f.bankId}`}
        actions={
          <>
            {inVerification && <Button icon={<BookOpenCheck size={16} aria-hidden />} onClick={() => nav(`/verification/${f.id}`)}>Open in verification centre</Button>}
            {canRespond && <Button variant="primary" icon={<MessageSquareReply size={16} aria-hidden />} onClick={() => setModal('respond')}>Respond to request</Button>}
            {canEdit && <Button icon={<Pencil size={16} aria-hidden />} onClick={() => setModal('edit')}>Edit</Button>}
            {canUpload && <Button icon={<FilePlus2 size={16} aria-hidden />} onClick={() => setModal('upload')}>Attach documents</Button>}
            {can(user, 'renewal.submit', scope).allowed && <Button icon={<RefreshCcw size={16} aria-hidden />} disabled={!canRenewNow} disabledReason={renew.reason} onClick={() => nav(`/fdrs/${f.id}/renew`)}>Submit renewal</Button>}
            {can(user, 'request.submit', scope).allowed && <Button icon={<Send size={16} aria-hidden />} disabled={!canRequest} disabledReason="Only an accepted instrument with no open request, renewal, release or supersession is eligible." onClick={() => nav(`/requests/new?fdr=${f.id}`)}>Release / refund request</Button>}
          </>
        }
      />
      {f.verificationStatus === 'INFO_REQUESTED' && reviews.filter((r) => r.kind === 'INFO_REQUEST').at(-1) && (
        <div className="mb-4 rounded-md border border-amber-600/40 bg-amber-50 px-3 py-2 text-sm text-amber-700"><strong>Information requested:</strong> {reviews.filter((r) => r.kind === 'INFO_REQUEST').at(-1)!.text}</div>
      )}
      <Card>
        <CardBody>
          <Tabs
            active={tab}
            onChange={(t) => url.set({ tab: t }, { resetPage: false })}
            tabs={[
              { id: 'summary', label: 'Summary' }, { id: 'timeline', label: 'Timeline' }, { id: 'documents', label: 'Documents', count: docs.length },
              { id: 'verification', label: 'Verification history', count: reviews.length + verified.length }, { id: 'renewal', label: 'Renewal chain' },
              { id: 'requests', label: 'Linked requests', count: requests.length }, { id: 'reminders', label: 'Reminders', count: reminders.length },
              { id: 'audit', label: 'Audit history', count: audit.length }, { id: 'findings', label: 'Findings', count: v.openFindings.length },
            ]}
          >
            {tab === 'summary' && <FdrSummary v={v} state={state} role={user.role} />}
            {tab === 'timeline' && <Timeline items={timeline} />}
            {tab === 'documents' && <DocumentList docs={docs} fdr={f} />}
            {tab === 'verification' && (
              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-navy-900">Independently verified information</h3>
                  {verified.length ? (
                    <ul className="space-y-1.5 text-sm">{verified.map((x) => <li key={x.id} className="rounded-md border border-teal-600/30 bg-teal-50 px-3 py-2">{FIELD_LABEL[x.field]}: <strong>{displayValue(state, x.field, x.value)}</strong> — Recorded as verified by {name(x.recordedBy)} · Method: {METHOD_LABEL[x.method]} · {formatDateTime(x.recordedAt)}{x.note ? ` · ${x.note}` : ''}</li>)}</ul>
                  ) : <p className="text-sm text-slate-500">No values have been recorded as verified yet.</p>}
                </section>
                {extracted && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-navy-900">Values as read from document</h3>
                    <p className="text-sm text-slate-700">{(Object.entries(extracted.values) as [VerifiableField, string][]).map(([k, val]) => `${FIELD_LABEL[k]}: ${displayValue(state, k, val)}`).join(' · ')} — entered by {name(extracted.enteredBy)} ({extracted.source === 'OCR_PORT' ? 'OCR port' : 'manual reading'}) · {formatDateTime(extracted.enteredAt)}</p>
                  </section>
                )}
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-navy-900">Officer review entries</h3>
                  <Timeline empty="No review entries yet." items={reviews.map((r) => ({ id: r.id, title: r.kind.replace('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()), meta: `${name(r.officerId)} · ${formatDateTime(r.createdAt)}`, body: r.text, tone: r.kind === 'OVERRIDE' ? 'amber' : r.kind === 'DECISION' ? 'teal' : 'navy' }))} />
                </section>
              </div>
            )}
            {tab === 'renewal' && <RenewalChain state={state} today={today} fdrId={f.id} />}
            {tab === 'requests' && (requests.length ? (
              <ul className="space-y-2">{requests.map((r) => <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm"><Link className="font-medium text-navy-700 hover:underline" to={`/requests/${r.id}`}>{r.id}</Link><span>{r.type === 'RELEASE' ? 'Release' : 'Refund'}</span><StageBadge stage={r.stage} /><span className="text-xs text-slate-500">Submitted {formatDateTime(r.submittedAt)}</span></li>)}</ul>
            ) : <p className="text-sm text-slate-500">No release or refund requests for this instrument.</p>)}
            {tab === 'reminders' && (
              <Timeline empty="No reminders have been generated for this instrument." items={reminders.map((n) => ({ id: n.id, title: n.title, meta: `${formatDateTime(n.createdAt)} · ${NOTIFICATION_CATEGORY_LABEL[n.category]} · ${ESCALATION_LABEL[n.escalationStage]}${n.resolvedAt ? ' · condition resolved' : ''}`, body: n.body, tone: n.escalationStage === 'ESCALATED' ? 'red' : n.resolvedAt ? 'slate' : 'amber' }))} />
            )}
            {tab === 'audit' && <AuditList events={audit} />}
            {tab === 'findings' && <FindingsList findings={v.findings} />}
          </Tabs>
        </CardBody>
      </Card>
      {modal === 'edit' && <EditFdrModal fdr={f} open onClose={() => setModal(null)} />}
      {(modal === 'upload' || modal === 'respond') && <DocumentActionModal fdr={f} mode={modal} open onClose={() => setModal(null)} kinds={modal === 'respond' ? ['INFO_RESPONSE', 'FDR_SCAN', 'BANK_CONFIRMATION'] : ['FDR_SCAN', 'BANK_CONFIRMATION', 'AUTHORISATION_LETTER']} />}
    </div>
  );
}
