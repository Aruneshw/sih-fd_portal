import { formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { VERIFICATION_STATUS_LABEL } from '../../labels';
import { isOpen } from '../../rules/engine';
import { pendingActionsByInstitution, verificationQueue } from '../../selectors/queues';
import { fdrViewsFor, type FdrView } from '../../selectors/views';
import type { AppState, DemoUser, Insight } from '../../types';

type Gen = (state: AppState, today: string, user: DemoUser) => Insight[];

const rec = (v: FdrView, link = `/fdrs/${v.fdr.id}`) => ({ type: 'FDR' as const, id: v.fdr.id, label: `${v.fdr.id} · ${v.institution?.name ?? v.fdr.institutionId}`, link });

const findingInsight = (id: string, kind: string, title: string, ruleIds: string[], rule: string, reviewAction: string, priority: Insight['priority']): Gen =>
  (state, today, user) => {
    const views = fdrViewsFor(state, today, user).filter((v) => v.findings.some((f) => ruleIds.includes(f.ruleId) && isOpen(f)));
    if (!views.length) return [];
    return [{
      id, kind, title, rule, reviewAction, priority,
      why: `${views.length} instrument${views.length === 1 ? '' : 's'} ha${views.length === 1 ? 's' : 've'} an open finding from rule${ruleIds.length > 1 ? 's' : ''} ${ruleIds.join(', ')}.`,
      records: views.map((v) => rec(v, `/verification/${v.fdr.id}`)),
    }];
  };

const I01: Gen = (state, today, user) => {
  const views = fdrViewsFor(state, today, user)
    .filter((v) => (v.derived.band === 'CRITICAL' || v.derived.band === 'MATURED') && !['RELEASED', 'SUPERSEDED', 'REJECTED'].includes(v.derived.status))
    .sort((a, b) => a.derived.daysToMaturity - b.derived.daysToMaturity || b.fdr.amountPaise - a.fdr.amountPaise);
  if (!views.length) return [];
  return [{
    id: 'I-01', kind: 'MATURITY_PRIORITY', title: 'Maturity priority list', priority: 'CRITICAL',
    rule: `Bands CRITICAL (0–${state.settings.maturityBands[2]} days) and MATURED, ordered by days remaining then amount`,
    why: `${views.length} instrument${views.length === 1 ? '' : 's'} mature within ${state.settings.maturityBands[2]} days or have already matured, totalling ${formatINR(views.reduce((s, v) => s + v.fdr.amountPaise, 0))}.`,
    records: views.map((v) => ({ ...rec(v), label: `${v.fdr.id} · ${v.derived.daysToMaturity < 0 ? `matured ${formatDate(v.fdr.maturityDate)}` : `matures ${formatDate(v.fdr.maturityDate)}`}` })),
    reviewAction: 'Confirm a renewal, replacement or release is in progress for each instrument.',
  }];
};

const I05: Gen = (state, today, user) => {
  const q = verificationQueue(state, today, user);
  if (!q.length) return [];
  const byState = new Map<string, number>();
  const byOfficer = new Map<string, number>();
  for (const { view } of q) {
    byState.set(view.fdr.verificationStatus, (byState.get(view.fdr.verificationStatus) ?? 0) + 1);
    const o = view.fdr.assignedOfficerId ? state.users[view.fdr.assignedOfficerId]?.name ?? 'Unknown' : 'Unassigned';
    byOfficer.set(o, (byOfficer.get(o) ?? 0) + 1);
  }
  const oldest = [...q].sort((a, b) => b.ageDays - a.ageDays)[0];
  return [{
    id: 'I-05', kind: 'BACKLOG', title: 'Verification backlog', priority: q.length > 8 ? 'HIGH' : 'MEDIUM',
    rule: 'Open verification cases grouped by state and officer',
    why: `${q.length} open case${q.length === 1 ? '' : 's'}: ${[...byState].map(([s, n]) => `${n} ${VERIFICATION_STATUS_LABEL[s as keyof typeof VERIFICATION_STATUS_LABEL].toLowerCase()}`).join(', ')}. By officer: ${[...byOfficer].map(([o, n]) => `${o} ${n}`).join(', ')}. Oldest case is ${oldest.ageDays} days old (${oldest.view.fdr.id}).`,
    records: q.slice(0, 10).map(({ view }) => rec(view, `/verification/${view.fdr.id}`)),
    reviewAction: 'Rebalance assignments if one officer holds most of the queue; prioritise the oldest cases.',
  }];
};

const I06: Gen = (state, today, user) => {
  const m = pendingActionsByInstitution(state, today, user);
  const hits = [...m.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  if (!hits.length) return [];
  return [{
    id: 'I-06', kind: 'INSTITUTION_LOAD', title: 'Institutions with multiple pending actions', priority: 'HIGH',
    rule: '3 or more open items (verification, maturity, renewal, request) per institution',
    why: hits.map(([id, n]) => `${state.institutions[id]?.name ?? id}: ${n} open items`).join('; ') + '.',
    records: hits.map(([id]) => ({ type: 'INSTITUTION' as const, id, label: `${id} · ${state.institutions[id]?.name ?? ''}`, link: `/institutions/${id}` })),
    reviewAction: 'Contact the institution representative to clear pending items together.',
  }];
};

export const REVIEW_RULES: Gen[] = [
  I01,
  findingInsight('I-02', 'DUPLICATES', 'Duplicate references', ['R-02', 'R-03'], 'R-02 exact duplicate, R-03 possible duplicate', 'Compare the records and confirm with the issuing bank through an approved channel that they are distinct instruments.', 'HIGH'),
  findingInsight('I-03', 'INCOMPLETE', 'Incomplete submissions', ['R-01', 'R-09'], 'R-01 missing field, R-09 missing document', 'Request the missing details or documents from the institution.', 'HIGH'),
  findingInsight('I-04', 'INCONSISTENT', 'Inconsistent fields', ['R-07', 'R-08', 'R-10', 'R-12'], 'R-07, R-08, R-10, R-12 field comparisons', 'Compare the submitted, document and verified values and record a conclusion.', 'MEDIUM'),
  I05,
  I06,
];
