/** Domain model — architecture.md §5. Dates are YYYY-MM-DD; money is integer paise. */

export type Role = 'ADMIN' | 'INSTITUTION_REP' | 'VERIFICATION_OFFICER' | 'AUDITOR';
export const ROLES: Role[] = ['ADMIN', 'INSTITUTION_REP', 'VERIFICATION_OFFICER', 'AUDITOR'];

export interface DemoUser {
  id: string;
  name: string;
  role: Role;
  institutionId?: string;
  active: boolean;
  maxAssignedCases?: number;
  supervisorId?: string;
  title: string;
}

export type InstitutionType = 'ENGINEERING' | 'MANAGEMENT' | 'PHARMACY' | 'ARCHITECTURE' | 'POLYTECHNIC';
export type InstitutionStatus = 'ACTIVE' | 'UNDER_REVIEW' | 'INACTIVE';

export interface Institution {
  id: string;
  name: string;
  type: InstitutionType;
  state: string;
  district: string;
  aicteCode: string;
  representativeUserId?: string;
  representativeName: string;
  contactEmail: string;
  contactPhone: string;
  status: InstitutionStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
  isDemo: boolean;
}

export interface Bank {
  id: string;
  name: string;
  shortCode: string;
}

export type InstrumentCategory = 'NEW_INSTITUTION' | 'INTAKE_INCREASE' | 'NEW_PROGRAMME' | 'CONTINUATION';

export type VerificationStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'UNDER_REVIEW'
  | 'INFO_REQUESTED'
  | 'DISCREPANCY_FLAGGED'
  | 'FURTHER_SCRUTINY'
  | 'RECOMMENDED_ACCEPT'
  | 'RECOMMENDED_REJECT'
  | 'ACCEPTED'
  | 'REJECTED';
export type RenewalStatus = 'NONE' | 'DUE' | 'SUBMITTED' | 'COMPLETED';
export type AdminStatus = 'RECORDED' | 'RELEASE_REQUESTED' | 'RELEASED' | 'SUPERSEDED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Fdr {
  id: string;
  applicationRef: string;
  institutionId: string;
  referenceNo: string;
  referenceNorm: string;
  bankId: string;
  branch: string;
  amountPaise: number;
  issueDate: string;
  maturityDate: string;
  category: InstrumentCategory;
  remarks?: string;
  declaredInstitutionCode: string;
  verificationStatus: VerificationStatus;
  assignedOfficerId?: string;
  priority: Priority;
  renewalStatus: RenewalStatus;
  adminStatus: AdminStatus;
  predecessorId?: string;
  currentSuccessorId?: string;
  documentIds: string[];
  lastVerifiedAt?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  version: number;
  isDemo: boolean;
}

export type DocumentKind =
  | 'FDR_SCAN'
  | 'BANK_CONFIRMATION'
  | 'AUTHORISATION_LETTER'
  | 'INFO_RESPONSE'
  | 'REQUEST_SUPPORT'
  | 'VERIFICATION_EVIDENCE';

export interface DocumentMeta {
  id: string;
  fdrId?: string;
  requestId?: string;
  kind: DocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  blobKey?: string;
  isPlaceholder: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

export type VerifiableField = 'referenceNo' | 'bankId' | 'branch' | 'amountPaise' | 'issueDate' | 'maturityDate' | 'institutionCode';
export const VERIFIABLE_FIELDS: VerifiableField[] = ['referenceNo', 'bankId', 'branch', 'amountPaise', 'issueDate', 'maturityDate', 'institutionCode'];

/** Provenance layers are kept separate on purpose (C-01, FR-M07-2). */
export interface ExtractedValues {
  fdrId: string;
  source: 'MANUAL_READING' | 'OCR_PORT';
  values: Partial<Record<VerifiableField, string>>;
  enteredBy: string;
  enteredAt: string;
}

export type VerificationMethod = 'BANK_CONFIRMATION_LETTER' | 'OFFICIAL_BANK_CHANNEL_MANUAL' | 'AUTHORISED_BANK_API';

export interface VerifiedField {
  id: string;
  fdrId: string;
  field: VerifiableField;
  value: string;
  method: VerificationMethod;
  evidenceDocumentId?: string;
  recordedBy: string;
  recordedAt: string;
  note?: string;
}

export type ReviewKind = 'OBSERVATION' | 'CHECKLIST' | 'RECOMMENDATION' | 'DECISION' | 'OVERRIDE' | 'INFO_REQUEST' | 'RESPONSE';

export interface ReviewEntry {
  id: string;
  fdrId: string;
  officerId: string;
  kind: ReviewKind;
  text: string;
  checklist?: Record<string, boolean>;
  createdAt: string;
}

export interface FindingResolution {
  id: string;
  findingKey: string;
  state: 'ACKNOWLEDGED' | 'DISMISSED';
  reason: string;
  by: string;
  at: string;
}

export interface RenewalLink {
  id: string;
  predecessorId: string;
  successorId: string;
  type: 'RENEWAL' | 'REPLACEMENT';
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  closedAt?: string;
}

export type RequestStage =
  | 'SUBMITTED'
  | 'RETURNED_FOR_CORRECTION'
  | 'VALIDATED'
  | 'UNDER_REVIEW'
  | 'INFO_REQUESTED'
  | 'RECOMMENDED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTION_RECORDED'
  | 'CLOSED';

export interface StageNote {
  stage: RequestStage;
  by: string;
  at: string;
  text: string;
}

export interface ReleaseRequest {
  id: string;
  institutionId: string;
  fdrId: string;
  type: 'RELEASE' | 'REFUND';
  reason: string;
  documentIds: string[];
  stage: RequestStage;
  assignedOfficerId?: string;
  recommendation?: 'APPROVE' | 'REJECT';
  reviewNotes: StageNote[];
  decisionRef?: string;
  decisionReason?: string;
  finalActionRef?: string;
  submittedAt: string;
  closedAt?: string;
  version: number;
  isDemo: boolean;
}

export type NotificationCategory =
  | 'UPCOMING_MATURITY'
  | 'OVERDUE_MATURITY'
  | 'MISSING_DOCUMENTS'
  | 'PENDING_VERIFICATION'
  | 'DISCREPANCY_FLAGGED'
  | 'RENEWAL_DUE'
  | 'REQUEST_AWAITING_ACTION'
  | 'REQUEST_RETURNED';

export type EscalationStage = 'INITIAL' | 'FOLLOW_UP' | 'ESCALATED';

export interface Notification {
  id: string;
  dedupeKey: string;
  category: NotificationCategory;
  priority: Priority;
  title: string;
  body: string;
  institutionId?: string;
  fdrId?: string;
  requestId?: string;
  link: string;
  audience: { roles: Role[]; institutionId?: string; userId?: string };
  escalationStage: EscalationStage;
  createdAt: string;
  /** Set when the underlying condition no longer holds; history is never deleted (D-06). */
  resolvedAt?: string;
  readBy: Record<string, string>;
}

export type EntityType = 'FDR' | 'INSTITUTION' | 'REQUEST' | 'DOCUMENT' | 'FINDING' | 'NOTIFICATION' | 'USER' | 'SETTINGS' | 'SYSTEM' | 'ROUTE';

export interface AuditEvent {
  id: string;
  seq: number;
  at: string;
  userId: string;
  role: Role | 'SYSTEM';
  action: string;
  entityType: EntityType;
  entityId: string;
  before?: unknown;
  after?: unknown;
  comment?: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
  prevHash: string;
  hash: string;
}

export interface CategoryRequirement {
  requiredDocs: DocumentKind[];
  checklist: string[];
}

export interface Settings {
  maturityBands: [number, number, number];
  expiringSoonDays: number;
  escalation: { followUpAfterDays: number; escalateAfterDays: number };
  upload: { maxBytes: number; allowedMime: string[] };
  amountCapPaise: number;
  categoryRequirements: Record<InstrumentCategory, CategoryRequirement>;
}

export interface AppState {
  schemaVersion: number;
  institutions: Record<string, Institution>;
  banks: Record<string, Bank>;
  fdrs: Record<string, Fdr>;
  documents: Record<string, DocumentMeta>;
  extracted: Record<string, ExtractedValues>;
  verified: Record<string, VerifiedField>;
  reviews: Record<string, ReviewEntry>;
  findingResolutions: Record<string, FindingResolution>;
  renewalLinks: Record<string, RenewalLink>;
  requests: Record<string, ReleaseRequest>;
  notifications: Record<string, Notification>;
  audit: AuditEvent[];
  users: Record<string, DemoUser>;
  settings: Settings;
  counters: Record<string, number>;
  meta: { seededAt: string; seedVersion: string };
}

export type DisplayStatus =
  | 'ACTIVE'
  | 'EXPIRING_SOON'
  | 'MATURED'
  | 'RENEWAL_PENDING'
  | 'VERIFICATION_PENDING'
  | 'DISCREPANCY_FLAGGED'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'RELEASED';

export type Flag = 'PAST_MATURITY' | 'RENEWAL_DUE' | 'MISSING_DOCUMENTS' | 'POSSIBLE_DUPLICATE' | 'RELEASE_REQUESTED';
export type Band = 'MATURED' | 'CRITICAL' | 'DUE_SOON' | 'WATCH' | 'LONG';

export type Severity = 'BLOCKING' | 'REVIEW' | 'INFO';

export interface Finding {
  key: string;
  ruleId: string;
  severity: Severity;
  title: string;
  explanation: string;
  entityRefs: { type: EntityType; id: string }[];
  field?: string;
  evidence?: { submitted?: string; compared?: string; source?: string };
  suggestedReview: string;
  resolution?: FindingResolution;
}

export interface Insight {
  id: string;
  kind: string;
  title: string;
  why: string;
  rule: string;
  records: { type: EntityType; id: string; label: string; link: string }[];
  reviewAction: string;
  priority: Priority;
}
