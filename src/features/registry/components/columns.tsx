import type { Column } from '@/components/ui';
import { FlagChips, StatusBadge, VerificationBadge } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { ADMIN_STATUS_LABEL, DISPLAY_STATUS_LABEL, FLAG_LABEL, RENEWAL_STATUS_LABEL, VERIFICATION_STATUS_LABEL } from '@/domain/labels';
import type { FdrView } from '@/domain/selectors/views';
import { FdrLink } from '@/features/shared';

export interface FdrColumn extends Column<FdrView> {
  csv: (v: FdrView) => string | number;
  defaultVisible: boolean;
}

/** FR-M05-1 columns; `csv` gives the exported value so the CSV matches the table. */
export const FDR_COLUMNS: FdrColumn[] = [
  { id: 'id', header: 'Record ID', cell: (v) => <FdrLink id={v.fdr.id} />, sortValue: (v) => v.fdr.id, csv: (v) => v.fdr.id, defaultVisible: true },
  { id: 'institution', header: 'Institution', cell: (v) => <span><span className="block max-w-[220px] truncate">{v.institution?.name ?? 'Missing record'}</span><span className="text-xs text-slate-500">{v.fdr.institutionId}</span></span>, sortValue: (v) => v.institution?.name ?? '', csv: (v) => `${v.institution?.name ?? ''} (${v.fdr.institutionId})`, defaultVisible: true },
  { id: 'reference', header: 'FDR reference', cell: (v) => <span className="font-mono text-xs">{v.fdr.referenceNo}</span>, sortValue: (v) => v.fdr.referenceNorm, csv: (v) => v.fdr.referenceNo, defaultVisible: true },
  { id: 'bank', header: 'Bank / branch', cell: (v) => <span><span className="block max-w-[200px] truncate">{v.bank?.name ?? v.fdr.bankId}</span><span className="text-xs text-slate-500">{v.fdr.branch}</span></span>, sortValue: (v) => v.bank?.name ?? '', csv: (v) => `${v.bank?.name ?? v.fdr.bankId} — ${v.fdr.branch}`, defaultVisible: true },
  { id: 'amount', header: 'Amount', cell: (v) => <span className="tabular-nums">{formatINR(v.fdr.amountPaise)}</span>, sortValue: (v) => v.fdr.amountPaise, csv: (v) => formatINR(v.fdr.amountPaise), className: 'text-right', defaultVisible: true },
  { id: 'issue', header: 'Issue date', cell: (v) => formatDate(v.fdr.issueDate), sortValue: (v) => v.fdr.issueDate, csv: (v) => formatDate(v.fdr.issueDate), defaultVisible: false },
  { id: 'maturity', header: 'Maturity date', cell: (v) => <span className="whitespace-nowrap">{formatDate(v.fdr.maturityDate)}<span className="block text-xs text-slate-500">{v.derived.daysToMaturity < 0 ? `${-v.derived.daysToMaturity} days ago` : `in ${v.derived.daysToMaturity} days`}</span></span>, sortValue: (v) => v.fdr.maturityDate, csv: (v) => formatDate(v.fdr.maturityDate), defaultVisible: true },
  { id: 'status', header: 'Status', cell: (v) => <StatusBadge status={v.derived.status} />, sortValue: (v) => v.derived.status, csv: (v) => DISPLAY_STATUS_LABEL[v.derived.status], defaultVisible: true },
  { id: 'flags', header: 'Flags', cell: (v) => <FlagChips flags={v.derived.flags} />, sortValue: (v) => v.derived.flags.length, csv: (v) => v.derived.flags.map((f) => FLAG_LABEL[f]).join('; '), defaultVisible: true },
  { id: 'lastVerified', header: 'Last verification', cell: (v) => formatDateTime(v.fdr.lastVerifiedAt), sortValue: (v) => v.fdr.lastVerifiedAt ?? '', csv: (v) => formatDateTime(v.fdr.lastVerifiedAt), defaultVisible: false },
  { id: 'verification', header: 'Verification', cell: (v) => <VerificationBadge status={v.fdr.verificationStatus} />, sortValue: (v) => v.fdr.verificationStatus, csv: (v) => VERIFICATION_STATUS_LABEL[v.fdr.verificationStatus], defaultVisible: false },
  { id: 'renewal', header: 'Renewal', cell: (v) => RENEWAL_STATUS_LABEL[v.fdr.renewalStatus], sortValue: (v) => v.fdr.renewalStatus, csv: (v) => RENEWAL_STATUS_LABEL[v.fdr.renewalStatus], defaultVisible: false },
  { id: 'admin', header: 'Administrative', cell: (v) => ADMIN_STATUS_LABEL[v.fdr.adminStatus], sortValue: (v) => v.fdr.adminStatus, csv: (v) => ADMIN_STATUS_LABEL[v.fdr.adminStatus], defaultVisible: false },
  { id: 'docs', header: 'Docs', cell: (v) => v.fdr.documentIds.length, sortValue: (v) => v.fdr.documentIds.length, csv: (v) => v.fdr.documentIds.length, className: 'text-center', defaultVisible: true },
  { id: 'updated', header: 'Last updated', cell: (v) => formatDateTime(v.fdr.updatedAt), sortValue: (v) => v.fdr.updatedAt, csv: (v) => formatDateTime(v.fdr.updatedAt), defaultVisible: false },
];
