import { daysBetween } from '@/lib/dates';
import type { Band, DisplayStatus, Fdr, Finding, Flag, ReleaseRequest, Settings } from '../types';
import { bandFor } from './bands';
import { missingRequiredDocs } from './flags';

export interface StatusContext {
  today: string;
  settings: Settings;
  openRequest?: ReleaseRequest;
  findings: Finding[];
  documentKinds: string[];
}

export interface DerivedStatus {
  status: DisplayStatus;
  flags: Flag[];
  daysToMaturity: number;
  band: Band;
}

/** Single source of truth for display status (FR-M05-3, architecture.md §6). First match wins. */
export function deriveDisplayStatus(fdr: Fdr, daysToMaturity: number, settings: Settings): DisplayStatus {
  if (fdr.adminStatus === 'RELEASED') return 'RELEASED';
  if (fdr.adminStatus === 'SUPERSEDED') return 'SUPERSEDED';
  if (fdr.verificationStatus === 'REJECTED') return 'REJECTED';
  if (fdr.verificationStatus === 'DISCREPANCY_FLAGGED') return 'DISCREPANCY_FLAGGED';
  if (fdr.verificationStatus !== 'ACCEPTED') return 'VERIFICATION_PENDING';
  if (fdr.renewalStatus === 'SUBMITTED') return 'RENEWAL_PENDING';
  if (daysToMaturity < 0) return 'MATURED';
  if (daysToMaturity <= settings.expiringSoonDays) return 'EXPIRING_SOON';
  return 'ACTIVE';
}

export function deriveStatus(fdr: Fdr, ctx: StatusContext): DerivedStatus {
  const daysToMaturity = daysBetween(ctx.today, fdr.maturityDate);
  const status = deriveDisplayStatus(fdr, daysToMaturity, ctx.settings);
  const band = bandFor(daysToMaturity, ctx.settings.maturityBands);
  const flags: Flag[] = [];
  const closed = status === 'RELEASED' || status === 'SUPERSEDED';

  if (daysToMaturity < 0 && !closed) flags.push('PAST_MATURITY');
  if (
    fdr.verificationStatus === 'ACCEPTED' &&
    !closed &&
    daysToMaturity <= ctx.settings.expiringSoonDays &&
    (fdr.renewalStatus === 'NONE' || fdr.renewalStatus === 'DUE')
  ) {
    flags.push('RENEWAL_DUE');
  }
  if (missingRequiredDocs(fdr.category, ctx.documentKinds, ctx.settings).length > 0) flags.push('MISSING_DOCUMENTS');
  if (ctx.findings.some((f) => f.ruleId === 'R-03' && f.resolution?.state !== 'DISMISSED')) flags.push('POSSIBLE_DUPLICATE');
  if (ctx.openRequest) flags.push('RELEASE_REQUESTED');

  return { status, flags, daysToMaturity, band };
}
