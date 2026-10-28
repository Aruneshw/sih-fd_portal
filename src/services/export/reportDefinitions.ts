import { formatDate, formatDateTime, toBusinessDate } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import {
  DISPLAY_STATUS_LABEL, FLAG_LABEL, INSTITUTION_TYPE_LABEL, RENEWAL_STATUS_LABEL, REQUEST_STAGE_LABEL, ROLE_LABEL, SEVERITY_LABEL, VERIFICATION_STATUS_LABEL, bandLabel,
} from '@/domain/labels';
import type { ActionId } from '@/domain/permissions/actions';
import { isOpen } from '@/domain/rules/engine';
import { isHeld } from '@/domain/selectors/kpis';
import { scopedAudit, scopedInstitutions, scopedRequests } from '@/domain/selectors/scope';
import { fdrViewsFor, type FdrView } from '@/domain/selectors/views';
import { OPEN_VERIFICATION } from '@/domain/workflows/verificationMachine';
import { daysBetween } from '@/lib/dates';
import type { AppState, DemoUser, DisplayStatus } from '@/domain/types';

export interface ReportFilters { from: string; to: string; status: string }
export interface ReportOutput { headers: string[]; rows: (string | number)[][] }
export interface ReportDef {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  statusOptions: { value: string; label: string }[];
  requires?: ActionId;
  build(state: AppState, today: string, user: DemoUser, f: ReportFilters): ReportOutput;
}

const inRange = (date: string | undefined, f: ReportFilters) => !!date && (!f.from || date >= f.from) && (!f.to || date <= f.to);
const statusOpts = (keys: DisplayStatus[]) => keys.map((k) => ({ value: k, label: DISPLAY_STATUS_LABEL[k] }));
const ALL_STATUS = Object.keys(DISPLAY_STATUS_LABEL) as DisplayStatus[];
const fdrBase = (v: FdrView) => [v.fdr.id, v.institution?.name ?? v.fdr.institutionId, v.fdr.referenceNo, v.bank?.name ?? v.fdr.bankId, formatINR(v.fdr.amountPaise)];
const FDR_HEAD = ['Record ID', 'Institution', 'FDR reference', 'Bank', 'Amount'];

/** FR-M11-5: reports are configuration objects; the preview and the CSV come from the same `build` output. */
export const REPORTS: ReportDef[] = [
  {
    id: 'RPT-01', title: 'Institution-wise deposit summary', description: 'Held instruments and recorded value per institution.', dateLabel: 'Instrument issue date', statusOptions: statusOpts(ALL_STATUS),
    build: (s, today, u, f) => {
      const views = fdrViewsFor(s, today, u).filter((v) => isHeld(v) && (!f.status || v.derived.status === f.status) && (!f.from && !f.to ? true : inRange(v.fdr.issueDate, f)));
      return {
        headers: ['Institution ID', 'Institution', 'Type', 'State', 'Instruments', 'Recorded value', 'Expiring soon', 'Matured'],
        rows: scopedInstitutions(s, u).map((i) => {
          const vs = views.filter((v) => v.fdr.institutionId === i.id);
          return [i.id, i.name, INSTITUTION_TYPE_LABEL[i.type], i.state, vs.length, formatINR(vs.reduce((a, v) => a + v.fdr.amountPaise, 0)), vs.filter((v) => v.derived.status === 'EXPIRING_SOON').length, vs.filter((v) => v.derived.status === 'MATURED').length];
        }),
      };
    },
  },
  {
    id: 'RPT-02', title: 'Active instruments', description: 'Accepted after verification and not past maturity.', dateLabel: 'Maturity date', statusOptions: statusOpts(['ACTIVE', 'EXPIRING_SOON']),
    build: (s, today, u, f) => ({
      headers: [...FDR_HEAD, 'Issue date', 'Maturity date', 'Status'],
      rows: fdrViewsFor(s, today, u).filter((v) => ['ACTIVE', 'EXPIRING_SOON'].includes(v.derived.status) && (!f.status || v.derived.status === f.status) && (!f.from && !f.to ? true : inRange(v.fdr.maturityDate, f)))
        .map((v) => [...fdrBase(v), formatDate(v.fdr.issueDate), formatDate(v.fdr.maturityDate), DISPLAY_STATUS_LABEL[v.derived.status]]),
    }),
  },
  {
    id: 'RPT-03', title: 'Maturity forecast', description: 'Held instruments by maturity date with band.', dateLabel: 'Maturity date', statusOptions: statusOpts(['ACTIVE', 'EXPIRING_SOON', 'MATURED', 'RENEWAL_PENDING']),
    build: (s, today, u, f) => ({
      headers: [...FDR_HEAD, 'Maturity date', 'Days remaining', 'Band', 'Status'],
      rows: fdrViewsFor(s, today, u).filter((v) => isHeld(v) && v.fdr.verificationStatus === 'ACCEPTED' && (!f.status || v.derived.status === f.status) && (!f.from && !f.to ? true : inRange(v.fdr.maturityDate, f)))
        .sort((a, b) => a.fdr.maturityDate.localeCompare(b.fdr.maturityDate))
        .map((v) => [...fdrBase(v), formatDate(v.fdr.maturityDate), v.derived.daysToMaturity, bandLabel(v.derived.band, s.settings.maturityBands), DISPLAY_STATUS_LABEL[v.derived.status]]),
    }),
  },
  {
    id: 'RPT-04', title: 'Renewal compliance', description: 'Instruments due for renewal or with renewal history.', dateLabel: 'Maturity date', statusOptions: Object.entries(RENEWAL_STATUS_LABEL).map(([value, label]) => ({ value, label })),
    build: (s, today, u, f) => ({
      headers: [...FDR_HEAD, 'Maturity date', 'Renewal status', 'Successor', 'Status'],
      rows: fdrViewsFor(s, today, u).filter((v) => (v.fdr.renewalStatus !== 'NONE' || v.derived.flags.includes('RENEWAL_DUE')) && (!f.status || v.fdr.renewalStatus === f.status) && (!f.from && !f.to ? true : inRange(v.fdr.maturityDate, f)))
        .map((v) => [...fdrBase(v), formatDate(v.fdr.maturityDate), v.derived.flags.includes('RENEWAL_DUE') && v.fdr.renewalStatus === 'NONE' ? 'Renewal due' : RENEWAL_STATUS_LABEL[v.fdr.renewalStatus], v.fdr.currentSuccessorId ?? '—', DISPLAY_STATUS_LABEL[v.derived.status]]),
    }),
  },
  {
    id: 'RPT-05', title: 'Pending verification', description: 'Open verification cases with age and officer.', dateLabel: 'Submission date', statusOptions: OPEN_VERIFICATION.map((k) => ({ value: k, label: VERIFICATION_STATUS_LABEL[k] })),
    build: (s, today, u, f) => ({
      headers: [...FDR_HEAD, 'Submitted', 'Age (days)', 'Verification status', 'Assigned officer', 'Open findings'],
      rows: fdrViewsFor(s, today, u).filter((v) => OPEN_VERIFICATION.includes(v.fdr.verificationStatus) && (!f.status || v.fdr.verificationStatus === f.status) && (!f.from && !f.to ? true : inRange(toBusinessDate(new Date(v.fdr.createdAt)), f)))
        .map((v) => [...fdrBase(v), formatDate(toBusinessDate(new Date(v.fdr.createdAt))), daysBetween(toBusinessDate(new Date(v.fdr.createdAt)), today), VERIFICATION_STATUS_LABEL[v.fdr.verificationStatus], v.fdr.assignedOfficerId ? s.users[v.fdr.assignedOfficerId]?.name ?? '' : 'Unassigned', v.openFindings.filter((x) => x.severity !== 'INFO').length]),
    }),
  },
  {
    id: 'RPT-06', title: 'Discrepancy report', description: 'Open potential issues (rule findings) requiring review.', dateLabel: 'Instrument issue date', statusOptions: (['BLOCKING', 'REVIEW', 'INFO'] as const).map((k) => ({ value: k, label: SEVERITY_LABEL[k] })),
    build: (s, today, u, f) => ({
      headers: ['Record ID', 'Institution', 'Rule', 'Finding', 'Severity', 'Explanation', 'Resolution'],
      rows: fdrViewsFor(s, today, u).filter((v) => !f.from && !f.to ? true : inRange(v.fdr.issueDate, f)).flatMap((v) => v.findings.filter((x) => isOpen(x) && (!f.status || x.severity === f.status)).map((x) => [v.fdr.id, v.institution?.name ?? '', x.ruleId, `${x.title} (potential issue — requires review)`, SEVERITY_LABEL[x.severity], x.explanation, x.resolution ? 'Acknowledged' : 'Open'])),
    }),
  },
  {
    id: 'RPT-07', title: 'Release / refund requests', description: 'Requests with stage and simulated decision references.', dateLabel: 'Submission date', statusOptions: Object.entries(REQUEST_STAGE_LABEL).map(([value, label]) => ({ value, label })),
    build: (s, _t, u, f) => ({
      headers: ['Request ID', 'Type', 'Institution', 'Linked FDR', 'Submitted', 'Stage', 'Assigned officer', 'Decision reference (simulated)', 'Closure date'],
      rows: scopedRequests(s, u).filter((r) => (!f.status || r.stage === f.status) && (!f.from && !f.to ? true : inRange(toBusinessDate(new Date(r.submittedAt)), f)))
        .map((r) => [r.id, r.type === 'RELEASE' ? 'Release' : 'Refund', s.institutions[r.institutionId]?.name ?? '', r.fdrId, formatDateTime(r.submittedAt), REQUEST_STAGE_LABEL[r.stage], r.assignedOfficerId ? s.users[r.assignedOfficerId]?.name ?? '' : '—', r.decisionRef ?? '—', r.closedAt ? formatDate(r.closedAt) : '—']),
    }),
  },
  {
    id: 'RPT-08', title: 'Overdue actions', description: 'Matured — action required: no accepted renewal or release.', dateLabel: 'Maturity date', statusOptions: [],
    build: (s, today, u, f) => ({
      headers: [...FDR_HEAD, 'Maturity date', 'Days overdue', 'Flags'],
      rows: fdrViewsFor(s, today, u).filter((v) => v.derived.status === 'MATURED' && (!f.from && !f.to ? true : inRange(v.fdr.maturityDate, f)))
        .map((v) => [...fdrBase(v), formatDate(v.fdr.maturityDate), -v.derived.daysToMaturity, v.derived.flags.map((x) => FLAG_LABEL[x]).join('; ')]),
    }),
  },
  {
    id: 'RPT-09', title: 'Audit activity', description: 'Audit events with actor, action and outcome.', dateLabel: 'Event date', statusOptions: [{ value: 'SUCCESS', label: 'Success' }, { value: 'DENIED', label: 'Denied' }, { value: 'FAILED', label: 'Failed' }], requires: 'audit.view',
    build: (s, _t, u, f) => ({
      headers: ['Event ID', 'Timestamp', 'User', 'Role', 'Action', 'Entity type', 'Entity ID', 'Outcome', 'Comment'],
      rows: scopedAudit(s, u).filter((e) => (!f.status || e.outcome === f.status) && (!f.from && !f.to ? true : inRange(toBusinessDate(new Date(e.at)), f)))
        .map((e) => [e.id, formatDateTime(e.at), e.userId === 'SYSTEM' ? 'System' : s.users[e.userId]?.name ?? e.userId, e.role === 'SYSTEM' ? 'System' : ROLE_LABEL[e.role], e.action, e.entityType, e.entityId, e.outcome, e.comment ?? '']),
    }),
  },
];
