import { OPEN_REQUEST_STAGES } from '../workflows/requestMachine';
import { OPEN_VERIFICATION } from '../workflows/verificationMachine';
import type { AppState, Band, DemoUser, Priority } from '../types';
import { scopedInstitutions, scopedRequests } from './scope';
import { fdrViewsFor, type FdrView } from './views';

export interface Kpi {
  id: string;
  label: string;
  value: number;
  format: 'count' | 'money';
  link: string;
  hint: string;
}

export const isHeld = (v: FdrView) => !['RELEASED', 'SUPERSEDED', 'REJECTED'].includes(v.derived.status);

/** FR-M03-1 — every figure is computed from current, scoped state. */
export function selectKpis(state: AppState, today: string, user: DemoUser): Kpi[] {
  const views = fdrViewsFor(state, today, user);
  const count = (pred: (v: FdrView) => boolean) => views.filter(pred).length;
  const days = state.settings.expiringSoonDays;
  return [
    { id: 'institutions', label: 'Total institutions', value: scopedInstitutions(state, user).length, format: 'count', link: '/institutions', hint: 'Institutions in the registry' },
    { id: 'active', label: 'Active FDRs', value: count((v) => v.derived.status === 'ACTIVE' || v.derived.status === 'EXPIRING_SOON'), format: 'count', link: '/fdrs?status=ACTIVE,EXPIRING_SOON', hint: 'Accepted after verification and not past maturity' },
    { id: 'value', label: 'Total recorded deposit value', value: views.filter(isHeld).reduce((s, v) => s + v.fdr.amountPaise, 0), format: 'money', link: '/fdrs', hint: 'Recorded instruments not released, superseded or rejected' },
    { id: 'expiring', label: `Expiring ≤ ${days} days`, value: count((v) => v.derived.status === 'EXPIRING_SOON'), format: 'count', link: '/fdrs?status=EXPIRING_SOON', hint: 'Accepted instruments maturing soon' },
    { id: 'pending', label: 'Pending verifications', value: count((v) => OPEN_VERIFICATION.includes(v.fdr.verificationStatus)), format: 'count', link: '/fdrs?status=VERIFICATION_PENDING,DISCREPANCY_FLAGGED', hint: 'Submitted, verification not yet concluded' },
    { id: 'overdue', label: 'Overdue renewals', value: count((v) => v.derived.status === 'MATURED'), format: 'count', link: '/fdrs?status=MATURED', hint: 'Matured — action required' },
    { id: 'requests', label: 'Release/refund requests awaiting action', value: scopedRequests(state, user).filter((r) => OPEN_REQUEST_STAGES.includes(r.stage)).length, format: 'count', link: '/requests?open=1', hint: 'Open requests at any stage' },
    { id: 'discrepancies', label: 'Instruments with open discrepancies', value: count((v) => v.derived.status === 'DISCREPANCY_FLAGGED'), format: 'count', link: '/fdrs?status=DISCREPANCY_FLAGGED', hint: 'Flagged by an officer and unresolved' },
  ];
}

export function bandPriority(band: Band): Priority {
  switch (band) {
    case 'MATURED':
    case 'CRITICAL': return 'CRITICAL';
    case 'DUE_SOON': return 'HIGH';
    case 'WATCH': return 'MEDIUM';
    case 'LONG': return 'LOW';
  }
}

export const PRIORITY_RANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
