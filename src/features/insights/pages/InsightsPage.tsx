import { Lightbulb, ListChecks } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, CardBody, CardHeader, EmptyState, PageHeader, PriorityBadge } from '@/components/ui';
import { dailySummary, suggestedNextStep } from '@/domain/insights';
import { integrations } from '@/services/integrations';
import { useAppState, useToday, useUser } from '@/app/hooks';
import { useFdrViews } from '@/features/shared';

/** M15 — rule-based, advisory. Every insight shows why, which records and what a human should review (C-12). */
export function InsightsPage() {
  const state = useAppState();
  const today = useToday();
  const user = useUser();
  const views = useFdrViews();
  const insights = useMemo(() => integrations.insights.generate(state, today, user), [state, today, user]);
  const summary = dailySummary(state, today, user, insights);
  const nextSteps = views.filter((v) => !['RELEASED', 'SUPERSEDED'].includes(v.derived.status)).map((v) => ({ v, step: suggestedNextStep(v.fdr, user.role, v.openRequest, v.derived.daysToMaturity) })).filter((x) => x.step !== 'No action needed now.' && !x.step.startsWith('Await')).slice(0, 12);
  return (
    <div className="space-y-4">
      <PageHeader title="Intelligence & Insights — rule-based, advisory" description={`Provider: ${integrations.insights.name}. No generative model and no API key; every statement is computed from recorded data and is a prompt for human review, not a decision.`} />
      <Card className="border-l-4 border-l-navy-700">
        <CardHeader title="Daily action summary" icon={<Lightbulb size={16} aria-hidden />} actions={<Badge tone="navy">I-07 · templated from computed facts</Badge>} />
        <CardBody><p className="text-sm leading-relaxed text-slate-800">{summary}</p></CardBody>
      </Card>
      {!insights.length && <EmptyState title="No insights for your scope right now" />}
      <div className="grid gap-4 lg:grid-cols-2">
        {insights.map((i) => (
          <Card key={i.id}>
            <CardHeader title={i.title} subtitle={<>Rule: {i.rule}</>} actions={<><Badge>{i.id}</Badge><PriorityBadge priority={i.priority} /></>} />
            <CardBody className="space-y-3">
              <div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">What was found</div><p className="mt-0.5 text-sm text-slate-800">{i.why}</p></div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Records involved ({i.records.length})</div>
                <ul className="mt-1 flex flex-wrap gap-1.5">{i.records.slice(0, 12).map((r) => <li key={`${r.type}-${r.id}`}><Link to={r.link} className="inline-block rounded-md border border-slate-200 px-2 py-0.5 text-xs text-navy-700 hover:border-navy-600">{r.label}</Link></li>)}{i.records.length > 12 && <li className="text-xs text-slate-500">+{i.records.length - 12} more</li>}</ul>
              </div>
              <div className="rounded-md bg-navy-50 px-3 py-2 text-sm text-slate-800"><span className="font-medium">What an authorised user should review:</span> {i.reviewAction}</div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader title="Suggested next step per record (advisory)" icon={<ListChecks size={16} aria-hidden />} subtitle="I-08 · lookup table of verification status, renewal, request stage and your role" />
        <ul className="divide-y divide-slate-100">
          {!nextSteps.length && <li className="px-4 py-6 text-center text-sm text-slate-500">No suggested steps for your role.</li>}
          {nextSteps.map(({ v, step }) => <li key={v.fdr.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5"><Link to={`/fdrs/${v.fdr.id}`} className="font-medium text-navy-700 hover:underline">{v.fdr.id}</Link><span className="text-xs text-slate-500">{v.institution?.name}</span><span className="flex-1 text-sm text-slate-800">{step}</span></li>)}
        </ul>
      </Card>
    </div>
  );
}
