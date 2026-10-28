# Judge demo script (≈ 7 minutes)

Start from a fresh dataset: **Settings → Reset demo data… → type RESET** (as Ananya Rao), or open the site in a private window.
Automated equivalent: `npm run build && npx vite preview --port 4173` then `npm run test:e2e` (36 checks, T01–T12).

| # | Time | Who | Clicks | What to point out |
|---|---|---|---|---|
| 1 | 30 s | — | Open the site → login page | Banner "Demonstration authentication — not for production use"; "What is simulated" link. Click **Ananya Rao**. |
| 2 | 60 s | Ananya (Admin) | Dashboard → KPI **Expiring ≤ 30 days** | KPIs and charts are computed from state; the KPI opens `/fdrs?status=EXPIRING_SOON`. |
| 3 | 45 s | Ananya | Sidebar **Maturity & renewals** → tile **0–7 days** | `FDR-DEMO-0005` with Critical priority; **Reminders** link → reminder history; overdue queue on the right (`FDR-DEMO-0012`, escalated). |
| 4 | 75 s | Rahul Menon (Rep) | Profile menu → Switch to **Rahul Menon** → **Add New FDR** | Enter maturity before issue → blocked. Reference `KCB/FD/778812` + Kaveri Co-operative Bank → *Exact duplicate — submission blocked*. Fix values, upload any PDF, submit → application reference and status timeline. |
| 5 | 90 s | Vikram Nair (Officer) | Switch to **Vikram Nair** → Verification centre → `FDR-DEMO-0014` | Four panels: Submitted · Automatically detected potential issues (R-08 amount mismatch ₹5,00,000 vs ₹50,00,000) · Independently verified · Officer conclusions. **Flag discrepancy** → status *Discrepancy Flagged*. Audit trail → search `verification.flag` → before/after + comment. |
| 6 | 45 s | any | Registry → `FDR-DEMO-0031` → **Renewal chain** tab | Predecessor Superseded → successor `FDR-DEMO-0032` Active; history retained. (Live renewal: Rahul → `FDR-DEMO-0005` → **Submit renewal**.) |
| 7 | 45 s | Ananya | Release & refund → `REQ-DEMO-0004` → **Approve (simulated)** | Label "Simulated administrative decision"; decision reference required (e.g. `AICTE/RB/DEMO/2026/014`). |
| 8 | 45 s | Ananya | Intelligence & Insights; then Reports → *Maturity forecast*, Status = Active → **Export CSV** | Daily summary is templated with reasons and records; CSV matches the preview. |
| 9 | 30 s | Ananya → Priya Iyer | Audit trail → **Verify chain integrity**; switch to **Priya Iyer** and open `#/fdrs/new` | Chain intact; auditor gets 403 and a DENIED event is recorded. |

## Scenario catalogue

| ID | Scenario | Record |
|---|---|---|
| S-01 | Matures in 5 days | `FDR-DEMO-0005` (INST-0003, Accepted) |
| S-02 | Matures in 20 days | `FDR-DEMO-0020` |
| S-03 | Matured 12 days ago, no action | `FDR-DEMO-0012` |
| S-04 | Renewed: predecessor superseded | `FDR-DEMO-0031` → `FDR-DEMO-0032` |
| S-05 | Exact duplicate attempt | reference `KCB/FD/778812` (Kaveri Co-operative Bank) |
| S-06 | Possible duplicate | `FDR-DEMO-0018` vs `FDR-DEMO-0019` |
| S-07 | Missing bank confirmation | `FDR-DEMO-0007` |
| S-08 | Request awaiting information | `REQ-DEMO-0003` |
| S-09 | Request pending approval (Recommended) | `REQ-DEMO-0004` |
| S-10 | Released with decision reference | `FDR-DEMO-0027` / `REQ-DEMO-0001` |
| S-11 | Document value mismatch | `FDR-DEMO-0014` |
| S-12 | Institution with 4+ pending actions | `INST-0006` |
| S-13 | Unassigned submission | `FDR-DEMO-0035` |

## Acceptance results (latest run)

T01 ✓ · T02 ✓ · T03 ✓ · T04 ✓ · T05 ✓ · T06 ✓ · T07 ✓ · T08 ✓ · T09 ✓ · T10 ✓ · T11 ✓ · T12 ✓ — 36/36 browser checks, no console errors.
