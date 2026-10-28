import { AlertTriangle, ArrowRight, Building2, CalendarClock, FileStack, Flag, Hourglass, IndianRupee, RefreshCcw, Send } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody, CardHeader, KpiCard, PageHeader, PriorityBadge, StageBadge, StatusBadge } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { ROLE_LABEL } from '@/domain/labels';
import { maturityTimeline, officerWorkload, statusDistribution, valueByState } from '@/domain/selectors/charts';
import { selectKpis } from '@/domain/selectors/kpis';
import { actionQueue, upcomingMaturities } from '@/domain/selectors/queues';
import { scopedAudit, scopedFdrs, scopedRequests } from '@/domain/selectors/scope';
import { fdrView } from '@/domain/selectors/views';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { useUserName } from '@/features/shared';
import { MaturityTimeline, StatusPie, ValueByState, WorkloadChart } from '../components/Charts';

const ICONS: Record<string, JSX.Element> = {
  institutions: <Building2 size={16} aria-hidden />, active: <FileStack size={16} aria-hidden />, value: <IndianRupee size={16} aria-hidden />,
  expiring: <CalendarClock size={16} aria-hidden />, pending: <Hourglass size={16} aria-hidden />, overdue: <AlertTriangle size={16} aria-hidden />,
  requests: <Send size={16} aria-hidden />, discrepancies: <Flag size={16} aria-hidden />,
};

/** M03 — every figure is computed from current state; every KPI links to a filtered view. */
export function DashboardPage() {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const name = useUserName();
  const kpis = useMemo(() => selectKpis(state, today, user), [state, today, user]);
  const pie = useMemo(() => statusDistribution(state, today, user), [state, today, user]);
  const timeline = useMemo(() => maturityTimeline(state, today, user), [state, today, user]);
  const workload = useMemo(() => officerWorkload(state), [state]);
  const byState = useMemo(() => valueByState(state, today, user), [state, today, user]);
  const queue = actionQueue(state, today, user);
  const upcoming = upcomingMaturities(state, today, user);
  const activity = scopedAudit(state, user).filter((e) => e.outcome === 'SUCCESS' && !e.action.startsWith('notification.')).slice(-8).reverse();
  const recentFdrs = scopedFdrs(state, user).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const recentReqs = scopedRequests(state, user).slice(0, 4);
  const scopeLabel = user.role === 'INSTITUTION_REP' ? state.institutions[user.institutionId ?? '']?.name ?? 'your institution' : 'all institutions';

  return (
    <div className="space-y-5">
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} description={<>{ROLE_LABEL[user.role]} · showing {scopeLabel}. <span className="font-medium text-amber-700">Figures are computed from demonstration data.</span></>} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.id} label={k.label} value={k.format === 'money' ? formatINR(k.value) : k.value.toLocaleString('en-IN')} hint={k.hint} to={k.link} icon={ICONS[k.id]} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Status distribution" subtitle="Derived status of every instrument in scope" /><CardBody><StatusPie data={pie} /></CardBody></Card>
        <Card><CardHeader title="Maturity timeline — next 12 months" subtitle="Count and recorded value of held instruments by maturity month" /><CardBody><MaturityTimeline data={timeline} /></CardBody></Card>
        {user.role !== 'INSTITUTION_REP' && <Card><CardHeader title="Verification workload by officer" subtitle="Open cases by state" /><CardBody><WorkloadChart rows={workload.rows} series={workload.series} /></CardBody></Card>}
        <Card className={user.role === 'INSTITUTION_REP' ? 'lg:col-span-2' : ''}><CardHeader title="Recorded deposit value by state" subtitle="Instruments not released, superseded or rejected" /><CardBody><ValueByState data={byState} /></CardBody></Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="High-priority action queue" />
          <ul className="divide-y divide-slate-100">
            {!queue.length && <li className="px-4 py-6 text-center text-sm text-slate-500">Nothing needs action right now.</li>}
            {queue.map((q) => (
              <li key={q.id}><Link to={q.link} className="flex items-start gap-2 px-4 py-2.5 hover:bg-slate-50"><PriorityBadge priority={q.priority} /><span className="min-w-0"><span className="block text-sm font-medium text-slate-900">{q.title}</span><span className="block truncate text-xs text-slate-500">{q.detail}</span></span></Link></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Upcoming maturities" actions={<Link to="/maturity" className="inline-flex items-center gap-1 text-xs text-navy-700 hover:underline">Maturity view <ArrowRight size={12} aria-hidden /></Link>} />
          <ul className="divide-y divide-slate-100">
            {!upcoming.length && <li className="px-4 py-6 text-center text-sm text-slate-500">No upcoming maturities.</li>}
            {upcoming.map((v) => (
              <li key={v.fdr.id}><Link to={`/fdrs/${v.fdr.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-navy-700">{v.fdr.id}</span><span className="block truncate text-xs text-slate-500">{v.institution?.name} · {formatINR(v.fdr.amountPaise)}</span></span>
                <span className="text-right text-xs"><span className="block font-medium text-slate-900">{formatDate(v.fdr.maturityDate)}</span><span className={v.derived.daysToMaturity <= 7 ? 'font-semibold text-red-700' : 'text-slate-500'}>in {v.derived.daysToMaturity} days</span></span>
              </Link></li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Recent activity" subtitle="From the audit trail" actions={user.role !== 'INSTITUTION_REP' && <Link to="/audit" className="inline-flex items-center gap-1 text-xs text-navy-700 hover:underline">Audit trail <ArrowRight size={12} aria-hidden /></Link>} />
          <ul className="divide-y divide-slate-100">
            {!activity.length && <li className="px-4 py-6 text-center text-sm text-slate-500">{user.role === 'INSTITUTION_REP' ? 'The audit trail is visible to administrators and auditors.' : 'No recent activity.'}</li>}
            {activity.map((e) => (
              <li key={e.id} className="px-4 py-2.5"><span className="block text-sm text-slate-800">{e.comment ?? e.action}</span><span className="block text-xs text-slate-500">{e.entityId} · {name(e.userId)} · {formatDateTime(e.at)}</span></li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent submissions" actions={<Link to="/fdrs?sort=-updated" className="text-xs text-navy-700 hover:underline">Registry</Link>} />
          <ul className="divide-y divide-slate-100">
            {recentFdrs.map((f) => {
              const v = fdrView(state, today, f.id);
              return (
                <li key={f.id}><Link to={`/fdrs/${f.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-navy-700">{f.id} {f.predecessorId && <RefreshCcw size={12} className="inline text-violet-700" aria-label="Renewal" />}</span><span className="block truncate text-xs text-slate-500">{state.institutions[f.institutionId]?.name} · {formatDateTime(f.createdAt)}</span></span>
                  {v && <StatusBadge status={v.derived.status} />}
                </Link></li>
              );
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Recent release / refund requests" actions={<Link to="/requests" className="text-xs text-navy-700 hover:underline">All requests</Link>} />
          <ul className="divide-y divide-slate-100">
            {!recentReqs.length && <li className="px-4 py-6 text-center text-sm text-slate-500">No requests.</li>}
            {recentReqs.map((r) => (
              <li key={r.id}><Link to={`/requests/${r.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-navy-700">{r.id}</span><span className="block truncate text-xs text-slate-500">{r.type === 'RELEASE' ? 'Release' : 'Refund'} · {r.fdrId} · {formatDateTime(r.submittedAt)}</span></span>
                <StageBadge stage={r.stage} />
              </Link></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
