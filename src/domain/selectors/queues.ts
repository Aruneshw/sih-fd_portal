import { daysBetween, toBusinessDate } from '@/lib/dates';
import { REQUEST_STAGE_LABEL } from '../labels';
import { OPEN_REQUEST_STAGES } from '../workflows/requestMachine';
import { OPEN_VERIFICATION } from '../workflows/verificationMachine';
import type { AppState, DemoUser, Priority } from '../types';
import { bandPriority, PRIORITY_RANK } from './kpis';
import { scopedRequests } from './scope';
import { fdrViewsFor, type FdrView } from './views';

export interface VerificationQueueItem {
  view: FdrView;
  ageDays: number;
}

export function verificationQueue(state: AppState, today: string, user: DemoUser): VerificationQueueItem[] {
  return fdrViewsFor(state, today, user)
    .filter((v) => OPEN_VERIFICATION.includes(v.fdr.verificationStatus))
    .map((view) => ({ view, ageDays: Math.max(0, daysBetween(toBusinessDate(new Date(view.fdr.createdAt)), today)) }))
    .sort((a, b) => PRIORITY_RANK[a.view.fdr.priority] - PRIORITY_RANK[b.view.fdr.priority] || b.ageDays - a.ageDays);
}

/** FR-M08-3: matured, no accepted renewal, no release, no closed case. */
export function overdueQueue(state: AppState, today: string, user: DemoUser): FdrView[] {
  return fdrViewsFor(state, today, user)
    .filter((v) => v.derived.status === 'MATURED')
    .sort((a, b) => a.derived.daysToMaturity - b.derived.daysToMaturity);
}

export function upcomingMaturities(state: AppState, today: string, user: DemoUser, limit = 8): FdrView[] {
  return fdrViewsFor(state, today, user)
    .filter((v) => v.derived.daysToMaturity >= 0 && ['ACTIVE', 'EXPIRING_SOON', 'RENEWAL_PENDING'].includes(v.derived.status))
    .sort((a, b) => a.derived.daysToMaturity - b.derived.daysToMaturity)
    .slice(0, limit);
}

export interface ActionItem {
  id: string;
  title: string;
  detail: string;
  link: string;
  priority: Priority;
}

/** High-priority queue for the dashboard (FR-M03-4). */
export function actionQueue(state: AppState, today: string, user: DemoUser, limit = 8): ActionItem[] {
  const items: ActionItem[] = [];
  for (const v of fdrViewsFor(state, today, user)) {
    if (v.derived.status === 'MATURED') items.push({ id: `m-${v.fdr.id}`, title: `${v.fdr.id} matured — action required`, detail: `${v.institution?.name ?? ''} · ${-v.derived.daysToMaturity} days past maturity`, link: `/fdrs/${v.fdr.id}`, priority: 'CRITICAL' });
    else if (v.derived.status === 'EXPIRING_SOON' && v.derived.flags.includes('RENEWAL_DUE')) items.push({ id: `e-${v.fdr.id}`, title: `${v.fdr.id} matures in ${v.derived.daysToMaturity} days`, detail: `${v.institution?.name ?? ''} · renewal due`, link: `/fdrs/${v.fdr.id}`, priority: bandPriority(v.derived.band) });
    if (v.derived.status === 'DISCREPANCY_FLAGGED') items.push({ id: `d-${v.fdr.id}`, title: `${v.fdr.id} discrepancy flagged`, detail: v.institution?.name ?? '', link: `/verification/${v.fdr.id}`, priority: 'HIGH' });
    if (v.fdr.verificationStatus === 'SUBMITTED' && user.role === 'ADMIN') items.push({ id: `s-${v.fdr.id}`, title: `${v.fdr.id} awaiting officer assignment`, detail: v.institution?.name ?? '', link: `/verification/${v.fdr.id}`, priority: 'MEDIUM' });
    if ((v.fdr.verificationStatus === 'RECOMMENDED_ACCEPT' || v.fdr.verificationStatus === 'RECOMMENDED_REJECT') && user.role === 'ADMIN') items.push({ id: `r-${v.fdr.id}`, title: `${v.fdr.id} awaiting decision`, detail: v.institution?.name ?? '', link: `/verification/${v.fdr.id}`, priority: 'HIGH' });
    if (v.fdr.verificationStatus === 'INFO_REQUESTED' && user.role === 'INSTITUTION_REP') items.push({ id: `i-${v.fdr.id}`, title: `${v.fdr.id} needs your response`, detail: 'Additional information requested', link: `/fdrs/${v.fdr.id}`, priority: 'HIGH' });
  }
  for (const r of scopedRequests(state, user)) {
    if (!OPEN_REQUEST_STAGES.includes(r.stage)) continue;
    items.push({ id: `q-${r.id}`, title: `${r.id} — ${REQUEST_STAGE_LABEL[r.stage]}`, detail: `${r.type === 'RELEASE' ? 'Release' : 'Refund'} · ${r.fdrId}`, link: `/requests/${r.id}`, priority: r.stage === 'RECOMMENDED' ? 'HIGH' : 'MEDIUM' });
  }
  return items.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || a.id.localeCompare(b.id)).slice(0, limit);
}

/** Open items per institution (S-12 / I-06). */
export function pendingActionsByInstitution(state: AppState, today: string, user: DemoUser): Map<string, number> {
  const m = new Map<string, number>();
  const bump = (id: string) => m.set(id, (m.get(id) ?? 0) + 1);
  for (const v of fdrViewsFor(state, today, user)) {
    if (OPEN_VERIFICATION.includes(v.fdr.verificationStatus)) bump(v.fdr.institutionId);
    if (v.derived.status === 'MATURED') bump(v.fdr.institutionId);
    if (v.derived.flags.includes('RENEWAL_DUE') && v.derived.status !== 'MATURED') bump(v.fdr.institutionId);
  }
  for (const r of scopedRequests(state, user)) if (OPEN_REQUEST_STAGES.includes(r.stage)) bump(r.institutionId);
  return m;
}
