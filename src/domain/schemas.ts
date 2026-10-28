import { z } from 'zod';
import { isIsoDate } from '@/lib/dates';

/** zod is the only validation source (agent.md §5). */
export const isoDate = z.string().refine(isIsoDate, 'Enter a valid date.');
const ts = z.string().min(10);
const id = z.string().min(1);
const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters.`);
const required = (max: number, msg = 'This field is required.') => z.string().trim().min(1, msg).max(max, `Keep this under ${max} characters.`);

export const RoleSchema = z.enum(['ADMIN', 'INSTITUTION_REP', 'VERIFICATION_OFFICER', 'AUDITOR']);
export const CategorySchema = z.enum(['NEW_INSTITUTION', 'INTAKE_INCREASE', 'NEW_PROGRAMME', 'CONTINUATION']);
export const DocumentKindSchema = z.enum(['FDR_SCAN', 'BANK_CONFIRMATION', 'AUTHORISATION_LETTER', 'INFO_RESPONSE', 'REQUEST_SUPPORT', 'VERIFICATION_EVIDENCE']);
export const VerifiableFieldSchema = z.enum(['referenceNo', 'bankId', 'branch', 'amountPaise', 'issueDate', 'maturityDate', 'institutionCode']);
export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const InstitutionTypeSchema = z.enum(['ENGINEERING', 'MANAGEMENT', 'PHARMACY', 'ARCHITECTURE', 'POLYTECHNIC']);
export const InstitutionStatusSchema = z.enum(['ACTIVE', 'UNDER_REVIEW', 'INACTIVE']);
export const VerificationStatusSchema = z.enum(['SUBMITTED', 'ASSIGNED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'DISCREPANCY_FLAGGED', 'FURTHER_SCRUTINY', 'RECOMMENDED_ACCEPT', 'RECOMMENDED_REJECT', 'ACCEPTED', 'REJECTED']);
export const RequestStageSchema = z.enum(['SUBMITTED', 'RETURNED_FOR_CORRECTION', 'VALIDATED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'RECOMMENDED', 'APPROVED', 'REJECTED', 'ACTION_RECORDED', 'CLOSED']);

// ---------- Form / command field schemas ----------

/** Instrument details (FR-M06-2). Cross-field and date-vs-today checks are added by `refineInstrument`. */
export const InstrumentDetailsSchema = z.object({
  referenceNo: required(40, 'Enter the FDR reference number.'),
  bankId: required(20, 'Select the issuing bank.'),
  branch: required(80, 'Enter the branch.'),
  amountPaise: z.number({ invalid_type_error: 'Enter a valid amount.' }).int().positive('Amount must be greater than ₹0.'),
  issueDate: isoDate,
  maturityDate: isoDate,
  category: CategorySchema,
  declaredInstitutionCode: required(30, 'Enter the institution code as written on the instrument.'),
  remarks: text(1000).optional(),
});
export type InstrumentDetails = z.infer<typeof InstrumentDetailsSchema>;

/** Rules that depend on configuration and today: amount cap, maturity after issue, issue not in future. */
export function instrumentIssues(d: Pick<InstrumentDetails, 'amountPaise' | 'issueDate' | 'maturityDate'>, today: string, amountCapPaise: number): Record<string, string> {
  const issues: Record<string, string> = {};
  if (d.amountPaise > amountCapPaise) issues.amountPaise = 'Amount exceeds the configured cap.';
  if (isIsoDate(d.issueDate) && d.issueDate > today) issues.issueDate = 'Issue date cannot be in the future.';
  if (isIsoDate(d.issueDate) && isIsoDate(d.maturityDate) && d.maturityDate <= d.issueDate) {
    issues.maturityDate = 'Maturity date must be after the issue date.';
  }
  return issues;
}

export const DocumentDraftSchema = z.object({
  kind: DocumentKindSchema,
  fileName: required(200),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  sizeBytes: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  blobKey: z.string().optional(),
  isPlaceholder: z.boolean().default(false),
});
export type DocumentDraft = z.infer<typeof DocumentDraftSchema>;

export const InstitutionFormSchema = z.object({
  name: required(160, 'Enter the institution name.'),
  type: InstitutionTypeSchema,
  state: required(60, 'Enter the state.'),
  district: required(60, 'Enter the district.'),
  aicteCode: z.string().trim().regex(/^[A-Z0-9-]{4,20}$/, 'Use 4–20 capital letters, digits or hyphens.'),
  representativeName: required(80, 'Enter the authorised representative.'),
  contactEmail: z.string().trim().email('Enter a valid email address.'),
  contactPhone: z.string().trim().regex(/^\+?[0-9 -]{8,16}$/, 'Enter a valid phone number.'),
  status: InstitutionStatusSchema,
});
export type InstitutionForm = z.infer<typeof InstitutionFormSchema>;

export const SettingsSchema = z
  .object({
    maturityBands: z.tuple([z.number().int().positive(), z.number().int().positive(), z.number().int().positive()]),
    expiringSoonDays: z.number().int().positive().max(365),
    escalation: z.object({ followUpAfterDays: z.number().int().positive(), escalateAfterDays: z.number().int().positive() }),
    upload: z.object({ maxBytes: z.number().int().min(100 * 1024).max(20 * 1024 * 1024), allowedMime: z.array(z.string()).min(1) }),
    amountCapPaise: z.number().int().positive(),
    categoryRequirements: z.record(CategorySchema, z.object({ requiredDocs: z.array(DocumentKindSchema), checklist: z.array(z.string().trim().min(1).max(160)) })),
  })
  .superRefine((s, ctx) => {
    const [b1, b2, b3] = s.maturityBands;
    if (!(b1 > b2 && b2 > b3)) ctx.addIssue({ code: 'custom', path: ['maturityBands'], message: 'Thresholds must be strictly descending positive integers.' });
    if (s.escalation.escalateAfterDays <= s.escalation.followUpAfterDays) {
      ctx.addIssue({ code: 'custom', path: ['escalation', 'escalateAfterDays'], message: 'Escalation must come after the follow-up.' });
    }
  });

// ---------- Entity schemas (persisted envelope validation, NFR-02) ----------

const UserSchema = z.object({ id, name: z.string(), role: RoleSchema, institutionId: z.string().optional(), active: z.boolean(), maxAssignedCases: z.number().optional(), supervisorId: z.string().optional(), title: z.string() });
const InstitutionSchema = InstitutionFormSchema.extend({ id, representativeUserId: z.string().optional(), createdAt: ts, updatedAt: ts, version: z.number().int(), isDemo: z.boolean() });
const BankSchema = z.object({ id, name: z.string(), shortCode: z.string() });
const FdrSchema = z.object({
  id, applicationRef: z.string(), institutionId: id, referenceNo: z.string(), referenceNorm: z.string(), bankId: z.string(), branch: z.string(),
  amountPaise: z.number().int(), issueDate: isoDate, maturityDate: isoDate, category: CategorySchema, remarks: z.string().optional(),
  declaredInstitutionCode: z.string(), verificationStatus: VerificationStatusSchema, assignedOfficerId: z.string().optional(), priority: PrioritySchema,
  renewalStatus: z.enum(['NONE', 'DUE', 'SUBMITTED', 'COMPLETED']), adminStatus: z.enum(['RECORDED', 'RELEASE_REQUESTED', 'RELEASED', 'SUPERSEDED']),
  predecessorId: z.string().optional(), currentSuccessorId: z.string().optional(), documentIds: z.array(z.string()), lastVerifiedAt: z.string().optional(),
  createdAt: ts, createdBy: z.string(), updatedAt: ts, version: z.number().int(), isDemo: z.boolean(),
});
const DocumentSchema = z.object({ id, fdrId: z.string().optional(), requestId: z.string().optional(), kind: DocumentKindSchema, fileName: z.string(), mimeType: z.string(), sizeBytes: z.number(), sha256: z.string(), blobKey: z.string().optional(), isPlaceholder: z.boolean(), uploadedBy: z.string(), uploadedAt: ts });
const ExtractedSchema = z.object({ fdrId: id, source: z.enum(['MANUAL_READING', 'OCR_PORT']), values: z.record(z.string()), enteredBy: z.string(), enteredAt: ts });
const VerifiedSchema = z.object({ id, fdrId: id, field: VerifiableFieldSchema, value: z.string(), method: z.enum(['BANK_CONFIRMATION_LETTER', 'OFFICIAL_BANK_CHANNEL_MANUAL', 'AUTHORISED_BANK_API']), evidenceDocumentId: z.string().optional(), recordedBy: z.string(), recordedAt: ts, note: z.string().optional() });
const ReviewSchema = z.object({ id, fdrId: id, officerId: z.string(), kind: z.enum(['OBSERVATION', 'CHECKLIST', 'RECOMMENDATION', 'DECISION', 'OVERRIDE', 'INFO_REQUEST', 'RESPONSE']), text: z.string(), checklist: z.record(z.boolean()).optional(), createdAt: ts });
const ResolutionSchema = z.object({ id, findingKey: z.string(), state: z.enum(['ACKNOWLEDGED', 'DISMISSED']), reason: z.string(), by: z.string(), at: ts });
const LinkSchema = z.object({ id, predecessorId: id, successorId: id, type: z.enum(['RENEWAL', 'REPLACEMENT']), status: z.enum(['SUBMITTED', 'ACCEPTED', 'REJECTED']), createdAt: ts, closedAt: z.string().optional() });
const RequestSchema = z.object({
  id, institutionId: id, fdrId: id, type: z.enum(['RELEASE', 'REFUND']), reason: z.string(), documentIds: z.array(z.string()), stage: RequestStageSchema,
  assignedOfficerId: z.string().optional(), recommendation: z.enum(['APPROVE', 'REJECT']).optional(),
  reviewNotes: z.array(z.object({ stage: RequestStageSchema, by: z.string(), at: ts, text: z.string() })),
  decisionRef: z.string().optional(), decisionReason: z.string().optional(), finalActionRef: z.string().optional(), submittedAt: ts, closedAt: z.string().optional(), version: z.number().int(), isDemo: z.boolean(),
});
const NotificationSchema = z.object({
  id, dedupeKey: z.string(), category: z.string(), priority: PrioritySchema, title: z.string(), body: z.string(), institutionId: z.string().optional(), fdrId: z.string().optional(), requestId: z.string().optional(),
  link: z.string(), audience: z.object({ roles: z.array(RoleSchema), institutionId: z.string().optional(), userId: z.string().optional() }), escalationStage: z.enum(['INITIAL', 'FOLLOW_UP', 'ESCALATED']),
  createdAt: ts, resolvedAt: z.string().optional(), readBy: z.record(z.string()),
});
const AuditSchema = z.object({ id, seq: z.number().int(), at: ts, userId: z.string(), role: z.string(), action: z.string(), entityType: z.string(), entityId: z.string(), before: z.unknown().optional(), after: z.unknown().optional(), comment: z.string().optional(), outcome: z.enum(['SUCCESS', 'DENIED', 'FAILED']), prevHash: z.string(), hash: z.string() });

export const AppStateSchema = z.object({
  schemaVersion: z.number().int(),
  institutions: z.record(InstitutionSchema),
  banks: z.record(BankSchema),
  fdrs: z.record(FdrSchema),
  documents: z.record(DocumentSchema),
  extracted: z.record(ExtractedSchema),
  verified: z.record(VerifiedSchema),
  reviews: z.record(ReviewSchema),
  findingResolutions: z.record(ResolutionSchema),
  renewalLinks: z.record(LinkSchema),
  requests: z.record(RequestSchema),
  notifications: z.record(NotificationSchema),
  audit: z.array(AuditSchema),
  users: z.record(UserSchema),
  settings: SettingsSchema,
  counters: z.record(z.number()),
  meta: z.object({ seededAt: z.string(), seedVersion: z.string() }),
});

export const PersistedEnvelopeSchema = z.object({ schemaVersion: z.number().int(), savedAt: z.string(), data: z.unknown() });
