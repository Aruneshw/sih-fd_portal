# Architecture — AICTE SecureFDR

Companion to `prd.md` (requirements) and `agent.md` (build process). Requirement IDs refer to `prd.md`.

---

## 1. Design principles

| # | Principle | What it means in code |
|---|---|---|
| P1 | **Pure domain core** | Status derivation, permissions, state machines, rules and insights are pure TypeScript functions with no React, no storage, no `Date.now()`. Fully unit-testable. |
| P2 | **Single write path** | Every mutation is a `Command` executed by one dispatcher: authorise → validate → transition → apply → audit → persist. Components never write to storage. |
| P3 | **Derive, don't store** | Display status, KPIs, findings, bands and insights are computed from stored facts. Only facts and human decisions are persisted. |
| P4 | **Policy as data** | Permission matrix, state transition tables, thresholds, checklists and report definitions are data objects, not scattered `if` statements. |
| P5 | **Ports and adapters** | Anything external (auth, bank, OCR, messaging, backend API) sits behind an interface with a mock adapter. Swapping to production changes adapters, not features. |
| P6 | **Provenance is explicit** | Submitted, extracted, verified and concluded values are separate fields with their own source, actor and timestamp. |
| P7 | **Fail safe, fail visible** | Invalid input is rejected with a message; corrupt storage triggers recovery; a crash is contained to one route. |
| P8 | **Injectable clock** | All date logic takes `today` from a `Clock`, so tests and demos are deterministic. |

---

## 2. Technology stack (pinned, known-compatible)

| Purpose | Package | Version |
|---|---|---|
| Build | `vite`, `@vitejs/plugin-react` | `^5.4`, `^4.3` |
| UI | `react`, `react-dom` | `^18.3` |
| Language | `typescript` | `^5.5` (strict) |
| Routing | `react-router-dom` | `^6.26` |
| Styling | `tailwindcss`, `postcss`, `autoprefixer` | `^3.4`, `^8.4`, `^10.4` |
| Icons | `lucide-react` | `^0.441` or later 0.x |
| Charts | `recharts` | `^2.12` |
| Validation | `zod` | `^3.23` |
| Dates | `date-fns` | `^3.6` |
| Blob storage | `idb-keyval` | `^6.2` |
| Class merge | `clsx` | `^2.1` |
| Unit tests | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` | `^2.1`, `^16`, `^14`, `^25` |
| E2E (optional) | `@playwright/test` | `^1.47` |
| Lint | `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` | current compatible |

Do not upgrade major versions during the build. No other runtime dependencies without a written reason in `DECISIONS.md`.

---

## 3. Layered architecture

```
┌──────────────────────────────────────────────────────────────┐
│ app/          Router, providers, layout shell, route guards  │
├──────────────────────────────────────────────────────────────┤
│ features/*    Pages + feature components (one folder/module) │
│               read via selectors, write via useCommand()      │
├──────────────────────────────────────────────────────────────┤
│ services/     Command dispatcher, audit writer, notification │
│               scheduler, CSV/print export, integration ports  │
├──────────────────────────────────────────────────────────────┤
│ data/         Store, storage adapters, migrations, seed      │
├──────────────────────────────────────────────────────────────┤
│ domain/       Types, zod schemas, status, permissions,       │
│               state machines, rules, insights (PURE)          │
├──────────────────────────────────────────────────────────────┤
│ lib/          dates, money, ids, csv, hashing, sanitise      │
└──────────────────────────────────────────────────────────────┘
```

**Dependency rules (enforced by ESLint `no-restricted-imports`):**
- `domain/` imports only `lib/` and `zod`/`date-fns`. Never React, never `data/` or `services/`.
- `data/` imports `domain/`, `lib/`.
- `services/` imports `domain/`, `data/`, `lib/`.
- `features/X` imports `components/`, `services/`, `domain/`, `lib/`, and only the `index.ts` public API of another feature.
- `components/ui` imports nothing from features.

---

## 4. Folder structure

```
securefdr/
├─ index.html
├─ package.json  vite.config.ts  tsconfig.json  tailwind.config.ts  postcss.config.js  .eslintrc.cjs
├─ README.md  DECISIONS.md  DEMO_SCRIPT.md
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ App.tsx  router.tsx  routes.ts
│  │  ├─ providers/        StoreProvider, SessionProvider, ToastProvider, ClockProvider
│  │  ├─ layout/           AppShell, Sidebar, Topbar, GlobalSearch, ProfileMenu
│  │  └─ guards/           RequireSession, RequirePermission, RouteErrorBoundary
│  ├─ domain/
│  │  ├─ types.ts          all entity types and enums
│  │  ├─ schemas.ts        zod schemas (entities, settings, command payloads, persisted envelope)
│  │  ├─ status/           deriveStatus.ts, bands.ts, flags.ts
│  │  ├─ permissions/      actions.ts, matrix.ts, can.ts
│  │  ├─ workflows/        verificationMachine.ts, renewalMachine.ts, requestMachine.ts, machine.ts
│  │  ├─ rules/            engine.ts, duplicate.ts, catalogue/*.ts
│  │  ├─ insights/         engine.ts, catalogue/*.ts, dailySummary.ts
│  │  ├─ selectors/        kpis.ts, charts.ts, queues.ts, scope.ts
│  │  └─ __tests__/
│  ├─ data/
│  │  ├─ store.ts          in-memory state + subscribe (useSyncExternalStore)
│  │  ├─ storage/          StorageAdapter.ts, LocalStorageAdapter.ts, BlobStore.ts (idb-keyval)
│  │  ├─ migrations/       index.ts, v1.ts, v2.ts …
│  │  └─ seed/             prng.ts, catalogue.ts (fixed scenarios S-01…S-13), generate.ts
│  ├─ services/
│  │  ├─ commands/         dispatcher.ts, registry.ts, handlers/*.ts
│  │  ├─ audit/            appendAudit.ts, hashChain.ts
│  │  ├─ notifications/    generate.ts, escalation.ts, scheduler.ts
│  │  ├─ export/           csv.ts, reportDefinitions.ts
│  │  └─ integrations/     ports.ts, mock/*.ts
│  ├─ features/
│  │  ├─ auth/  dashboard/  institutions/  registry/  submission/  verification/
│  │  ├─ maturity/  requests/  notifications/  reports/  audit/  users/  settings/  insights/
│  │  │   each: index.ts (public API), pages/, components/, hooks/
│  ├─ components/ui/       Button, IconButton, Badge, StatusBadge, Card, KpiCard, DataTable,
│  │                       Pagination, FilterBar, Drawer, Modal, ConfirmDialog, Tabs, Stepper,
│  │                       FileDropzone, Skeleton, EmptyState, Toast, Tooltip, Timeline,
│  │                       Field (label + error + hint), MoneyInput, DateInput, DemoChip
│  ├─ lib/                 dates.ts, money.ts, ids.ts, csv.ts, hash.ts, text.ts, result.ts
│  └─ styles/index.css
└─ e2e/                    t01-create-fdr.spec.ts … t12-reset.spec.ts (optional)
```

---

## 5. Domain model

All business dates are ISO date strings `YYYY-MM-DD` (no time). Timestamps are ISO-8601 with offset. Money is integer **paise** (`amountPaise`) to avoid floating-point errors.

```ts
type Role = 'ADMIN' | 'INSTITUTION_REP' | 'VERIFICATION_OFFICER' | 'AUDITOR';

interface DemoUser { id: string; name: string; role: Role; institutionId?: string;
  active: boolean; maxAssignedCases?: number; supervisorId?: string }

interface Institution { id: string /* INST-0001 */; name: string; type: InstitutionType;
  state: string; district: string; aicteCode: string; representativeUserId?: string;
  contactEmail: string; contactPhone: string; status: 'ACTIVE'|'UNDER_REVIEW'|'INACTIVE';
  createdAt: string; updatedAt: string; version: number }

type VerificationStatus = 'SUBMITTED'|'ASSIGNED'|'UNDER_REVIEW'|'INFO_REQUESTED'
  |'DISCREPANCY_FLAGGED'|'FURTHER_SCRUTINY'|'RECOMMENDED_ACCEPT'|'RECOMMENDED_REJECT'
  |'ACCEPTED'|'REJECTED';
type RenewalStatus = 'NONE'|'DUE'|'SUBMITTED'|'COMPLETED';
type AdminStatus = 'RECORDED'|'RELEASE_REQUESTED'|'RELEASED'|'SUPERSEDED';

interface Fdr { id: string /* FDR-2026-00001 or FDR-DEMO-0005 */; applicationRef: string;
  institutionId: string; referenceNo: string; referenceNorm: string;
  bankId: string; branch: string; amountPaise: number; issueDate: string; maturityDate: string;
  category: InstrumentCategory; remarks?: string;
  declaredInstitutionCode: string;          // as written on the instrument, for R-07
  verificationStatus: VerificationStatus; assignedOfficerId?: string; priority: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  renewalStatus: RenewalStatus; adminStatus: AdminStatus;
  predecessorId?: string; currentSuccessorId?: string;
  documentIds: string[]; lastVerifiedAt?: string;
  createdAt: string; createdBy: string; updatedAt: string; version: number; isDemo: boolean }

interface DocumentMeta { id: string; fdrId?: string; requestId?: string; kind: DocumentKind;
  fileName: string; mimeType: string; sizeBytes: number; sha256: string;
  blobKey?: string; isPlaceholder: boolean; uploadedBy: string; uploadedAt: string }

/** Provenance layers — kept separate on purpose (C-01, FR-M07-2) */
interface ExtractedValues { fdrId: string; source: 'MANUAL_READING'|'OCR_PORT';
  values: Partial<Record<VerifiableField, string>>; enteredBy: string; enteredAt: string }
interface VerifiedField { id: string; fdrId: string; field: VerifiableField; value: string;
  method: 'BANK_CONFIRMATION_LETTER'|'OFFICIAL_BANK_CHANNEL_MANUAL'|'AUTHORISED_BANK_API';
  evidenceDocumentId?: string; recordedBy: string; recordedAt: string; note?: string }
interface ReviewEntry { id: string; fdrId: string; officerId: string; kind:
  'OBSERVATION'|'CHECKLIST'|'RECOMMENDATION'|'DECISION'|'OVERRIDE';
  text: string; checklist?: Record<string, boolean>; createdAt: string }

interface FindingResolution { id: string; findingKey: string; /* ruleId:entityId[:field] */
  state: 'ACKNOWLEDGED'|'DISMISSED'; reason: string; by: string; at: string }

interface RenewalLink { id: string; predecessorId: string; successorId: string;
  type: 'RENEWAL'|'REPLACEMENT'; status: 'SUBMITTED'|'ACCEPTED'|'REJECTED'; createdAt: string; closedAt?: string }

type RequestStage = 'SUBMITTED'|'RETURNED_FOR_CORRECTION'|'VALIDATED'|'UNDER_REVIEW'
  |'INFO_REQUESTED'|'RECOMMENDED'|'APPROVED'|'REJECTED'|'ACTION_RECORDED'|'CLOSED';
interface ReleaseRequest { id: string /* REQ-2026-0001 */; institutionId: string; fdrId: string;
  type: 'RELEASE'|'REFUND'; reason: string; documentIds: string[]; stage: RequestStage;
  assignedOfficerId?: string; recommendation?: 'APPROVE'|'REJECT'; reviewNotes: StageNote[];
  decisionRef?: string; decisionReason?: string; finalActionRef?: string;
  submittedAt: string; closedAt?: string; version: number }

interface Notification { id: string; dedupeKey: string; category: NotificationCategory;
  priority: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; title: string; body: string;
  institutionId?: string; fdrId?: string; requestId?: string; link: string;
  audience: { roles: Role[]; institutionId?: string; userId?: string };
  escalationStage: 'INITIAL'|'FOLLOW_UP'|'ESCALATED'; createdAt: string;
  readBy: Record<string /*userId*/, string /*readAt*/> }

interface AuditEvent { id: string; seq: number; at: string; userId: string; role: Role;
  action: ActionId | 'SYSTEM'; entityType: EntityType; entityId: string;
  before?: unknown; after?: unknown; comment?: string;
  outcome: 'SUCCESS'|'DENIED'|'FAILED'; prevHash: string; hash: string }

interface Settings { maturityBands: [number, number, number]; /* default [90,30,7] */
  expiringSoonDays: number; escalation: { followUpAfterDays: number; escalateAfterDays: number };
  upload: { maxBytes: number; allowedMime: string[] }; amountCapPaise: number;
  categoryRequirements: Record<InstrumentCategory, { requiredDocs: DocumentKind[]; checklist: string[] }> }

interface AppState { schemaVersion: number; institutions; fdrs; documents; extracted; verified;
  reviews; findingResolutions; renewalLinks; requests; notifications; audit; users; settings;
  counters: Record<string, number>; meta: { seededAt: string; seedVersion: string } }
```

Collections are stored as `Record<id, Entity>` for O(1) lookup; audit is an ordered array.

---

## 6. Status derivation (single source of truth)

```ts
deriveStatus(fdr: Fdr, ctx: { today: string; settings: Settings; openRequest?: ReleaseRequest;
  findings: Finding[] }): { status: DisplayStatus; flags: Flag[]; daysToMaturity: number; band: Band }
```

`daysToMaturity = differenceInCalendarDays(maturityDate, today)` where `today` comes from `Clock` in Asia/Kolkata.

**Precedence (first match wins):**

| # | Condition | Display status |
|---|---|---|
| 1 | `adminStatus === 'RELEASED'` | Released |
| 2 | `adminStatus === 'SUPERSEDED'` | Superseded |
| 3 | `verificationStatus === 'REJECTED'` | Rejected |
| 4 | `verificationStatus === 'DISCREPANCY_FLAGGED'` | Discrepancy Flagged |
| 5 | `verificationStatus !== 'ACCEPTED'` | Verification Pending |
| 6 | `renewalStatus === 'SUBMITTED'` | Renewal Pending |
| 7 | `daysToMaturity < 0` | Matured |
| 8 | `daysToMaturity <= settings.expiringSoonDays` | Expiring Soon |
| 9 | otherwise | Active |

**Flags (independent, any combination):** `PAST_MATURITY` (days < 0 and status not Released/Superseded) · `RENEWAL_DUE` (accepted, days ≤ expiringSoonDays, renewalStatus ∈ {NONE, DUE}) · `MISSING_DOCUMENTS` (required docs for category absent) · `POSSIBLE_DUPLICATE` (open R-03 finding) · `RELEASE_REQUESTED` (open request).

**Bands:** `days < 0` → MATURED; `0–b3` → CRITICAL; `b3+1–b2` → DUE_SOON; `b2+1–b1` → WATCH; `> b1` → LONG, where `[b1,b2,b3] = settings.maturityBands`.

Unit tests must cover every row, every flag, and band boundaries (−1, 0, 7, 8, 30, 31, 90, 91).

---

## 7. State machines

Each machine is a transition table: `{ from, to, action, roles, guard?, requires? }`. A generic `transition(machine, entity, action, actor, payload)` returns `Result<NextState, DomainError>`. UI buttons are derived from `availableActions(machine, entity, actor)`, so a button can never appear for an illegal transition.

### 7.1 Verification

| From | Action | To | Role | Guard / requirement |
|---|---|---|---|---|
| SUBMITTED | `verification.assign` | ASSIGNED | ADMIN | officer active, under cap |
| ASSIGNED | `verification.startReview` (Mark as Reviewed) | UNDER_REVIEW | OFFICER (assignee) | — |
| UNDER_REVIEW | `verification.requestInfo` | INFO_REQUESTED | OFFICER | message required; lists documents requested |
| INFO_REQUESTED | `verification.respond` | UNDER_REVIEW | INSTITUTION_REP (own) | at least one document or note |
| UNDER_REVIEW, INFO_REQUESTED | `verification.flag` | DISCREPANCY_FLAGGED | OFFICER | observation ≥ 20 chars; linked finding or field |
| DISCREPANCY_FLAGGED | `verification.requestInfo` | INFO_REQUESTED | OFFICER | message required |
| DISCREPANCY_FLAGGED | `verification.resolveFlag` | UNDER_REVIEW | OFFICER | resolution note required |
| UNDER_REVIEW, DISCREPANCY_FLAGGED | `verification.escalate` | FURTHER_SCRUTINY | OFFICER | reason required |
| FURTHER_SCRUTINY | `verification.resumeReview` | UNDER_REVIEW | OFFICER, ADMIN | — |
| UNDER_REVIEW | `verification.recommendAccept` | RECOMMENDED_ACCEPT | OFFICER | mandatory checklist complete; no open BLOCKING finding unless override note given |
| UNDER_REVIEW, DISCREPANCY_FLAGGED | `verification.recommendReject` | RECOMMENDED_REJECT | OFFICER | reason ≥ 20 chars |
| RECOMMENDED_* | `verification.accept` | ACCEPTED | ADMIN | confirm dialog |
| RECOMMENDED_REJECT | `verification.reject` | REJECTED | ADMIN | reason required (C-04) |
| RECOMMENDED_* | `verification.returnToOfficer` | UNDER_REVIEW | ADMIN | note required |

Non-transition actions (allowed in UNDER_REVIEW / DISCREPANCY_FLAGGED / FURTHER_SCRUTINY, assignee only): `verification.recordObservation`, `verification.recordExtracted`, `verification.recordVerified`, `finding.acknowledge`, `finding.dismiss`.

Note: `ACCEPTED` → REJECTED is impossible; there is no path from SUBMITTED to REJECTED without an officer recommendation.

### 7.2 Renewal / replacement
`renewal.submit` (INSTITUTION_REP own, or ADMIN) on an ACCEPTED, not-released predecessor:
1. Creates successor `Fdr` (verificationStatus SUBMITTED, `predecessorId` set).
2. Creates `RenewalLink` (SUBMITTED); predecessor `renewalStatus = SUBMITTED`, `currentSuccessorId` set.
3. When successor → ACCEPTED: link ACCEPTED, predecessor `renewalStatus = COMPLETED`, `adminStatus = SUPERSEDED`.
4. When successor → REJECTED: link REJECTED, predecessor `renewalStatus = DUE`, `currentSuccessorId` cleared (link kept).

Steps 3 and 4 are side effects of the verification decision command, applied in the same atomic commit and audited as separate events on each entity.

### 7.3 Release / refund request

| From | Action | To | Role | Guard |
|---|---|---|---|---|
| — | `request.submit` | SUBMITTED | INSTITUTION_REP (own) | FDR ACCEPTED, not SUPERSEDED/RELEASED, no open request |
| SUBMITTED | `request.validate` (system, automatic) | VALIDATED or RETURNED_FOR_CORRECTION | SYSTEM | reason ≥ 30 chars; required documents present |
| RETURNED_FOR_CORRECTION | `request.resubmit` | SUBMITTED | INSTITUTION_REP | — |
| VALIDATED | `request.assign` | UNDER_REVIEW | ADMIN | officer selected |
| UNDER_REVIEW | `request.requestInfo` | INFO_REQUESTED | OFFICER | message |
| INFO_REQUESTED | `request.respond` | UNDER_REVIEW | INSTITUTION_REP | note or document |
| UNDER_REVIEW | `request.recommend` | RECOMMENDED | OFFICER | recommendation + notes |
| RECOMMENDED | `request.approve` | APPROVED | ADMIN | confirm; decisionRef; label "Simulated administrative decision" |
| RECOMMENDED | `request.reject` | REJECTED | ADMIN | confirm; decisionRef; reason |
| RECOMMENDED | `request.returnToOfficer` | UNDER_REVIEW | ADMIN | note |
| APPROVED | `request.recordAction` | ACTION_RECORDED | ADMIN | finalActionRef; side effect: FDR `adminStatus = RELEASED` |
| REJECTED, ACTION_RECORDED | `request.close` | CLOSED | ADMIN | closure date = today |

On submit, FDR `adminStatus = RELEASE_REQUESTED`; on REJECTED it reverts to RECORDED.

---

## 8. Permission model

`can(user, action, resource?) => { allowed: boolean; reason?: string }` combines **role permission** (matrix) and **scope** (institution ownership, case assignment).

| Action | ADMIN | INST_REP | OFFICER | AUDITOR |
|---|:-:|:-:|:-:|:-:|
| `dashboard.view` | ✓ | ✓ own | ✓ | ✓ |
| `institution.view` | ✓ | ✓ own | ✓ | ✓ |
| `institution.create` / `.edit` | ✓ | – | – | – |
| `fdr.view` | ✓ | ✓ own | ✓ | ✓ |
| `fdr.create` | ✓ | ✓ own | – | – |
| `fdr.edit` (only in SUBMITTED / INFO_REQUESTED) | ✓ | ✓ own | – | – |
| `document.upload` | ✓ | ✓ own | ✓ evidence only | – |
| `verification.assign` | ✓ | – | – | – |
| `verification.review*` (start, observe, flag, requestInfo, extracted, verified, escalate, recommend) | – | – | ✓ assigned | – |
| `verification.respond` | – | ✓ own | – | – |
| `verification.accept` / `.reject` / `.returnToOfficer` | ✓ | – | – | – |
| `finding.acknowledge` / `.dismiss` | ✓ | – | ✓ assigned | – |
| `renewal.submit` | ✓ | ✓ own | – | – |
| `request.submit` / `.resubmit` / `.respond` | – | ✓ own | – | – |
| `request.assign` / `.approve` / `.reject` / `.recordAction` / `.close` / `.returnToOfficer` | ✓ | – | – | – |
| `request.requestInfo` / `.recommend` | – | – | ✓ assigned | – |
| `notification.view` | ✓ | ✓ own | ✓ | ✓ |
| `report.view` / `.export` | ✓ | ✓ own data | ✓ | ✓ |
| `audit.view` / `.export` / `.verifyChain` | ✓ | – | own actions only (view) | ✓ |
| `user.manage` | ✓ | – | – | – |
| `settings.manage` | ✓ | – | – | – |
| `demo.reset` | ✓ | – | – | – |
| `insights.view` | ✓ | ✓ own | ✓ | ✓ |

**Enforcement in three places (defence in depth, same `can()`):**
1. Navigation — sidebar items and routes (`RequirePermission`).
2. Rendering — action buttons via `availableActions()`; disabled buttons show a tooltip with the reason.
3. Command dispatcher — authoritative check; a denied command writes an audit event with `outcome: 'DENIED'` and shows a toast.

Data scoping is applied in selectors (`scope.ts`): every list selector receives the session user and filters before returning.

---

## 9. Command pipeline (single write path)

```ts
interface Command<P> { type: ActionId; payload: P; expectedVersion?: number }
type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };
type DomainError = { code: 'FORBIDDEN'|'VALIDATION'|'CONFLICT'|'INVALID_TRANSITION'|'NOT_FOUND'|'STORAGE';
  message: string; fieldErrors?: Record<string, string> };
```

`dispatch(command, session)`:
1. **Resolve** handler from `registry.ts`; load target entity.
2. **Authorise** with `can()`; on failure → append DENIED audit, return FORBIDDEN.
3. **Validate** payload with the handler's zod schema → VALIDATION with field errors.
4. **Concurrency** — compare `expectedVersion` with entity `version` → CONFLICT ("This record changed in another tab. Reload to continue.").
5. **Transition** — run state machine guard → INVALID_TRANSITION.
6. **Apply** — pure `handler.apply(state, payload, ctx) => { nextState, auditDrafts[], sideEffects[] }`. Increments `version`, sets `updatedAt`.
7. **Audit** — append each draft with `seq`, `prevHash`, `hash`.
8. **Derive** — regenerate notifications for affected entities (idempotent).
9. **Persist** — write the whole envelope in one `setItem`; on failure roll back in-memory state and return STORAGE.
10. **Emit** — notify subscribers; broadcast to other tabs.

Handlers live in `services/commands/handlers/` one file per aggregate (`fdr.ts`, `verification.ts`, `renewal.ts`, `request.ts`, `institution.ts`, `notification.ts`, `settings.ts`, `demo.ts`). Each exports `{ schema, apply }` per action. React uses `useCommand()` which returns `{ run, pending, error }`.

---

## 10. Persistence

- **State:** `localStorage['securefdr:v1:state']` = `{ schemaVersion, savedAt, data: AppState }`.
- **Session:** `localStorage['securefdr:v1:session']` = `{ userId, startedAt }`.
- **Drafts:** `localStorage['securefdr:v1:draft:<userId>']` for the submission wizard.
- **Blobs:** IndexedDB via `idb-keyval` (`securefdr-blobs` store), keyed by `blobKey`. Keeps localStorage small.

**Load sequence:**
1. Read and `JSON.parse` (catch → recovery mode).
2. If `schemaVersion < CURRENT`, run migrations in order (`migrations/vN.ts` are pure `(old) => new`).
3. Validate with `AppStateSchema.safeParse` (fail → recovery mode).
4. If nothing stored → seed.

**Recovery mode:** keep the bad payload under `securefdr:v1:corrupt:<timestamp>`, show a banner with *Download corrupted data* and *Reset demo data*. Never auto-wipe silently.

**Quota:** catch `QuotaExceededError`, show actionable message; audit and notifications are compacted only by explicit admin action (never silently).

**Multi-tab:** listen to `storage` events; reload state and show "Data updated in another tab".

**Abstraction for backend:**
```ts
interface DataGateway { load(): Promise<AppState>; commit(next: AppState, events: AuditEvent[]): Promise<void>; }
```
`LocalDataGateway` today; `HttpDataGateway` later sends commands to `POST /api/commands` and lets the server own audit and validation.

---

## 11. Audit trail

- `appendAudit(state, draft)` assigns `id = AUD-<seq padded>`, `seq = last + 1`, `prevHash = last.hash ?? 'GENESIS'`, `hash = SHA-256(canonicalJSON({...event, hash: undefined}))` via Web Crypto (`crypto.subtle.digest`).
- `canonicalJSON` sorts keys so hashes are stable.
- `verifyChain(audit)` recomputes every hash and returns `{ ok: true } | { ok: false, firstBrokenSeq }`.
- No update or delete function exists for audit in any module. Reset starts a new chain whose first event is `demo.reset`.
- UI copy: "Integrity check demonstration. A client-side chain can be rebuilt by anyone with device access; production requires server-side, append-only storage."

---

## 12. Rule engine (discrepancy detection)

```ts
interface Rule { id: string; title: string; severity: 'BLOCKING'|'REVIEW'|'INFO';
  appliesTo: 'FDR'|'REQUEST'; evaluate(ctx: RuleContext): Finding[] }
interface Finding { key: string; ruleId: string; severity; title: string; explanation: string;
  entityRefs: { type: EntityType; id: string }[]; field?: string;
  evidence?: { submitted?: string; compared?: string; source?: string };
  suggestedReview: string; resolution?: FindingResolution }
```
`runRules(state, today, settings)` runs every rule, attaches stored resolutions by `key`, and is memoised on `state` identity.

| ID | Rule | Severity | Logic |
|---|---|---|---|
| R-01 | Missing required field | BLOCKING | Required fields empty |
| R-02 | Exact duplicate reference | BLOCKING | Same `referenceNorm` + same `bankId` on another non-rejected FDR |
| R-03 | Possible duplicate | REVIEW | Same `referenceNorm` different bank, or Levenshtein ≤ 1 same bank, or same bank + amount + issue date |
| R-04 | Invalid date sequence | BLOCKING | maturity ≤ issue, or issue in the future |
| R-05 | Maturity approaching | INFO | 0 ≤ days ≤ expiringSoonDays |
| R-06 | Maturity passed | REVIEW | days < 0 and not Released/Superseded |
| R-07 | Institution identifier mismatch | REVIEW | `declaredInstitutionCode` ≠ linked institution's `aicteCode` |
| R-08 | Document value mismatch | REVIEW | `ExtractedValues` field ≠ submitted field (only if extracted values exist) |
| R-09 | Missing supporting document | BLOCKING | Category's `requiredDocs` not all attached |
| R-10 | Conflicting records | REVIEW | Same reference + bank on two records with different amount or dates |
| R-11 | Amount outside configured range | REVIEW | amount ≤ 0 or > `amountCapPaise` |
| R-12 | Verified value differs from submitted | REVIEW | `VerifiedField.value` ≠ submitted value |

**Normalisation:** `referenceNorm = reference.toUpperCase().replace(/[\s\-\/_.]/g, '')`.

Every explanation is templated, e.g. *"The amount read from the uploaded document (₹5,00,000) differs from the submitted amount (₹50,00,000). Review the document and confirm the correct value with the issuing bank through an approved channel."*

---

## 13. Insights engine

Same pattern as rules: `InsightProvider.generate(state, today, settings, user) => Insight[]`, with `{ id, kind, title, why, records, reviewAction, priority }`.

| ID | Insight | Source |
|---|---|---|
| I-01 | Maturity priority list | bands CRITICAL + MATURED, sorted by days and amount |
| I-02 | Duplicate references | R-02, R-03 findings |
| I-03 | Incomplete submissions | R-01, R-09 findings |
| I-04 | Inconsistent fields | R-07, R-08, R-10, R-12 |
| I-05 | Verification backlog | counts by state and officer, oldest case age |
| I-06 | Institutions with multiple pending actions | ≥ 3 open items per institution |
| I-07 | Daily action summary | template over I-01…I-06 counts |
| I-08 | Suggested next step | lookup table: (verificationStatus, renewalStatus, request stage, role) → next action text |

`RuleBasedInsightProvider` is the default. A future `RemoteInsightProvider` must return the same shape and must not be enabled without configuration.

---

## 14. Notifications and escalation

`generateNotifications(state, today, settings)` produces candidates with a `dedupeKey`:

| Category | dedupeKey | Audience |
|---|---|---|
| Upcoming maturity | `MAT:<fdrId>:<band>` | ADMIN, institution REP |
| Overdue maturity action | `OVD:<fdrId>:<escalationStage>` | ADMIN, REP; ESCALATED → supervisor |
| Missing documents | `DOC:<fdrId>` | REP, assigned OFFICER |
| Pending verification | `PV:<fdrId>:<status>` | assigned OFFICER or ADMIN if unassigned |
| Discrepancy flagged | `DIS:<fdrId>:<flagAuditSeq>` | REP, ADMIN |
| Renewal due | `REN:<fdrId>` | REP |
| Request awaiting action | `REQ:<requestId>:<stage>` | role that owns next action |
| Returned for correction | `RET:<requestId>:<auditSeq>` | REP |

Merge rule: insert if key absent; never duplicate; never delete read history. Escalation stage = INITIAL at trigger, FOLLOW_UP after `followUpAfterDays` unresolved, ESCALATED after `escalateAfterDays`. Scheduler runs on app load and every 5 minutes (`setInterval`, cleared on unmount). `NotificationChannelPort` has `InAppChannel` today; email/SMS adapters later.

---

## 15. Integration ports

```ts
interface AuthProvider { currentUser(): DemoUser | null; signIn(userId: string): void; signOut(): void }
interface BankConfirmationPort { readonly configured: boolean;
  confirm(req: { bankId; referenceNo; amountPaise; issueDate; maturityDate }): Promise<Result<BankConfirmation>> }
interface OcrPort { readonly configured: boolean; extract(blob: Blob): Promise<Result<Partial<Record<VerifiableField,string>>>> }
interface NotificationChannelPort { send(n: Notification): Promise<Result<void>> }
interface InsightProvider { generate(...): Insight[] }
```
Mock adapters: `DemoAuthProvider`; `NotConfiguredBankConfirmation` (always returns `NOT_CONFIGURED`, UI disables the option); `ManualOcr` (`configured = false`, UI shows manual entry); `InAppChannel`; `RuleBasedInsightProvider`. All wired in one `services/integrations/index.ts`.

---

## 16. Routing

| Path | Page | Permission |
|---|---|---|
| `/login` | Login | public |
| `/` | Dashboard | `dashboard.view` |
| `/institutions`, `/institutions/:id` | Registry, detail | `institution.view` |
| `/fdrs`, `/fdrs/:id` | Registry, detail | `fdr.view` |
| `/fdrs/new`, `/fdrs/:id/renew` | Submission wizard (new / renewal mode) | `fdr.create` / `renewal.submit` |
| `/verification`, `/verification/:fdrId` | Queue, workspace | `verification.review*` or `verification.assign` |
| `/maturity` | Monitoring | `fdr.view` |
| `/requests`, `/requests/new`, `/requests/:id` | Requests | `request.*` / `fdr.view` |
| `/notifications` | Centre | `notification.view` |
| `/insights` | Intelligence & Insights | `insights.view` |
| `/reports`, `/reports/:reportId/print` | Reports | `report.view` |
| `/audit` | Audit trail | `audit.view` |
| `/users` | Users & access | `user.manage` or read-only matrix for others |
| `/settings` | Settings | `settings.manage` |
| `/403`, `*` | Forbidden, Not found | — |

Filters, sort, page and tab live in URL search params. Routes are lazy-loaded per feature.

---

## 17. UI system

**Tokens (Tailwind `theme.extend.colors`):**
| Token | Hex | Use |
|---|---|---|
| `navy-900` | `#0B1F3A` | Sidebar, headings |
| `navy-700` | `#16345F` | Primary buttons |
| `navy-50` | `#EEF3FA` | Selected rows |
| `teal-600` | `#0E8C7E` | Accent, positive |
| `slate-*` | Tailwind defaults | Text, borders, surfaces |
| `amber-600` | `#B45309` | Expiring / warning |
| `red-700` | `#B91C1C` | Discrepancy, critical |
| `violet-700` | `#6D28D9` | Superseded / renewal |

Status → badge colour map lives in one file (`components/ui/StatusBadge.tsx`) and uses icon + text, never colour alone.

**Provenance panel colours:** Submitted = slate border · Potential issues = amber border with "Automated check" tag · Verified = teal border with method chip · Conclusions = navy border with officer name.

**Patterns:** tables have sticky headers, empty state, skeleton (300 ms simulated latency in the mock gateway so loading states are visible), and row click → drawer. Every consequential action uses `ConfirmDialog` summarising what will change. Toasts for success/failure. Typography: Inter (system fallback), base 14 px, page title 20–24 px.

---

## 18. Security in the prototype

- Render all user text as React text nodes; no `dangerouslySetInnerHTML`; ESLint rule enforces this.
- Trim and length-limit text inputs in zod schemas (e.g., remarks ≤ 1,000 chars).
- File checks: extension whitelist, MIME whitelist, magic bytes (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`), size limit; rejected files never stored.
- CSV: prefix cells starting with `= + - @ \t \r` with `'`; quote all fields.
- No secrets, keys or real data in the repo. `isDemo: true` on all seed entities.
- Session logout clears session key and in-memory sensitive UI state.

---

## 19. Error handling and resilience

- `RouteErrorBoundary` per route with "Reload page" and "Go to dashboard".
- All command failures surface as toasts plus inline field errors for VALIDATION.
- Selectors never throw on missing references; they return a `Missing record` placeholder and log a console warning.
- Charts render an empty state when data is empty, never a blank box.

---

## 20. Testing strategy

| Layer | Tool | Must cover |
|---|---|---|
| Domain | Vitest | deriveStatus table + boundaries; bands; every machine transition (allowed and denied); `can()` matrix; each rule R-01…R-12 positive and negative; duplicate normalisation; money/date utils; hash chain verify |
| Data | Vitest | migrations; load with corrupt JSON → recovery; seed determinism (same output twice); notification dedupe (run twice → same count) |
| Commands | Vitest | dispatcher: denied → DENIED audit, validation errors, version conflict, rollback on storage failure |
| UI | Testing Library | submission wizard validation; verification actions update badge |
| Acceptance | Playwright (optional) or `DEMO_SCRIPT.md` checklist | T01–T12 |

---

## 21. Production target (for the pitch)

```
Browser (same React app, HttpDataGateway)
   │ HTTPS (TLS 1.2+), WAF, rate limiting
API service (NestJS or Spring Boot) ── policy engine (server-side RBAC/ABAC)
   ├─ PostgreSQL (encrypted at rest, PITR backups)
   ├─ Object storage for documents (encrypted, malware scan on upload, retention rules)
   ├─ Append-only audit store (WORM / ledger table with restricted access)
   ├─ Scheduler (maturity scan, escalations) → email/SMS gateway (authorised)
   ├─ Identity: institutional SSO / government identity provider, MFA
   └─ Integrations: authorised bank confirmation interface, approved OCR service
Observability: structured logs, metrics, alerting · Deployment on government-approved cloud
```
The domain folder (status, machines, rules, permissions) is written to be reused unchanged on the server so client and server cannot disagree.
