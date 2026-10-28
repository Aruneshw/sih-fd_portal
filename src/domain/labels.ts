import type {
  AdminStatus, Band, DisplayStatus, DocumentKind, Flag, InstitutionStatus, InstitutionType, InstrumentCategory,
  NotificationCategory, Priority, RenewalStatus, RequestStage, Role, Severity, VerifiableField, VerificationMethod,
  VerificationStatus, EscalationStage,
} from './types';

/** User-facing vocabulary — prd.md §6 and agent.md §11. */
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'AICTE Administrator',
  INSTITUTION_REP: 'Institution Representative',
  VERIFICATION_OFFICER: 'Verification Officer',
  AUDITOR: 'Read-only Auditor',
};

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring Soon',
  MATURED: 'Matured',
  RENEWAL_PENDING: 'Renewal Pending',
  VERIFICATION_PENDING: 'Verification Pending',
  DISCREPANCY_FLAGGED: 'Discrepancy Flagged',
  REJECTED: 'Rejected',
  SUPERSEDED: 'Superseded',
  RELEASED: 'Released',
};

export const DISPLAY_STATUS_MEANING: Record<DisplayStatus, string> = {
  ACTIVE: 'Accepted after verification, not past maturity, not released or superseded',
  EXPIRING_SOON: 'Accepted, maturity within the configured window',
  MATURED: 'Matured — action required. No accepted renewal or release yet',
  RENEWAL_PENDING: 'A renewal/replacement has been submitted and is under verification',
  VERIFICATION_PENDING: 'Submitted, verification not yet concluded',
  DISCREPANCY_FLAGGED: 'An officer has flagged a discrepancy that is unresolved',
  REJECTED: 'Administrator rejected the submission (with reason)',
  SUPERSEDED: 'Replaced by an accepted renewal/replacement; history retained',
  RELEASED: 'Release action recorded (simulated)',
};

export const FLAG_LABEL: Record<Flag, string> = {
  PAST_MATURITY: 'Past maturity',
  RENEWAL_DUE: 'Renewal due',
  MISSING_DOCUMENTS: 'Missing documents',
  POSSIBLE_DUPLICATE: 'Possible duplicate',
  RELEASE_REQUESTED: 'Release requested',
};

export const BAND_LABEL: Record<Band, string> = {
  MATURED: 'Matured',
  CRITICAL: '0–7 days',
  DUE_SOON: '8–30 days',
  WATCH: '31–90 days',
  LONG: '> 90 days',
};

export function bandLabel(band: Band, bands: [number, number, number]): string {
  const [b1, b2, b3] = bands;
  switch (band) {
    case 'MATURED': return 'Matured';
    case 'CRITICAL': return `0–${b3} days`;
    case 'DUE_SOON': return `${b3 + 1}–${b2} days`;
    case 'WATCH': return `${b2 + 1}–${b1} days`;
    case 'LONG': return `> ${b1} days`;
  }
}

export const VERIFICATION_STATUS_LABEL: Record<VerificationStatus, string> = {
  SUBMITTED: 'Submitted',
  ASSIGNED: 'Assigned',
  UNDER_REVIEW: 'Under review',
  INFO_REQUESTED: 'Information requested',
  DISCREPANCY_FLAGGED: 'Discrepancy flagged',
  FURTHER_SCRUTINY: 'Further scrutiny',
  RECOMMENDED_ACCEPT: 'Recommended: accept',
  RECOMMENDED_REJECT: 'Recommended: reject',
  ACCEPTED: 'Accepted after verification',
  REJECTED: 'Rejected',
};

export const RENEWAL_STATUS_LABEL: Record<RenewalStatus, string> = {
  NONE: 'None',
  DUE: 'Renewal due',
  SUBMITTED: 'Renewal submitted',
  COMPLETED: 'Renewal completed',
};

export const ADMIN_STATUS_LABEL: Record<AdminStatus, string> = {
  RECORDED: 'Recorded',
  RELEASE_REQUESTED: 'Release requested',
  RELEASED: 'Released (simulated)',
  SUPERSEDED: 'Superseded',
};

export const REQUEST_STAGE_LABEL: Record<RequestStage, string> = {
  SUBMITTED: 'Submitted',
  RETURNED_FOR_CORRECTION: 'Returned for correction',
  VALIDATED: 'Validated — awaiting assignment',
  UNDER_REVIEW: 'Under review',
  INFO_REQUESTED: 'Information requested',
  RECOMMENDED: 'Recommended',
  APPROVED: 'Approved — simulated administrative decision',
  REJECTED: 'Rejected — simulated administrative decision',
  ACTION_RECORDED: 'Final action recorded',
  CLOSED: 'Closed',
};

export const INSTITUTION_TYPE_LABEL: Record<InstitutionType, string> = {
  ENGINEERING: 'Engineering & Technology',
  MANAGEMENT: 'Management',
  PHARMACY: 'Pharmacy',
  ARCHITECTURE: 'Architecture',
  POLYTECHNIC: 'Polytechnic (Diploma)',
};

export const INSTITUTION_STATUS_LABEL: Record<InstitutionStatus, string> = {
  ACTIVE: 'Active',
  UNDER_REVIEW: 'Under review',
  INACTIVE: 'Inactive',
};

export const CATEGORY_LABEL: Record<InstrumentCategory, string> = {
  NEW_INSTITUTION: 'New institution approval',
  INTAKE_INCREASE: 'Intake increase',
  NEW_PROGRAMME: 'New programme',
  CONTINUATION: 'Continuation of approval',
};

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  FDR_SCAN: 'FDR scan / PDF',
  BANK_CONFIRMATION: 'Bank confirmation letter',
  AUTHORISATION_LETTER: 'Authorisation letter',
  INFO_RESPONSE: 'Response document',
  REQUEST_SUPPORT: 'Supporting document',
  VERIFICATION_EVIDENCE: 'Verification evidence',
};

export const FIELD_LABEL: Record<VerifiableField, string> = {
  referenceNo: 'FDR reference',
  bankId: 'Bank',
  branch: 'Branch',
  amountPaise: 'Amount',
  issueDate: 'Issue date',
  maturityDate: 'Maturity date',
  institutionCode: 'Institution code on instrument',
};

export const METHOD_LABEL: Record<VerificationMethod, string> = {
  BANK_CONFIRMATION_LETTER: 'Bank confirmation letter on file',
  OFFICIAL_BANK_CHANNEL_MANUAL: 'Manual confirmation via official bank channel',
  AUTHORISED_BANK_API: 'Authorised bank API — not configured in this prototype',
};

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
  UPCOMING_MATURITY: 'Upcoming maturity',
  OVERDUE_MATURITY: 'Overdue maturity action',
  MISSING_DOCUMENTS: 'Missing documents',
  PENDING_VERIFICATION: 'Pending verification',
  DISCREPANCY_FLAGGED: 'Discrepancy flagged',
  RENEWAL_DUE: 'Renewal due',
  REQUEST_AWAITING_ACTION: 'Request awaiting action',
  REQUEST_RETURNED: 'Returned for correction',
};

export const ESCALATION_LABEL: Record<EscalationStage, string> = {
  INITIAL: 'Initial reminder',
  FOLLOW_UP: 'Follow-up',
  ESCALATED: 'Escalated to supervisor',
};

export const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };
export const SEVERITY_LABEL: Record<Severity, string> = { BLOCKING: 'Blocking', REVIEW: 'Review', INFO: 'Information' };

export const POTENTIAL_ISSUE_LABEL = 'Potential issue — requires review';
export const SIMULATED_DECISION_LABEL = 'Simulated administrative decision';
