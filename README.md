# AICTE SecureFDR

**Intelligent Security Deposit & Fixed Deposit Receipt Management System** — *Every Deposit. Verified. Tracked. Accountable.*

Smart India Hackathon · Problem Statement 26265 · Software. A fully interactive **frontend prototype with a simulated backend**. All data is fictional **demonstration data**; nothing connects to a bank, moves money, or represents AICTE. Not affiliated with or endorsed by AICTE or any bank.

Live demo: deployed to GitHub Pages by `.github/workflows/deploy.yml` (see *Deployment*).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint, incl. layer-boundary rules |
| `npm test` | Vitest — 144 tests (domain, data, commands, UI) |
| `npm run build` / `npm run preview` | Production build / serve it on :4173 |
| `npm run test:e2e` | Browser acceptance run T01–T12 against the preview server (uses Playwright) |

Runs fully offline after install; no API keys, no network calls at runtime.

## Demo users (fictional)

| User | Role | Scope |
|---|---|---|
| Ananya Rao | AICTE Administrator | All institutions; assigns, decides (competent authority in the prototype), configures |
| Vikram Nair | Verification Officer | Reads all; acts on assigned cases (larger queue) |
| Farah Siddiqui | Verification Officer | Second officer |
| Rahul Menon | Institution Representative | `INST-0003` only |
| Priya Iyer | Read-only Auditor | All records, read-only, exports |

Switch users at any time from the profile menu; data is kept. See `DEMO_SCRIPT.md` for the 7-minute judge walkthrough and the scenario catalogue S-01…S-13.

## Architecture

Read `prd.md` (what/why), `architecture.md` (structure), `agent.md` (build rules), `DECISIONS.md` (deviations).

```
src/
  lib/        dates (Asia/Kolkata), money (paise, ₹ Indian grouping), csv, hash, file signatures
  domain/     PURE: types, zod schemas, deriveStatus, permissions (matrix + can), state machines,
              rules R-01…R-12, insights I-01…I-08, selectors
  data/       store, localStorage/IndexedDB adapters, migrations, persistence, seed catalogue
  services/   command dispatcher + handlers (single write path), audit hash chain,
              notifications + escalation, seed replay, reports, integration ports + mock adapters
  components/ui   accessible UI kit
  features/*  one folder per module (auth, dashboard, institutions, registry, submission,
              verification, maturity, requests, notifications, insights, reports, audit, users, settings)
  app/        router, providers, shell, guards
```

- **Single write path:** every mutation is a command → authorise → validate → version check → transition → apply → audit → derive notifications → persist (rolled back on storage failure).
- **Derive, don't store:** display status, flags, KPIs, findings and insights are computed from facts.
- **Defence in depth:** the same `can()` drives navigation, buttons and the dispatcher; denied attempts are audited.
- **Provenance:** submitted values, values as read from documents, officer-verified values and officer conclusions are kept separate.

## What is simulated

| Capability | Prototype | Production requirement |
|---|---|---|
| Authentication | Demo user picker | Institutional SSO / government IdP, MFA, server sessions |
| Authorisation | Client-side guards + command checks | Server-side policy enforcement on every API call |
| Persistence | localStorage + IndexedDB | Relational database with backups, PITR |
| Documents | Browser IndexedDB, SHA-256 reference | Encrypted object storage, malware scanning, retention |
| Bank confirmation | Officer records method + evidence | Authorised bank interface or approved process |
| OCR | Manual “values as read” entry | Approved OCR service behind the same port |
| Notifications | In-app, generated on load / every 5 min | Server scheduler + authorised email/SMS gateways |
| Audit | Client hash chain (integrity check demonstration) | Server-side append-only/WORM store |
| Hosting | Static build (GitHub Pages) | Government-approved cloud, TLS, WAF, monitoring |

## Production roadmap

Replace the browser persistence in `services/runtime.ts` with an HTTP data gateway that posts commands to a server that reuses `src/domain` unchanged (NestJS/Spring Boot + PostgreSQL + object storage + append-only audit store), add institutional SSO, server-side scheduler and authorised integrations behind the existing ports.

## Known limitations

- Uploaded files live only in the browser that uploaded them (IndexedDB); seeded documents are generated placeholders marked “Sample placeholder”.
- The audit chain is client-side and can be rebuilt by anyone with device access.
- Rule thresholds, categories and checklists are configurable placeholders, not AICTE rules.
- Release approvals are simulated administrative decisions only.

## Deployment

Pushing to `main` or a `claude/**` branch runs `.github/workflows/deploy.yml`: typecheck, lint, tests, build, then deploy `dist/` to GitHub Pages. If the first run fails at *Configure Pages*, enable Pages once in **Settings → Pages → Build and deployment → Source: GitHub Actions** and re-run the workflow. The `github-pages` environment may also need the branch allowed under **Settings → Environments → github-pages → Deployment branches**.
