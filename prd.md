# PRD — AICTE SecureFDR

**Intelligent Security Deposit & Fixed Deposit Receipt Management System**
*Tagline: Every Deposit. Verified. Tracked. Accountable.*

| Field | Value |
|---|---|
| Event | Smart India Hackathon (SIH) |
| Problem Statement ID | 26265 (as provided by the team — confirm against the official SIH portal before submission) |
| Category | Software |
| Primary stakeholder | AICTE Regulation Bureau and authorised technical institutions |
| Document type | Product Requirements Document (WHAT and WHY) |
| Companion files | `architecture.md` (HOW it is structured), `agent.md` (HOW to build it) |
| Status | Build-ready v1.0 |

---

## 0. How this document set works

| File | Answers | Audience |
|---|---|---|
| `prd.md` | What must exist, why, and how we know it works | Team, judges, coding agent |
| `architecture.md` | How the code is structured, data model, state machines, interfaces | Developers, coding agent |
| `agent.md` | Build order, rules, quality gates, definition of done | Coding agent (Claude Code, Cursor, Codex, etc.) |

**Precedence when documents conflict:**
1. Integrity constraints in §3 of this file (never overridden)
2. Functional requirements in this file
3. `architecture.md`
4. Defaults in `agent.md`

Every requirement has a stable ID (`FR-<module>-<n>`, `AC-<module>-<n>`, `C-<n>`, `NFR-<n>`, `T<n>`) so code, tests, and commits can reference it.

---

## 1. Product summary

### 1.1 Problem
AICTE-related security deposits and Fixed Deposit Receipts (FDRs) need institution-wise record keeping, document verification, maturity monitoring, renewal or replacement, release/refund handling, and audit-ready reporting. Today this work is often spread across spreadsheets, email and manual follow-ups. The results are missing records, late renewals, unresolved discrepancies, and no single view of what needs action.

### 1.2 Solution
A centralised, role-based web portal that:
- keeps one registry of every instrument, linked to its institution, documents, verification history, renewals and requests;
- derives each instrument's status consistently from its record, dates and workflow state;
- runs explainable, rule-based checks that surface *potential* issues for human review;
- drives verification, renewal, and release/refund through explicit, auditable workflows;
- generates reminders and escalations from the data itself;
- records every significant action in an append-only audit trail.

### 1.3 What the hackathon build is
A fully interactive **frontend prototype with a simulated backend** (React + TypeScript, browser persistence). All workflows work end-to-end against demonstration data. Integration points for a real backend, identity provider, bank confirmation, OCR, and messaging are defined as interfaces with clearly labelled mock adapters.

---

## 2. Goals and non-goals

### 2.1 Goals
| ID | Goal | Measured by |
|---|---|---|
| G1 | Single source of truth for all instruments | Every FDR reachable from registry, institution page, global search |
| G2 | No maturity goes unnoticed | Every instrument within threshold appears in maturity view, notifications, and dashboard |
| G3 | Verification is structured and explainable | Every finding shows rule, reason, records and suggested review |
| G4 | Every decision is accountable | Every state change produces an audit event with actor, before/after, comment |
| G5 | Access is role-appropriate | Each role sees and can do only what the permission matrix allows |
| G6 | Judges can verify it works | Acceptance tests T01–T12 pass live in under 10 minutes |

### 2.2 Non-goals (explicitly out of scope for the prototype)
- Real bank verification, bank API calls, or bank credential handling
- Real money movement, refunds, lien removal, or encashment
- Production-grade authentication, authorisation, or tamper-proof audit storage
- Interpreting or encoding actual AICTE regulations as legal rules (rule thresholds are configurable placeholders)
- Any claim of AICTE or bank endorsement, certification, or integration

---

## 3. Integrity constraints (non-negotiable)

These apply to code, UI copy, seed data, README and pitch material.

| ID | Constraint |
|---|---|
| C-01 | Never present a simulated check as bank verification. "Verified" in the UI always means *recorded as verified by a named officer, with method and evidence*. |
| C-02 | Never state or imply financial validity from a date alone. "Active" means *recorded, accepted, and not past maturity* — nothing more. |
| C-03 | Rule-engine output is labelled **"Potential issue — requires review"**. Never "fraud", "fake", "invalid FDR", risk percentages, or AI accuracy figures. |
| C-04 | No automatic rejection. A rejection requires an officer recommendation **and** an administrator decision with a written reason. |
| C-05 | Approvals of release/refund are labelled **"Simulated administrative decision"**. The system never says a refund was paid or funds were released. |
| C-06 | A matured instrument is never silently changed to renewed, extended, released, or valid. Every such change is an explicit, audited action. |
| C-07 | A predecessor instrument is never deleted or overwritten when renewed/replaced; history is preserved and linked. |
| C-08 | All names, IDs, banks, amounts and histories are fictional and visibly marked **Demonstration data**. No real institutions or banks. |
| C-09 | Demo login is labelled **"Demonstration authentication — not for production use"**. |
| C-10 | No feature may require a paid API, an API key, or external credentials to run the demo. |
| C-11 | Audit records cannot be edited or deleted from the UI by any role. |
| C-12 | AI/insight output is advisory. Every insight shows *why*, *which records*, and *what a human should review*. |

---

## 4. Users and roles

| Role | Code | Data scope | Core purpose |
|---|---|---|---|
| AICTE Administrator | `ADMIN` | All institutions | Oversees portfolio, assigns verification, acts as competent authority for decisions (prototype), configures thresholds |
| Institution Representative | `INSTITUTION_REP` | Own institution only | Submits FDRs, documents, renewals, release/refund requests; responds to queries |
| Verification Officer | `VERIFICATION_OFFICER` | Read all; act only on assigned cases | Scrutinises instruments, records observations and verified details, flags discrepancies, recommends |
| Read-only Auditor | `AUDITOR` | All, read-only | Views records and audit histories, generates and exports reports |

The full action-by-role matrix is in `architecture.md` §8 and is the single source of truth for permissions.

**Demo users (fictional):**
| User | Role | Notes |
|---|---|---|
| Ananya Rao | ADMIN | Competent authority in the prototype |
| Vikram Nair | VERIFICATION_OFFICER | Has the larger assigned queue |
| Farah Siddiqui | VERIFICATION_OFFICER | Second officer, for workload chart |
| Rahul Menon | INSTITUTION_REP | Linked to `INST-0003` |
| Priya Iyer | AUDITOR | Read-only |

---

## 5. Functional requirements by module

Modules are independent feature folders (see `architecture.md` §4). Each lists functional requirements (FR) and acceptance criteria (AC).

### M01 — Authentication and role switching
- **FR-M01-1** Login page shows product name, tagline, the four demo users as selectable cards (name, role, scope), and the C-09 banner.
- **FR-M01-2** Selecting a user starts a session stored in browser storage; refresh keeps the session.
- **FR-M01-3** A role switcher in the profile menu changes the active demo user without losing data.
- **FR-M01-4** Logout clears the session and returns to login; data is kept.
- **FR-M01-5** Login page links to "What is simulated" (see §11).
- **AC-M01-1** After switching from ADMIN to INSTITUTION_REP, the sidebar, tables and action buttons immediately reflect the new scope.

### M02 — Application shell
- **FR-M02-1** Persistent left sidebar with icons, grouped sections, active-page indicator, collapsible on tablet, drawer on mobile. Items hidden when the role has no access.
- **FR-M02-2** Top bar: global search (Ctrl/⌘+K) across institutions, FDR references, request IDs; notification bell with unread count; profile menu with role switcher; primary **Add New FDR** button (shown only if permitted).
- **FR-M02-3** A persistent, subtle "Demonstration data" chip in the top bar.
- **FR-M02-4** Each route has its own error boundary; a crash in one page never blanks the whole app.
- **FR-M02-5** Unknown routes show a 404 page; forbidden routes show a 403 page that names the missing permission.

### M03 — Executive dashboard
- **FR-M03-1** KPI cards (all computed from current state): Total institutions · Active FDRs · Total recorded deposit value · Expiring ≤ 30 days · Pending verifications · Overdue renewals · Release/refund requests awaiting action · Instruments with open discrepancies.
- **FR-M03-2** Every KPI card links to a pre-filtered list using URL query parameters (e.g., `/fdrs?status=EXPIRING_SOON`).
- **FR-M03-3** Charts (Recharts, with tooltips, axis labels, legends): status distribution; monthly maturity timeline (next 12 months, count and value); verification workload by officer and state; deposit value by state/region.
- **FR-M03-4** Panels: recent activity (from audit log), upcoming maturities, high-priority action queue, recent submissions and requests.
- **FR-M03-5** Dashboard content respects role scope (an institution rep sees only their institution's figures).
- **FR-M03-6** Section header shows "Figures are computed from demonstration data."
- **AC-M03-1** Creating an FDR (T01) changes the relevant KPI and chart without a page reload.

### M04 — Institution management
- **FR-M04-1** Registry table: Institution ID, name, type, state, district, authorised representative, fictional contact, linked FDR count, total recorded deposit, pending actions, status.
- **FR-M04-2** Search by name/ID; filter by state, status, type; sortable columns; pagination (10/25/50).
- **FR-M04-3** Institution detail page with tabs: Overview · Instruments · Pending actions · Requests · Activity history.
- **FR-M04-4** ADMIN can create/edit institutions with validation; others read-only (rep sees own only).

### M05 — FDR and security deposit registry
- **FR-M05-1** Table columns: internal record ID, institution (name + ID), FDR reference, bank + branch, amount (₹, Indian grouping), issue date, maturity date, derived status badge, secondary flags, last verification date, verification status, renewal status, administrative status, document count, last updated.
- **FR-M05-2** Filters: institution, reference, bank, amount range, maturity period (band), verification status, derived status, renewal status. Filters live in the URL so they survive refresh and can be linked.
- **FR-M05-3** Status labels are produced only by the shared status derivation function (`architecture.md` §6). No component computes status on its own.
- **FR-M05-4** Detail page/drawer with tabs: Summary · Timeline · Documents · Verification history · Renewal chain (predecessor/successors) · Linked requests · Audit history · Findings.
- **FR-M05-5** Edit allowed only in states and roles permitted by the matrix; every edit produces an audit event with before/after.
- **FR-M05-6** Column visibility toggle and CSV export of the current filtered view (permission-gated).

### M06 — New FDR submission
- **FR-M06-1** Five-step stepper: (1) Institution (pre-filled and locked for reps) → (2) Instrument details (reference, bank, branch, amount, issue date, maturity date, category, remarks) → (3) Documents (FDR scan/PDF required; bank confirmation optional unless category requires it; other prescribed documents) → (4) Review → (5) Submitted, with application reference and status timeline.
- **FR-M06-2** Validation per field on blur and per step on Next: required fields, amount > 0 and ≤ configured cap, valid dates, maturity strictly after issue, issue date not in the future.
- **FR-M06-3** Files: PDF/JPG/PNG only, ≤ 5 MB each (configurable), checked by extension, MIME type and file signature; the SHA-256 hash is stored as an integrity *reference*, not as authentication.
- **FR-M06-4** Duplicate check on reference: **Exact match** (same normalised reference + same bank) blocks submission with a link to the existing record; **Possible duplicate** (near match or same bank + amount + issue date) shows a warning, requires acknowledgement, and creates a review finding.
- **FR-M06-5** Draft autosave per step; leaving with unsaved changes prompts a confirmation.
- **FR-M06-6** Submission generates `APP-YYYY-NNNNNN`, creates the FDR with verification status `SUBMITTED`, creates audit and notification events, and appears immediately in registry and dashboard.
- **AC-M06-1** Uploaded documents are never described as authenticated or bank-verified (C-01).

### M07 — Document verification centre (priority module)
- **FR-M07-1** Queue: pending cases with priority, age, assigned officer, open findings count; filter "Assigned to me", priority, state. ADMIN can assign/reassign officers.
- **FR-M07-2** Workspace with four clearly separated, colour-coded panels:
  1. **Submitted information** — values entered by the institution.
  2. **Automatically detected potential issues** — rule findings with severity, explanation, records involved, suggested review.
  3. **Independently verified information** — values recorded by an officer, each with method, evidence document, officer and timestamp.
  4. **Officer review conclusions** — observations, checklist, recommendation.
- **FR-M07-3** Document preview panel (PDF/image viewer for uploads; generated placeholder for seed documents marked "Sample placeholder").
- **FR-M07-4** "Values as read from document" entry (manual, or from the OCR port if configured) so the system can compare document values against submitted values without any external API.
- **FR-M07-5** Configurable verification checklist per instrument category; missing-document indicators.
- **FR-M07-6** Actions (each permission-checked, confirmed where consequential, and audited): Mark as Reviewed · Request Additional Documents · Flag Discrepancy · Record Verified Details · Recommend Acceptance · Recommend Rejection · Send for Further Scrutiny. ADMIN additionally: Accept · Reject · Return to officer.
- **FR-M07-7** Recommend Acceptance is blocked while blocking findings are open unless the officer records an override justification (audited).
- **FR-M07-8** Findings can be acknowledged or dismissed with a reason; dismissal never deletes the finding history.
- **FR-M07-9** Verified-details method options: *Bank confirmation letter on file* · *Manual confirmation via official bank channel* · *Authorised bank API (not configured in prototype — disabled)*.
- **AC-M07-1** Each action changes the record's state per the state machine and appends one audit event per entity it changes (e.g., accepting a renewal successor also logs the predecessor becoming Superseded).

### M08 — Maturity monitoring and renewals
- **FR-M08-1** Bands (thresholds configurable by ADMIN, defaults 90/30/7): > 90 days · 31–90 · 8–30 · 0–7 · Matured. Band counts shown as summary tiles.
- **FR-M08-2** Views: timeline/calendar (month grid with maturity dots) and table sorted by days remaining, with priority indicator.
- **FR-M08-3** Overdue action queue: matured instruments with no accepted renewal, no release, and no closed case.
- **FR-M08-4** Reminder history per instrument (from notifications).
- **FR-M08-5** **Renewal Submitted** action opens a renewal/replacement form, pre-filled from the predecessor, creating a new FDR linked by `predecessorId`. The new FDR goes through normal verification.
- **FR-M08-6** On successor acceptance, the predecessor becomes **Superseded**; its history, documents and audit trail stay intact and viewable from the renewal chain.
- **FR-M08-7** If a successor is rejected, the predecessor returns to *Renewal due*; the rejected link remains in history.
- **AC-M08-1** No code path changes a matured instrument's state without an explicit user action (C-06).

### M09 — Release and refund requests
- **FR-M09-1** Fields: request ID, institution, linked FDR, type (Release / Refund), submission date, reason, supporting documents, review notes, current stage, assigned officer, decision reference, closure date.
- **FR-M09-2** Stages (see state machine in `architecture.md` §7.3): Submitted → System validation (auto) → Under review → Information requested ↔ Under review → Recommended → Approved/Rejected (simulated) → Final action recorded → Closed. Returned-for-correction loop after failed validation.
- **FR-M09-3** Only one open request per FDR; FDR must be accepted and not superseded.
- **FR-M09-4** Approve/Reject require a confirmation dialog, decision reference and reason, and display the C-05 label.
- **FR-M09-5** Full stage timeline with actor, timestamp and notes.
- **FR-M09-6** "Final action recorded" sets the FDR administrative status to Released and stores the decision reference.

### M10 — Notifications and escalation
- **FR-M10-1** Categories: upcoming maturity, overdue maturity action, missing documents, pending verification, discrepancy flagged, renewal due, request awaiting action, request returned for correction.
- **FR-M10-2** Each notification: priority, category, related institution and FDR/request, timestamp, read state, action link.
- **FR-M10-3** Mark as read, mark all as read, filter by category/priority/read state. Bell count updates instantly.
- **FR-M10-4** Notifications are generated from current data on app load and every 5 minutes while open, using de-duplication keys so refreshes never create duplicates.
- **FR-M10-5** Escalation matrix (configurable): initial reminder → follow-up after N days → escalation to designated supervisor after M days. Escalation stage is shown on the notification.
- **FR-M10-6** Notifications are routed by role and scope (a rep only sees their institution's notifications).
- **FR-M10-7** Page footer explains that production delivery needs a server-side scheduler and authorised email/SMS gateways.

### M11 — Reports and analytics
- **FR-M11-1** Reports: institution-wise deposit summary · active instruments · maturity forecast · renewal compliance · pending verification · discrepancy report · release/refund requests · overdue actions · audit activity.
- **FR-M11-2** Date range and status filters; preview table always shows exactly what will be exported.
- **FR-M11-3** CSV export (UTF-8 with BOM for Excel, formula-injection-safe), filename includes report ID, filters and timestamp.
- **FR-M11-4** Print-friendly route with header (report title, filters, generated by, timestamp, "Demonstration data") → browser Print to PDF.
- **FR-M11-5** Reports are defined as configuration objects (columns + row selector), so new reports need no new page.

### M12 — Audit trail
- **FR-M12-1** Append-only log: event ID, timestamp, demo user and role, action, entity type, entity ID, previous state, new state, comment, outcome (success/denied/failed).
- **FR-M12-2** Denied permission attempts are logged as outcome = denied.
- **FR-M12-3** Search, filter (user, role, action, entity, date, outcome), export CSV.
- **FR-M12-4** Hash chain: each event stores the hash of the previous event; a **Verify chain integrity** button reports intact/broken with the first broken event. Labelled as a demonstration of integrity checking, not tamper-proof storage.
- **FR-M12-5** No edit/delete controls anywhere (C-11).

### M13 — Users and access management
- **FR-M13-1** List demo users with role, scope, status.
- **FR-M13-2** Read-only permission matrix view generated from the same data the guards use.
- **FR-M13-3** ADMIN can toggle a demo user active/inactive and change officer assignment caps; audited.

### M14 — Settings and configuration
- **FR-M14-1** Maturity thresholds, expiring-soon days, escalation timings, file size/type limits, amount cap, category → required documents, checklist items.
- **FR-M14-2** Settings validated (e.g., thresholds strictly descending positive integers); changes audited with before/after.
- **FR-M14-3** **Reset demo data** behind a confirmation dialog requiring the word RESET; logged as the first event of the new audit chain.
- **FR-M14-4** "Integrations" panel showing each port (bank confirmation, OCR, notifications, identity provider) with status *Not configured — mock adapter active*.

### M15 — Intelligence and insights
- **FR-M15-1** Labelled module "Intelligence & Insights — rule-based, advisory".
- **FR-M15-2** Insights: maturity priority list · duplicate references · incomplete submissions · inconsistent fields · verification backlog summary · institutions with multiple pending actions · daily action summary · suggested next step per record.
- **FR-M15-3** Each insight card shows: what was found, rule that produced it, records involved (links), what an authorised user should review.
- **FR-M15-4** Daily action summary is a templated, plain-language paragraph built from computed facts — no generative model required.
- **FR-M15-5** An `InsightProvider` port allows a future authorised AI service; the default provider is rule-based and needs no API key.

---

## 6. User-facing status vocabulary

| Label | Meaning (plain language) |
|---|---|
| Active | Accepted after verification, not past maturity, not released or superseded |
| Expiring Soon | Accepted, maturity within the configured window (default 30 days) |
| Matured | Accepted, past maturity date, no accepted renewal or release yet |
| Renewal Pending | A renewal/replacement has been submitted and is under verification |
| Verification Pending | Submitted, verification not yet concluded |
| Discrepancy Flagged | An officer has flagged a discrepancy that is unresolved |
| Rejected | Administrator rejected the submission (with reason) |
| Superseded | Replaced by an accepted renewal/replacement; history retained |
| Released | Final release action recorded (simulated) |

Secondary flags (shown as small chips beside the status): *Past maturity*, *Renewal due*, *Missing documents*, *Possible duplicate*, *Release requested*.

Exact derivation and precedence: `architecture.md` §6.

---

## 7. Demonstration data

### 7.1 Volume
At least 12 institutions, 36 FDRs, 6 banks (fictional), 8 release/refund requests, 40 notifications, 150 audit events. Dates are offsets from the current date so the demo always looks current. Seed generation is deterministic (seeded random), so every reset produces the same dataset.

### 7.2 Fictional banks (examples)
Bharat Sahyog Bank (Demo) · Deccan Union Bank (Demo) · Kaveri Co-operative Bank (Demo) · Northern Trust Bank of India (Demo) · Coastal Federal Bank (Demo) · Vindhya Gramin Bank (Demo)

### 7.3 Required scenario catalogue (fixed IDs so the demo script can find them)
| ID | Scenario | Record |
|---|---|---|
| S-01 | Matures in 5 days | `FDR-DEMO-0005` |
| S-02 | Matures in 20 days | `FDR-DEMO-0020` |
| S-03 | Matured 12 days ago, no action | `FDR-DEMO-0012` |
| S-04 | Renewed: predecessor superseded, successor active | `FDR-DEMO-0031` → `FDR-DEMO-0032` |
| S-05 | Exact duplicate reference attempt (blocked) | reference `KCB/FD/778812` |
| S-06 | Possible duplicate needing review | `FDR-DEMO-0018` vs `FDR-DEMO-0019` |
| S-07 | Missing bank confirmation document | `FDR-DEMO-0007` |
| S-08 | Request awaiting further information | `REQ-DEMO-0003` |
| S-09 | Request pending authorised approval (Recommended) | `REQ-DEMO-0004` |
| S-10 | Released with recorded decision reference | `FDR-DEMO-0027` / `REQ-DEMO-0001` |
| S-11 | Document value mismatch (amount on document ≠ submitted) | `FDR-DEMO-0014` |
| S-12 | Institution with 4+ pending actions | `INST-0006` |
| S-13 | Unassigned submission for live verification demo | `FDR-DEMO-0035` |

**Seed state rules so the acceptance tests run without setup:**
- `FDR-DEMO-0005` belongs to `INST-0003` (Rahul Menon's institution) and is Accepted, so T04 can be run by the rep.
- `FDR-DEMO-0014` is assigned to Vikram Nair, in Under review, with "values as read from document" already entered, so T03 shows the R-08 finding immediately.
- `INST-0003` holds at least three Accepted FDRs with no open request, so T05 can be started live.
- `REQ-DEMO-0004` is at Recommended (approve) so the administrator can decide it live.

---

## 8. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Performance | Initial load < 3 s on a mid-range laptop; table interactions < 150 ms for 500 records |
| NFR-02 | Reliability | No data loss on refresh; corrupted or old-version storage is detected and migrated or recovered without a white screen |
| NFR-03 | Reliability | All writes go through one command pipeline (authorise → validate → transition → audit → persist) |
| NFR-04 | Reliability | Notification generation and seed generation are idempotent and deterministic |
| NFR-05 | Consistency | Status, permissions, money and date logic each live in exactly one module |
| NFR-06 | Accessibility | WCAG 2.1 AA contrast; all controls keyboard-operable; visible focus; labelled inputs; dialogs trap focus |
| NFR-07 | Responsive | Works at 360 px, 768 px, 1280 px, 1920 px widths |
| NFR-08 | Security (prototype) | No `dangerouslySetInnerHTML`; user text rendered as text; CSV injection guard; file signature checks; permission checked in UI and in the command layer |
| NFR-09 | Maintainability | TypeScript strict; ESLint clean; feature folders do not import each other's internals |
| NFR-10 | Testability | Domain logic has unit tests; acceptance tests have a scripted manual run and optional Playwright specs |
| NFR-11 | Localisation-ready | Money in ₹ with Indian digit grouping; dates `DD MMM YYYY`; timezone Asia/Kolkata for date-only logic |
| NFR-12 | Offline | Runs entirely offline after `npm install`; no network calls at runtime |

---

## 9. Acceptance test suite

All tests must pass in the running app, not just render.

| ID | Test | Pass criteria |
|---|---|---|
| T01 | Create a new FDR | As INSTITUTION_REP, complete all steps, submit; record appears in registry with Verification Pending; dashboard Pending Verifications KPI increases by 1 |
| T02 | Detect approaching maturity | Maturity page shows `FDR-DEMO-0005` in 0–7 band with Critical priority and a reminder in notifications |
| T03 | Verify an instrument | As officer, open `FDR-DEMO-0014`, see amount-mismatch finding, flag discrepancy with observation; status → Discrepancy Flagged; audit shows before/after and comment |
| T04 | Process a renewal | Submit renewal for `FDR-DEMO-0005`; new FDR links to it; after acceptance predecessor shows Superseded with full history |
| T05 | Release/refund request | Submit as rep → review and recommend as officer → approve as admin (simulated label) → record action → close; timeline and audit show every stage |
| T06 | Access control | Each role sees different sidebar items and buttons; an auditor attempting an action via URL gets a 403 and a denied audit event |
| T07 | Report export | Apply status + date filters; CSV contains exactly the previewed rows and columns |
| T08 | Persistence | Changes from T01–T05 survive a browser refresh |
| T09 | Notifications | Open a notification, follow its link, mark as read; unread count decreases; state survives refresh |
| T10 | Data integrity | Maturity before issue date, missing required fields, oversized file, wrong file type and exact duplicate reference are each blocked with a clear message; nothing is saved and no audit success event is written |
| T11 | Audit integrity | "Verify chain integrity" reports intact; after manually editing storage in DevTools it reports the first broken event |
| T12 | Reset and recovery | Reset demo data restores the scenario catalogue; corrupting the storage JSON shows a recovery banner instead of a crash |

---

## 10. Judge demo script (≈ 7 minutes)

1. **Login (30 s)** — Point out demo-authentication banner; log in as Ananya Rao (Admin).
2. **Dashboard (60 s)** — KPIs, click "Expiring ≤ 30 days" → filtered registry.
3. **Maturity (45 s)** — Critical band, `FDR-DEMO-0005`, reminder history, overdue queue.
4. **Submission (75 s)** — Switch to Rahul Menon; show validation blocking bad dates and the duplicate block; submit a valid FDR; show reference and timeline.
5. **Verification (90 s)** — Switch to Vikram Nair; open `FDR-DEMO-0014`; show four separated panels; flag discrepancy; show audit entry.
6. **Renewal (45 s)** — Renewal chain on `FDR-DEMO-0031` → `0032`.
7. **Release (45 s)** — `REQ-DEMO-0004` approve as admin with simulated-decision label.
8. **Insights + Reports (45 s)** — Daily summary with reasons; export filtered CSV.
9. **Audit + Access (30 s)** — Verify chain; switch to auditor to show read-only.

---

## 11. Simulated vs production

| Capability | Prototype | Production requirement |
|---|---|---|
| Authentication | Demo user picker | Institutional SSO / government identity provider, MFA, server sessions |
| Authorisation | Client-side guards + command checks | Server-side policy enforcement on every API call |
| Persistence | localStorage + IndexedDB | Relational database with backups, point-in-time recovery |
| Documents | Browser IndexedDB, SHA-256 reference | Encrypted object storage, malware scanning, retention policy |
| Bank confirmation | Officer records method + evidence | Authorised bank interface or approved confirmation process |
| OCR | Manual "values as read" entry | Approved OCR service behind the same port |
| Notifications | In-app, generated on load/interval | Server scheduler + authorised email/SMS gateways |
| Audit | Client hash chain | Server-side append-only/WORM store, restricted access, integrity protection |
| Hosting | Local dev server | Government-approved cloud, TLS, WAF, rate limiting, monitoring |
| Compliance | Not reviewed | Security audit, data protection review, AICTE process sign-off |

---

## 12. Assumptions and open questions
- **A-1** The administrator acts as competent authority in the prototype; production may need a separate approver role.
- **A-2** Instrument categories and required documents are configurable placeholders, not actual AICTE rules.
- **A-3** One institution can hold many FDRs; one FDR belongs to exactly one institution.
- **Q-1** Does AICTE require a lien-marking confirmation document? (Add as a configurable required document if yes.)
- **Q-2** What are the actual escalation hierarchies and timelines?
- **Q-3** Are partial releases possible? (Prototype assumes whole-instrument release.)

## 13. Glossary
**FDR** — Fixed Deposit Receipt. **Security deposit** — amount held as assurance under applicable norms. **Predecessor/successor** — the old and new instruments in a renewal/replacement chain. **Finding** — output of a rule check; a prompt for human review, not a conclusion. **Competent authority** — the role empowered to approve or reject requests.
