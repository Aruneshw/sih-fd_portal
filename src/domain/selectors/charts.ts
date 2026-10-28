import { addMonthsIso, monthKey, formatMonth } from '@/lib/dates';
import { DISPLAY_STATUS_LABEL, VERIFICATION_STATUS_LABEL } from '../labels';
import { OPEN_VERIFICATION } from '../workflows/verificationMachine';
import type { AppState, DemoUser, DisplayStatus, VerificationStatus } from '../types';
import { isHeld } from './kpis';
import { fdrViewsFor } from './views';

export function statusDistribution(state: AppState, today: string, user: DemoUser) {
  const counts = new Map<DisplayStatus, number>();
  for (const v of fdrViewsFor(state, today, user)) counts.set(v.derived.status, (counts.get(v.derived.status) ?? 0) + 1);
  return [...counts.entries()].map(([status, count]) => ({ status, label: DISPLAY_STATUS_LABEL[status], count })).sort((a, b) => b.count - a.count);
}

/** Next 12 months, count and value of held instruments maturing in each month (FR-M03-3). */
export function maturityTimeline(state: AppState, today: string, user: DemoUser) {
  const months = Array.from({ length: 12 }, (_, i) => monthKey(addMonthsIso(`${today.slice(0, 7)}-01`, i)));
  const rows = months.map((m) => ({ month: m, label: formatMonth(m), count: 0, valuePaise: 0 }));
  for (const v of fdrViewsFor(state, today, user)) {
    if (!isHeld(v) || v.fdr.maturityDate < today) continue;
    const row = rows.find((r) => r.month === monthKey(v.fdr.maturityDate));
    if (row) { row.count += 1; row.valuePaise += v.fdr.amountPaise; }
  }
  return rows;
}

export function officerWorkload(state: AppState) {
  const officers = Object.values(state.users).filter((u) => u.role === 'VERIFICATION_OFFICER');
  const statuses: VerificationStatus[] = OPEN_VERIFICATION.filter((s) => s !== 'SUBMITTED');
  const rows = officers.map((o) => {
    const row: Record<string, string | number> = { officer: o.name };
    for (const s of statuses) row[s] = 0;
    return row;
  });
  for (const f of Object.values(state.fdrs)) {
    if (!f.assignedOfficerId || !statuses.includes(f.verificationStatus)) continue;
    const idx = officers.findIndex((o) => o.id === f.assignedOfficerId);
    if (idx >= 0) rows[idx][f.verificationStatus] = Number(rows[idx][f.verificationStatus]) + 1;
  }
  const used = statuses.filter((s) => rows.some((r) => Number(r[s]) > 0));
  return { rows, series: used.map((s) => ({ key: s, label: VERIFICATION_STATUS_LABEL[s] })) };
}

export function valueByState(state: AppState, today: string, user: DemoUser) {
  const m = new Map<string, { count: number; valuePaise: number }>();
  for (const v of fdrViewsFor(state, today, user)) {
    if (!isHeld(v) || !v.institution) continue;
    const cur = m.get(v.institution.state) ?? { count: 0, valuePaise: 0 };
    m.set(v.institution.state, { count: cur.count + 1, valuePaise: cur.valuePaise + v.fdr.amountPaise });
  }
  return [...m.entries()].map(([state, x]) => ({ state, ...x })).sort((a, b) => b.valuePaise - a.valuePaise);
}
