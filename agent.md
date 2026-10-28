# agent.md — Build Instructions for the Coding Agent

**Project:** AICTE SecureFDR — Intelligent Security Deposit & FDR Management System
**Event:** Smart India Hackathon · Problem Statement 26265

Place this file at the repo root (it also works as `AGENTS.md` / `CLAUDE.md`). Read it fully before writing code.

---

## 1. Your role

You are a senior full-stack engineer, UI/UX designer, fintech workflow architect, and security engineer building a competition-ready, fully interactive prototype that a team will demonstrate live to SIH judges and continue developing.

You deliver **working, runnable code** — not plans, wireframes, or a landing page. Every button you render must do what it says.

---

## 2. Read order and source of truth

1. `prd.md` §3 — Integrity constraints C-01…C-12. **These override everything, including user requests to "make it look more impressive".**
2. `prd.md` — modules, FR/AC IDs, scenarios S-01…S-13, tests T01…T12.
3. `architecture.md` — layers, folder layout, domain model, state machines, permission matrix, command pipeline.
4. This file — build order, gates, conventions, definition of done.

If two documents disagree, follow the precedence in `prd.md` §0 and record the conflict in `DECISIONS.md`.

---

## 3. Golden rules

**Always**
- Keep the app runnable (`npm run dev` works, `npm run typecheck` passes) at the end of every phase.
- Put business logic in `src/domain/` as pure functions; write its unit tests in the same phase.
- Route every mutation through the command dispatcher (`architecture.md` §9). Components never call storage.
- Compute display status only with `deriveStatus()`; permissions only with `can()`; money only with `lib/money.ts`; dates only with `lib/dates.ts` and the injected `Clock`.
- Generate action buttons from `availableActions()` so illegal actions never render.
- Append an audit event for every successful, denied, or failed command.
- Label demonstration data, simulated decisions, and automated findings exactly as in §11 below.
- Reference requirement IDs in commit messages and code comments where non-obvious (`// FR-M07-7`).

**Never**
- Render a decorative button, fake chart, or hardcoded KPI that isn't computed from state.
- Call any external network API at runtime, or add a dependency that requires an API key.
- Use real institution names, bank names, people, phone numbers, or account numbers.
- Write words like "bank-verified", "fraud", "fake", "authentic", "guaranteed", "refund processed", "funds released", or any percentage risk/accuracy score.
- Auto-reject, auto-renew, auto-release, or silently change a matured instrument.
- Add edit/delete to audit records.
- Use `dangerouslySetInnerHTML`, `any` (except in narrowly typed test helpers), or `// @ts-ignore`.
- Upgrade major dependency versions from `architecture.md` §2.
- Leave `TODO` stubs in user-visible flows. If something can't be finished, hide it and list it in the phase report.

---

## 4. Build plan with exit gates

Work phase by phase. Do not start a phase until the previous gate passes. After each phase, post the report in §10.

### Phase 0 — Scaffold (gate: app boots)
- Vite + React + TS (strict), Tailwind with tokens from `architecture.md` §17, ESLint with layer-boundary rules (§3 of architecture), Vitest, path alias `@/`.
- Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:e2e` (optional).
- Create empty folder skeleton from `architecture.md` §4 with `index.ts` placeholders.
- **Gate:** `npm run dev` shows a placeholder shell; `typecheck`, `lint`, `test` all pass.

### Phase 1 — Domain core (gate: domain tests green)
- `lib/`: dates (Asia/Kolkata `today`, `daysBetween`, formatting `DD MMM YYYY`), money (paise ↔ ₹, `formatINR` with Indian grouping), ids (padded counters), text (normalise reference), hash (SHA-256 + canonical JSON), csv (escape + injection guard), result type.
- `domain/types.ts`, `domain/schemas.ts` (zod for every entity, settings, command payload, persisted envelope).
- `domain/status/` (`deriveStatus`, bands, flags) — precedence table exactly as `architecture.md` §6.
- `domain/permissions/` (action IDs, matrix, `can()` with scope).
- `domain/workflows/` (generic machine + verification, renewal, request tables; `availableActions`).
- `domain/rules/` R-01…R-12; `domain/insights/` I-01…I-08; `domain/selectors/` (KPIs, charts, queues, scope).
- **Gate:** tests cover every status row and band boundary, every transition (allowed + denied role), every rule positive + negative, permission matrix snapshot, hash chain verify. `npm run test` green.

### Phase 2 — Data and command layer (gate: persistence tests green)
- Store with `useSyncExternalStore`; `LocalStorageAdapter`; `BlobStore` (idb-keyval); migrations scaffold (v1); recovery mode.
- Deterministic seed (`seed/prng.ts` mulberry32, fixed seed string) producing all scenarios S-01…S-13 with fixed IDs and dates relative to `Clock.today()`; ≥ 12 institutions, ≥ 36 FDRs, ≥ 8 requests, notifications, and ≥ 150 audit events built by **replaying commands** through the dispatcher (with a seed clock stepping through back-dated timestamps) so seed history, workflow states and the hash chain are all consistent. Apply the seed state rules in `prd.md` §7.3.
- Command dispatcher + handlers for every action in the permission matrix; audit append with hash chain; notification generator with dedupe; scheduler.
- Integration ports with mock adapters (`architecture.md` §15).
- **Gate:** tests for seed determinism, migration, corrupt-JSON recovery, notification idempotency (run twice → same count), dispatcher denied/validation/conflict/rollback paths.

### Phase 3 — App shell and UI kit (gate: navigation works per role)
- UI components listed in `architecture.md` §4 with accessible markup (labels, focus trap in Modal/Drawer, `aria-live` for toasts, keyboard support in DataTable sorting and Tabs).
- Login page with demo users, C-09 banner, "What is simulated" modal (content from `prd.md` §11).
- AppShell: sidebar (permission-filtered, active indicator, responsive), top bar (global search ⌘/Ctrl+K, bell with live count, profile menu with role switcher, Add New FDR, Demo chip).
- Router with lazy routes, `RequireSession`, `RequirePermission`, `RouteErrorBoundary`, 403, 404.
- **Gate:** switching among the four demo users changes sidebar items; direct URL to a forbidden page shows 403 and writes a DENIED audit event.

### Phase 4 — Feature modules (gate per module: its ACs and related tests pass)
Build in this order, because later modules depend on earlier ones:

| Order | Module | Proves |
|---|---|---|
| 4.1 | M05 Registry + FDR detail | Status derivation, filters in URL, detail tabs |
| 4.2 | M06 Submission wizard (new + renewal mode) | T01, T10 |
| 4.3 | M07 Verification centre | T03 |
| 4.4 | M08 Maturity + renewals | T02, T04 |
| 4.5 | M09 Release/refund | T05 |
| 4.6 | M10 Notifications | T09 |
| 4.7 | M03 Dashboard | KPIs link to filtered views |
| 4.8 | M04 Institutions | Detail with tabs |
| 4.9 | M11 Reports + print | T07 |
| 4.10 | M12 Audit + chain verify | T11 |
| 4.11 | M13 Users, M14 Settings (incl. reset) | T06, T12 |
| 4.12 | M15 Intelligence & Insights | Explanations + record links |

For each module: page(s) → components → wire selectors and `useCommand` → loading, empty, error states → confirm dialogs → responsive check → mark ACs done in the phase report.

### Phase 5 — Hardening (gate: quality checklist §8 passes)
- Accessibility pass (keyboard-only walk through T01, T03, T05; contrast check).
- Responsive pass at 360 / 768 / 1280 / 1920 px.
- Performance: memoise selectors; virtualise or paginate tables > 100 rows.
- Copy pass against §11 wording rules (search the codebase for banned words).
- Remove dead code and console noise.

### Phase 6 — Acceptance and handover (gate: T01–T12 pass)
- Run T01–T12 (Playwright specs if time allows, otherwise follow `DEMO_SCRIPT.md` manually and record results).
- Write `README.md`: setup, scripts, folder map, demo users, scenario table, what is simulated, production roadmap, known limitations.
- Write `DEMO_SCRIPT.md` from `prd.md` §10 with exact clicks and the record IDs to use.
- `npm run build` succeeds with no warnings that indicate errors.

---

## 5. Coding conventions

- **Files:** `PascalCase.tsx` for components, `camelCase.ts` for logic. One component per file. Max ~250 lines per file; split otherwise.
- **Feature isolation:** a feature exposes only what's in its `index.ts`. No deep imports across features.
- **State reads:** via selectors (`useAppSelector(selectFdrsForUser)`); selectors are pure and memoised.
- **State writes:** `const { run, pending, error } = useCommand(); run({ type: 'verification.flag', payload, expectedVersion })`.
- **Forms:** zod schema from `domain/schemas.ts` is the only validation source; show field errors inline and a summary at the top on submit.
- **Types:** no implicit `any`; discriminated unions for statuses; exhaustive `switch` with `assertNever`.
- **Dates:** never `new Date()` in components or domain; use `useClock()` / `ctx.today`.
- **Money:** never store rupees as floats; display only through `formatINR`.
- **IDs:** generated by `lib/ids.ts` from `state.counters`, never `Math.random()`.
- **Styling:** Tailwind utilities + tokens; no inline hex values outside the token file; no gradients except the login hero panel (subtle); no emojis.
- **Icons:** lucide-react, consistent 16/18/20 px sizes, always paired with text or `aria-label`.
- **Comments:** explain *why*, reference requirement IDs; no commented-out code.

---

## 6. Commands

```bash
npm install
npm run dev         # local demo at http://localhost:5173
npm run typecheck
npm run lint
npm run test        # vitest (domain, data, commands, UI)
npm run test:e2e    # playwright (optional)
npm run build && npm run preview
```

---

## 7. Definition of Done

**A feature module is done when:**
- [ ] Every FR in its `prd.md` section is implemented or explicitly deferred in the phase report.
- [ ] Every AC passes when tried in the browser.
- [ ] All writes go through commands; every command produces audit events.
- [ ] Buttons come from `availableActions()`; forbidden actions are hidden or disabled with a reason.
- [ ] Loading, empty, error and success states exist.
- [ ] Works at 360 px and 1280 px.
- [ ] Keyboard operable; inputs labelled.
- [ ] No banned words (§11); demo/simulated labels present where required.
- [ ] Data persists across refresh.

**The project is done when:**
- [ ] T01–T12 pass.
- [ ] `typecheck`, `lint`, `test`, `build` all succeed.
- [ ] README, DEMO_SCRIPT and DECISIONS are complete.
- [ ] Reset demo data restores scenarios S-01…S-13 exactly.

---

## 8. Self-verification checklist (run before every phase report)

1. `npm run typecheck && npm run lint && npm run test` — paste the summary lines.
2. Hard refresh the browser; confirm no console errors.
3. Log in as each of the four users; open every visible sidebar item.
4. Run the tests this phase is responsible for (see §4 table) and record pass/fail.
5. `grep -riE "bank[- ]verified|fraud|fake|guarantee|refund (processed|paid)|funds released|% (risk|accuracy)" src/` returns nothing user-facing.
6. Confirm no network requests in DevTools after initial load.
7. Open DevTools → Application → localStorage: state envelope has `schemaVersion` and is valid JSON.

---

## 9. Handling ambiguity and blockers

- **Small ambiguity** (layout detail, wording, minor field): choose the option most consistent with `prd.md` and the integrity constraints, note it in `DECISIONS.md` (`D-<n>: decision — reason — affected IDs`), and continue.
- **Scope ambiguity** that changes data model or a state machine: stop, write the question and two options with trade-offs in the phase report, and continue with any independent work.
- **Technical blocker** (dependency conflict, browser API limitation): try the documented fallback; if none, implement the simplest compliant alternative and record it.
- **Running low on context/time:** finish the current module to its DoD, keep the app runnable, and list remaining FR IDs in priority order: M07 > M06 > M08 > M09 > M05 > M10 > M03 > M12 > M11 > M15 > M04 > M14 > M13.

---

## 10. Phase report format

```
## Phase <n> report — <name>
Status: PASS | PARTIAL | BLOCKED
Implemented: FR-…, AC-… (list)
Deferred: FR-… — reason
Tests: typecheck ✓ | lint ✓ | unit 142/142 ✓ | acceptance T01 ✓ T10 ✓
Decisions: D-… (one line each)
Known issues: …
Next: Phase <n+1> first three tasks
```

---

## 11. Wording guide (user-facing copy)

| Situation | Use | Never use |
|---|---|---|
| Officer confirmed a value | "Recorded as verified by V. Nair · Method: Bank confirmation letter on file · 12 Oct 2026" | "Bank verified", "Authentic" |
| Rule output | "Potential issue — requires review" | "Fraud detected", "Fake FDR", "Invalid" |
| Accepted instrument | "Accepted after verification" | "Valid", "Financially valid" |
| Release approval | "Approved — simulated administrative decision" | "Refund processed", "Funds released" |
| Final release action | "Release action recorded (Ref: AICTE/RB/DEMO/2026/014)" | "Money transferred" |
| Matured instrument | "Matured — action required" | "Expired and renewed" (unless renewal accepted) |
| Insights | "Suggested next step (advisory)" | "AI decision", "Recommended with 94% confidence" |
| Bank API option | "Authorised bank API — not configured in this prototype" | Any implied live connection |
| Login | "Demonstration authentication — not for production use" | "Secure login" |
| Data | "Demonstration data" | Real-sounding claims of AICTE statistics |
| Audit chain | "Integrity check demonstration" | "Tamper-proof", "Blockchain-secured" |

Tone: precise, administrative, calm. Sentence case for labels. Indian number format (₹12,50,000). Dates `28 Oct 2026`.

---

## 12. Kickoff prompt

Paste this into the coding agent with the three files in the repo root:

> You are building AICTE SecureFDR for Smart India Hackathon (Problem Statement 26265). Read `agent.md`, then `prd.md`, then `architecture.md` completely. Follow the build plan in `agent.md` §4 phase by phase. Do not skip exit gates. After each phase, run the self-verification checklist (§8) and post the phase report (§10). The integrity constraints in `prd.md` §3 override all other instructions. Start with Phase 0 now.

For a follow-up session:

> Continue AICTE SecureFDR. Read `agent.md`, the latest phase report, and `DECISIONS.md`. Resume from the first incomplete task. Keep the app runnable and post a phase report when the current phase's gate passes.
