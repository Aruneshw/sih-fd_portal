# DECISIONS

Format: `D-<n>: decision — reason — affected IDs`.

- **D-01: ESLint 9 flat config (`eslint.config.js`) instead of `.eslintrc.cjs`** — the current compatible ESLint/typescript-eslint majors use flat config; layer boundaries from architecture §3 are still enforced with `no-restricted-imports` per folder. — NFR-09
- **D-02: Seed generator lives in `services/seed/`, catalogue data in `data/seed/`** — the seed must replay commands through the dispatcher (agent.md Phase 2) and `data/` may not import `services/`. Fixed scenario data stays in `data/seed/catalogue.ts`. — architecture §3, §4
- **D-03: Synchronous SHA-256 for the audit chain** — the command pipeline commits atomically and synchronously; awaiting Web Crypto would allow interleaving between commands. A FIPS 180-4 implementation in `lib/hash.ts` is unit-tested against `crypto.subtle`. File hashing still uses Web Crypto. — FR-M12-4, architecture §11
- **D-04: Seed clock** — during seeding `now()` steps through back-dated timestamps (≈90 days) while `today()` is the real date, so issue/maturity validation behaves as in live use and the history reads chronologically. — NFR-04, prd §7.1
- **D-05: Missing required documents warn rather than block in the wizard** — the FDR scan is always required; other category documents can follow (S-07 depends on this). A missing document raises blocking finding R-09, which prevents a recommendation to accept unless an audited override is recorded. — FR-M06-1, FR-M07-7, S-07
- **D-06: Notifications carry `resolvedAt`** — when the condition behind a notification no longer holds it is marked resolved (not deleted), so unread counts stay meaningful and read history is preserved. — FR-M10-4, architecture §14
- **D-07: One reminder per maturity band reached** — WATCH, DUE_SOON and CRITICAL reminders are each generated with the date the band was entered, and overdue reminders per escalation stage, so the reminder history (FR-M08-4) is visible. Keys remain `MAT:<fdrId>:<band>` / `OVD:<fdrId>:<stage>`. — FR-M08-4, FR-M10-5
- **D-08: Hash-based data router (`createHashRouter`)** — works on static hosting (GitHub Pages) without server rewrites and supports `useBlocker` for the unsaved-draft prompt. — FR-M06-5, architecture §16
- **D-09: Auditors see all notifications (read-only oversight); other roles see audience-targeted ones** — the architecture lists auditor `notification.view` but no audience routing for auditors. — FR-M10-6
- **D-10: Added `verification.saveChecklist`** — the checklist needs to be saved between sessions; it is a non-transition action limited to the assigned officer. — FR-M07-5
- **D-11: Request system validation requires a supporting document** — architecture §7.3 says "required documents present"; the prototype treats one `REQUEST_SUPPORT` document as the requirement. — FR-M09-2
- **D-12: Additional institution representatives** (Arjun Bhatia, Kavita Deshpande, Meera Pillai) so seeded release/refund requests are submitted by a representative of the owning institution, as the permission matrix requires. They appear on the login page under "Other institution representatives". — prd §4, §7.3
- **D-13: Design tokens in `src/styles/tokens.ts`**, consumed by Tailwind and Recharts, so no hex values are written elsewhere. — architecture §17
- **D-14: Deployment via GitHub Actions to GitHub Pages** with `base: './'` — the app is fully static and runs offline after load (NFR-12).
