import {
  AlertOctagon, AlertTriangle, ArchiveRestore, BadgeCheck, CheckCircle2, CircleDashed, Clock, Copy, FileWarning, FileX2,
  Flag as FlagIcon, Hourglass, Info, Layers, RefreshCcw, Send, ShieldAlert, XCircle,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DISPLAY_STATUS_LABEL, DISPLAY_STATUS_MEANING, FLAG_LABEL, PRIORITY_LABEL, REQUEST_STAGE_LABEL, SEVERITY_LABEL, VERIFICATION_STATUS_LABEL, bandLabel,
} from '@/domain/labels';
import type { Band, DisplayStatus, Flag, Priority, RequestStage, Severity, VerificationStatus } from '@/domain/types';
import { Badge, type Tone } from './Badge';

/** The one place that maps status → colour + icon. Always icon + text, never colour alone (architecture.md §17). */
const STATUS: Record<DisplayStatus, { tone: Tone; icon: ReactNode }> = {
  ACTIVE: { tone: 'teal', icon: <CheckCircle2 size={12} aria-hidden /> },
  EXPIRING_SOON: { tone: 'amber', icon: <Clock size={12} aria-hidden /> },
  MATURED: { tone: 'red', icon: <AlertTriangle size={12} aria-hidden /> },
  RENEWAL_PENDING: { tone: 'violet', icon: <RefreshCcw size={12} aria-hidden /> },
  VERIFICATION_PENDING: { tone: 'navy', icon: <Hourglass size={12} aria-hidden /> },
  DISCREPANCY_FLAGGED: { tone: 'red', icon: <FlagIcon size={12} aria-hidden /> },
  REJECTED: { tone: 'slate', icon: <XCircle size={12} aria-hidden /> },
  SUPERSEDED: { tone: 'violet', icon: <Layers size={12} aria-hidden /> },
  RELEASED: { tone: 'slate', icon: <ArchiveRestore size={12} aria-hidden /> },
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  const s = STATUS[status];
  return <Badge tone={s.tone} icon={s.icon} title={DISPLAY_STATUS_MEANING[status]}>{DISPLAY_STATUS_LABEL[status]}</Badge>;
}

const FLAG: Record<Flag, { tone: Tone; icon: ReactNode }> = {
  PAST_MATURITY: { tone: 'red', icon: <AlertTriangle size={11} aria-hidden /> },
  RENEWAL_DUE: { tone: 'amber', icon: <RefreshCcw size={11} aria-hidden /> },
  MISSING_DOCUMENTS: { tone: 'amber', icon: <FileWarning size={11} aria-hidden /> },
  POSSIBLE_DUPLICATE: { tone: 'amber', icon: <Copy size={11} aria-hidden /> },
  RELEASE_REQUESTED: { tone: 'navy', icon: <Send size={11} aria-hidden /> },
};

export function FlagChips({ flags }: { flags: Flag[] }) {
  if (!flags.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f} tone={FLAG[f].tone} icon={FLAG[f].icon} className="!px-1.5 !text-[11px]">{FLAG_LABEL[f]}</Badge>
      ))}
    </span>
  );
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const tone: Tone = status === 'ACCEPTED' ? 'teal' : status === 'REJECTED' ? 'slate' : status === 'DISCREPANCY_FLAGGED' ? 'red' : status.startsWith('RECOMMENDED') ? 'violet' : status === 'INFO_REQUESTED' ? 'amber' : 'navy';
  const icon = status === 'ACCEPTED' ? <BadgeCheck size={12} aria-hidden /> : status === 'REJECTED' ? <FileX2 size={12} aria-hidden /> : <CircleDashed size={12} aria-hidden />;
  return <Badge tone={tone} icon={icon}>{VERIFICATION_STATUS_LABEL[status]}</Badge>;
}

export function StageBadge({ stage }: { stage: RequestStage }) {
  const tone: Tone = stage === 'CLOSED' ? 'slate' : stage === 'APPROVED' || stage === 'ACTION_RECORDED' ? 'teal' : stage === 'REJECTED' ? 'red' : stage === 'RETURNED_FOR_CORRECTION' || stage === 'INFO_REQUESTED' ? 'amber' : stage === 'RECOMMENDED' ? 'violet' : 'navy';
  return <Badge tone={tone}>{REQUEST_STAGE_LABEL[stage]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone: Tone = priority === 'CRITICAL' ? 'red' : priority === 'HIGH' ? 'amber' : priority === 'MEDIUM' ? 'navy' : 'slate';
  return <Badge tone={tone} icon={priority === 'CRITICAL' ? <AlertOctagon size={11} aria-hidden /> : undefined}>{PRIORITY_LABEL[priority]}</Badge>;
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const tone: Tone = severity === 'BLOCKING' ? 'red' : severity === 'REVIEW' ? 'amber' : 'navy';
  const icon = severity === 'BLOCKING' ? <ShieldAlert size={11} aria-hidden /> : severity === 'REVIEW' ? <AlertTriangle size={11} aria-hidden /> : <Info size={11} aria-hidden />;
  return <Badge tone={tone} icon={icon}>{SEVERITY_LABEL[severity]}</Badge>;
}

export function BandBadge({ band, bands }: { band: Band; bands: [number, number, number] }) {
  const tone: Tone = band === 'MATURED' || band === 'CRITICAL' ? 'red' : band === 'DUE_SOON' ? 'amber' : band === 'WATCH' ? 'navy' : 'slate';
  return <Badge tone={tone}>{bandLabel(band, bands)}</Badge>;
}
