import { addDaysIso, formatDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { bandLabel, REQUEST_STAGE_LABEL, VERIFICATION_STATUS_LABEL } from '@/domain/labels';
import { allFdrViews } from '@/domain/selectors/views';
import { OPEN_REQUEST_STAGES } from '@/domain/workflows/requestMachine';
import { OPEN_VERIFICATION } from '@/domain/workflows/verificationMachine';
import type { AppState, Band, Notification, Priority, Role } from '@/domain/types';
import { escalationStages } from './escalation';

export type Candidate = Omit<Notification, 'id' | 'readBy' | 'createdAt' | 'resolvedAt'> & { createdAt?: string };

const at9 = (date: string) => `${date}T09:00:00+05:30`;
const later = (a: string, b: string) => (a > b ? a : b);

const BAND_TRIGGER: Partial<Record<Band, (b: [number, number, number]) => number>> = {
  WATCH: (b) => b[0], DUE_SOON: (b) => b[1], CRITICAL: (b) => b[2],
};
const BAND_PRIORITY: Partial<Record<Band, Priority>> = { WATCH: 'LOW', DUE_SOON: 'MEDIUM', CRITICAL: 'HIGH' };

/** Pure: candidates derived from current data, each with a de-duplication key (architecture.md §14). */
export function generateNotifications(state: AppState, today: string): Candidate[] {
  const out: Candidate[] = [];
  const s = state.settings;
  const lastAudit = (entityId: string, action: string) => [...state.audit].reverse().find((e) => e.entityId === entityId && e.action === action && e.outcome === 'SUCCESS');
  const repOf = (instId: string) => Object.values(state.users).find((u) => u.role === 'INSTITUTION_REP' && u.institutionId === instId);

  for (const v of allFdrViews(state, today).values()) {
    const f = v.fdr;
    const inst = f.institutionId;
    const instName = v.institution?.name ?? inst;
    const base = { institutionId: inst, fdrId: f.id, link: `/fdrs/${f.id}`, escalationStage: 'INITIAL' as const };
    const accepted = f.verificationStatus === 'ACCEPTED' && ['ACTIVE', 'EXPIRING_SOON', 'RENEWAL_PENDING'].includes(v.derived.status);

    if (accepted && v.derived.daysToMaturity >= 0) {
      // One reminder per band reached, so the reminder history shows each step (FR-M08-4).
      for (const band of ['WATCH', 'DUE_SOON', 'CRITICAL'] as Band[]) {
        const threshold = BAND_TRIGGER[band]!(s.maturityBands);
        if (v.derived.daysToMaturity > threshold) continue;
        const trigger = addDaysIso(f.maturityDate, -threshold);
        out.push({
          ...base, dedupeKey: `MAT:${f.id}:${band}`, category: 'UPCOMING_MATURITY', priority: BAND_PRIORITY[band]!,
          title: `${f.id} matures within ${bandLabel(band, s.maturityBands).replace('–', ' to ')}`,
          body: `${instName} · ${formatINR(f.amountPaise)} · maturity ${formatDate(f.maturityDate)}.`,
          audience: { roles: ['ADMIN', 'INSTITUTION_REP'], institutionId: inst }, createdAt: at9(later(trigger, f.createdAt.slice(0, 10))),
        });
      }
    }

    if (v.derived.status === 'MATURED') {
      const rep = repOf(inst);
      for (const st of escalationStages(f.maturityDate, today, s)) {
        out.push({
          ...base, dedupeKey: `OVD:${f.id}:${st.stage}`, category: 'OVERDUE_MATURITY', escalationStage: st.stage,
          priority: st.stage === 'ESCALATED' ? 'CRITICAL' : st.stage === 'FOLLOW_UP' ? 'HIGH' : 'MEDIUM',
          title: `${f.id} matured — action required${st.stage === 'ESCALATED' ? ' (escalated)' : st.stage === 'FOLLOW_UP' ? ' (follow-up)' : ''}`,
          body: `${instName} · matured ${formatDate(f.maturityDate)} with no renewal or release recorded.`,
          audience: { roles: ['ADMIN', 'INSTITUTION_REP'], institutionId: inst, ...(st.stage === 'ESCALATED' && rep?.supervisorId ? { userId: rep.supervisorId } : {}) },
          createdAt: at9(later(st.date, f.createdAt.slice(0, 10))),
        });
      }
    }

    const open = OPEN_VERIFICATION.includes(f.verificationStatus);
    if (open && v.derived.flags.includes('MISSING_DOCUMENTS')) {
      out.push({
        ...base, dedupeKey: `DOC:${f.id}`, category: 'MISSING_DOCUMENTS', priority: 'HIGH',
        title: `${f.id} is missing a required document`, body: `${instName} · required documents for this category are not all attached.`,
        audience: { roles: ['INSTITUTION_REP'], institutionId: inst, userId: f.assignedOfficerId },
      });
    }

    if (open) {
      const st = f.verificationStatus;
      const officerTurn = ['ASSIGNED', 'UNDER_REVIEW', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY'].includes(st);
      const repTurn = st === 'INFO_REQUESTED';
      const roles: Role[] = repTurn ? ['INSTITUTION_REP'] : officerTurn && f.assignedOfficerId ? [] : ['ADMIN'];
      out.push({
        ...base, link: repTurn ? `/fdrs/${f.id}` : `/verification/${f.id}`, dedupeKey: `PV:${f.id}:${st}`, category: 'PENDING_VERIFICATION',
        priority: repTurn || st.startsWith('RECOMMENDED') ? 'HIGH' : 'MEDIUM',
        title: repTurn ? `${f.id}: additional information requested` : st === 'SUBMITTED' ? `${f.id} awaits officer assignment` : `${f.id}: ${VERIFICATION_STATUS_LABEL[st].toLowerCase()}`,
        body: `${instName} · ${formatINR(f.amountPaise)}.`,
        audience: { roles, institutionId: inst, ...(officerTurn && f.assignedOfficerId ? { userId: f.assignedOfficerId } : {}) },
      });
    }

    if (f.verificationStatus === 'DISCREPANCY_FLAGGED') {
      const e = lastAudit(f.id, 'verification.flag');
      out.push({
        ...base, dedupeKey: `DIS:${f.id}:${e?.seq ?? 0}`, category: 'DISCREPANCY_FLAGGED', priority: 'HIGH',
        title: `Discrepancy flagged on ${f.id}`, body: e?.comment ?? 'An officer flagged a discrepancy for review.',
        audience: { roles: ['ADMIN', 'INSTITUTION_REP'], institutionId: inst },
      });
    }

    if (v.derived.flags.includes('RENEWAL_DUE')) {
      out.push({
        ...base, dedupeKey: `REN:${f.id}`, category: 'RENEWAL_DUE', priority: v.derived.daysToMaturity < 0 ? 'HIGH' : 'MEDIUM',
        title: `Renewal due for ${f.id}`, body: `${instName} · maturity ${formatDate(f.maturityDate)}. Submit a renewal or replacement if required.`,
        audience: { roles: ['INSTITUTION_REP'], institutionId: inst },
      });
    }
  }

  for (const r of Object.values(state.requests)) {
    if (!OPEN_REQUEST_STAGES.includes(r.stage)) continue;
    const base = { institutionId: r.institutionId, fdrId: r.fdrId, requestId: r.id, link: `/requests/${r.id}`, escalationStage: 'INITIAL' as const };
    if (r.stage === 'RETURNED_FOR_CORRECTION') {
      const e = lastAudit(r.id, 'request.validate');
      out.push({ ...base, dedupeKey: `RET:${r.id}:${e?.seq ?? 0}`, category: 'REQUEST_RETURNED', priority: 'HIGH', title: `${r.id} returned for correction`, body: e?.comment ?? 'Correct and resubmit the request.', audience: { roles: ['INSTITUTION_REP'], institutionId: r.institutionId } });
      continue;
    }
    const officer = r.stage === 'UNDER_REVIEW' && r.assignedOfficerId;
    const roles: Role[] = r.stage === 'INFO_REQUESTED' ? ['INSTITUTION_REP'] : officer ? [] : ['ADMIN'];
    out.push({
      ...base, dedupeKey: `REQ:${r.id}:${r.stage}`, category: 'REQUEST_AWAITING_ACTION', priority: r.stage === 'RECOMMENDED' ? 'HIGH' : 'MEDIUM',
      title: `${r.id}: ${REQUEST_STAGE_LABEL[r.stage]}`, body: `${r.type === 'RELEASE' ? 'Release' : 'Refund'} request for ${r.fdrId}.`,
      audience: { roles, institutionId: r.institutionId, ...(officer ? { userId: r.assignedOfficerId } : {}) },
    });
  }
  return out;
}

/** Idempotent merge: insert absent keys, never duplicate, never delete read history (NFR-04). */
export function mergeNotifications(state: AppState, candidates: Candidate[], now: string): AppState {
  const byKey = new Map(Object.values(state.notifications).map((n) => [n.dedupeKey, n]));
  const live = new Set(candidates.map((c) => c.dedupeKey));
  let counter = state.counters.NTF ?? 0;
  let changed = false;
  const notifications = { ...state.notifications };
  for (const c of candidates) {
    const existing = byKey.get(c.dedupeKey);
    if (existing) {
      if (existing.resolvedAt) { notifications[existing.id] = { ...existing, resolvedAt: undefined }; changed = true; }
      continue;
    }
    counter += 1;
    const id = `NTF-${String(counter).padStart(6, '0')}`;
    const createdAt = c.createdAt && c.createdAt < now ? c.createdAt : now;
    notifications[id] = JSON.parse(JSON.stringify({ ...c, id, createdAt, readBy: {} })) as Notification;
    byKey.set(c.dedupeKey, notifications[id]);
    changed = true;
  }
  for (const n of Object.values(notifications)) {
    if (!live.has(n.dedupeKey) && !n.resolvedAt) { notifications[n.id] = { ...n, resolvedAt: now }; changed = true; }
  }
  if (!changed) return state;
  return { ...state, notifications, counters: { ...state.counters, NTF: counter } };
}

export function syncNotifications(state: AppState, today: string, now: string): AppState {
  return mergeNotifications(state, generateNotifications(state, today), now);
}
