import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, EmptyState, PageHeader, PriorityBadge, StatusBadge, VerificationBadge } from '@/components/ui';
import { formatINR } from '@/lib/money';
import { suggestedNextStep } from '@/domain/insights/nextStep';
import { fdrView } from '@/domain/selectors/views';
import { availableActions, type Transition } from '@/domain/workflows/machine';
import { verificationMachine } from '@/domain/workflows/verificationMachine';
import type { VerificationStatus } from '@/domain/types';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { useUserName } from '@/features/shared';
import { ActionDialog } from '../components/ActionDialog';
import { AssignDialog } from '../components/AssignDialog';
import { ConclusionsPanel, latestChecklist } from '../components/ConclusionsPanel';
import { DocumentPanel } from '../components/DocumentPanel';
import { FindingsPanel } from '../components/FindingsPanel';
import { SubmittedPanel } from '../components/SubmittedPanel';
import { VerifiedPanel } from '../components/VerifiedPanel';

/** Actions handled inside the panels rather than the action bar. */
const PANEL_ACTIONS = new Set(['verification.recordObservation', 'verification.recordExtracted', 'verification.recordVerified', 'verification.saveChecklist', 'finding.acknowledge', 'finding.dismiss', 'verification.assign', 'verification.respond']);

/** FR-M07-2…7: four clearly separated provenance panels plus document preview. */
export function VerificationWorkspacePage() {
  const { fdrId = '' } = useParams();
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const name = useUserName();
  const [action, setAction] = useState<Transition<VerificationStatus> | null>(null);
  const [assign, setAssign] = useState(false);
  const v = fdrView(state, today, fdrId);
  if (!v) return <EmptyState title={`Record ${fdrId} not found`} action={<Link className="text-sm text-navy-700 underline" to="/verification">Back to queue</Link>} />;
  const f = v.fdr;
  const scope = { institutionId: f.institutionId, assignedOfficerId: f.assignedOfficerId };
  const actions = availableActions(verificationMachine, f.verificationStatus, user, scope);
  const barActions = actions.filter((a) => !PANEL_ACTIONS.has(a.action));
  const canAssign = actions.some((a) => a.action === 'verification.assign');
  const readOnly = !actions.length;

  return (
    <div>
      <PageHeader
        eyebrow={<Link to="/verification" className="hover:underline">Verification centre</Link>}
        title={<span className="flex flex-wrap items-center gap-3"><Link to={`/fdrs/${f.id}`} className="hover:underline">{f.id}</Link><StatusBadge status={v.derived.status} /><VerificationBadge status={f.verificationStatus} /><PriorityBadge priority={f.priority} /></span>}
        description={`${v.institution?.name ?? f.institutionId} · ${formatINR(f.amountPaise)} · Assigned officer: ${name(f.assignedOfficerId)}`}
      />
      <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <span className="mr-1 text-xs font-medium text-slate-500">Actions:</span>
        {canAssign && <Button size="sm" icon={<UserPlus size={14} aria-hidden />} onClick={() => setAssign(true)}>{f.assignedOfficerId ? 'Reassign officer' : 'Assign officer'}</Button>}
        {barActions.map((a) => (
          <Button key={a.action} size="sm" variant={a.action.includes('reject') ? 'danger' : a.action.includes('accept') || a.action.includes('recommendAccept') ? 'success' : a.action === 'verification.flag' ? 'danger' : 'secondary'} onClick={() => setAction(a)}>{a.label}</Button>
        ))}
        {readOnly && <span className="text-xs text-slate-500">{user.role === 'VERIFICATION_OFFICER' && f.assignedOfficerId !== user.id ? 'Read-only — this case is assigned to another officer.' : 'No actions available in the current state for your role.'}</span>}
        <span className="ml-auto text-xs text-slate-600"><strong>Suggested next step (advisory):</strong> {suggestedNextStep(f, user.role, v.openRequest, v.derived.daysToMaturity)}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="xl:sticky xl:top-20 xl:self-start"><DocumentPanel fdr={f} state={state} /></div>
        <div className="space-y-4">
          <SubmittedPanel view={v} state={state} />
          <FindingsPanel view={v} />
          <VerifiedPanel key={`v-${f.version}`} view={v} state={state} />
          <ConclusionsPanel key={`c-${f.version}`} view={v} state={state} />
        </div>
      </div>
      {action && <ActionDialog action={action} view={v} onClose={() => setAction(null)} savedChecklist={latestChecklist(state, f.id)} />}
      {assign && <AssignDialog fdr={f} open onClose={() => setAssign(false)} />}
    </div>
  );
}
