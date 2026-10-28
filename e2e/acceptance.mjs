// Browser acceptance run for prd.md §9 (T01–T12). Usage: npm run build && npx vite preview --port 4173 & npm run test:e2e
import { readFileSync } from 'node:fs';
import { launch, loginAs, go, check, BASE } from './lib.mjs';

const results = [];
const { browser, page, errors } = await launch();
const pdf = (name, size = 2048) => ({ name, mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(size, 32)]) });
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const shift = (d, n) => { const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const kpi = async (label) => Number((await page.locator('a', { hasText: label }).first().locator('div.text-2xl').innerText()).replace(/[^\d]/g, ''));
const unread = async () => Number((await page.getByRole('link', { name: /Notifications, \d+ unread/ }).getAttribute('aria-label')).match(/(\d+)/)[1]);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('securefdr:v1:state')).data);
const dialog = () => page.getByRole('dialog');
/** Wait up to 5 s for a locator to become visible (isVisible() alone does not wait). */
const seen = async (loc) => { try { await loc.first().waitFor({ state: 'visible', timeout: 5000 }); return true; } catch { return false; } };

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.reload();

async function fillInstrument(ref, { issue = shift(today, -2), maturity = shift(today, 365), bank = 'Northern Trust Bank of India (Demo)' } = {}) {
  await page.getByLabel('FDR reference number').fill(ref);
  await page.getByLabel('Issuing bank').selectOption({ label: bank });
  await page.getByLabel('Branch').fill('Mall Road');
  await page.getByLabel('Amount (₹)').fill('1000000');
  await page.getByLabel('Issue date').fill(issue);
  await page.getByLabel('Maturity date').fill(maturity);
  await page.getByLabel('Instrument category').selectOption('CONTINUATION');
}

// ---------- T10 data integrity (run first so the new FDR from T01 doesn't interfere) ----------
await loginAs(page, 'Rahul Menon');
const seededCreates = (await state()).audit.filter((e) => e.action === 'fdr.create' && e.outcome === 'SUCCESS').length;
await go(page, '/fdrs/new');
await fillInstrument('NTB/FD/555001', { maturity: shift(today, -10) });
await page.getByRole('button', { name: 'Next' }).click();
check(await seen(page.getByText('Maturity date must be after the issue date.').first()), 'T10 maturity before issue is blocked with a message', results);
await page.getByLabel('Branch').fill('');
await page.getByLabel('Maturity date').fill(shift(today, 365));
await page.getByRole('button', { name: 'Next' }).click();
check(await seen(page.getByText('Enter the branch.').first()), 'T10 missing required field is blocked', results);
await page.getByLabel('Branch').fill('Mall Road');
await page.getByLabel('FDR reference number').fill('KCB/FD/778812');
await page.getByLabel('Issuing bank').selectOption({ label: 'Kaveri Co-operative Bank (Demo)' });
check(await seen(page.getByText('Exact duplicate — submission blocked.')), 'T10 exact duplicate reference (S-05) is blocked', results);
check(await page.getByRole('button', { name: 'Next' }).isDisabled(), 'T10 Next is disabled on exact duplicate', results);
await page.getByLabel('FDR reference number').fill('NTB/FD/555001');
await page.getByLabel('Issuing bank').selectOption({ label: 'Northern Trust Bank of India (Demo)' });
await page.getByRole('button', { name: 'Next' }).click();
await page.locator('input[type=file]').setInputFiles({ name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.concat([Buffer.from('%PDF'), Buffer.alloc(6 * 1024 * 1024)]) });
check(await seen(page.getByText(/larger than the 5 MB limit/).first()), 'T10 oversized file is rejected', results);
await page.locator('input[type=file]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
check(await seen(page.getByText(/not an allowed file type/).first()), 'T10 wrong file type is rejected', results);
await page.locator('input[type=file]').setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not really a pdf') });
check(await seen(page.getByText(/does not match a PDF file signature/).first()), 'T10 bad file signature is rejected', results);
let s = await state();
check(!Object.values(s.fdrs).some((f) => f.referenceNo === 'NTB/FD/555001') && s.audit.filter((e) => e.action === 'fdr.create' && e.outcome === 'SUCCESS').length === seededCreates, 'T10 nothing saved and no success audit event', results);
await page.getByRole('button', { name: 'Cancel and discard draft' }).click();

// ---------- T01 create FDR ----------
await go(page, '/');
const pendingBefore = await kpi('Pending verifications');
await go(page, '/fdrs/new');
await fillInstrument('NTB/FD/900100');
await page.getByRole('button', { name: 'Next' }).click();
await page.locator('input[type=file]').setInputFiles(pdf('fdr-scan.pdf'));
await page.getByText('fdr-scan.pdf').waitFor();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Submit for verification' }).click();
await page.getByText('Submitted for verification').waitFor();
const newId = (await page.locator('a', { hasText: /^FDR-\d{4}-\d{5}$/ }).first().innerText()).trim();
const appRef = await page.getByText(/APP-\d{4}-\d{6}/).first().innerText();
check(/APP-\d{4}-\d{6}/.test(appRef), `T01 application reference generated (${newId})`, results);
await go(page, `/fdrs?q=${newId}`);
check(await seen(page.getByRole('row', { name: new RegExp(newId) }).getByText('Verification Pending')), 'T01 record appears in registry as Verification Pending', results);
await go(page, '/');
check((await kpi('Pending verifications')) === pendingBefore + 1, `T01 Pending verifications KPI ${pendingBefore} → ${pendingBefore + 1}`, results);

// ---------- T02 approaching maturity ----------
await loginAs(page, 'Ananya Rao');
await go(page, '/maturity?band=CRITICAL');
const row5 = page.getByRole('row', { name: /FDR-DEMO-0005/ });
check(await seen(row5) && await seen(row5.getByText('Critical').first()), 'T02 FDR-DEMO-0005 in 0–7 band with Critical priority', results);
await go(page, '/notifications?category=UPCOMING_MATURITY&size=50');
check(await seen(page.getByText(/FDR-DEMO-0005 matures within 0 to 7 days/).first()), 'T02 reminder present in notifications', results);

// ---------- T03 verify an instrument ----------
await loginAs(page, 'Vikram Nair');
await go(page, '/verification/FDR-DEMO-0014');
check(await seen(page.getByText(/\(₹5,00,000\) differs from the submitted amount \(₹50,00,000\)/)), 'T03 amount-mismatch finding shown', results);
await page.getByRole('button', { name: 'Flag discrepancy' }).click();
await dialog().getByLabel(/Observation/).fill('The amount on the uploaded FDR scan does not match the submitted amount.');
await dialog().getByRole('button', { name: 'Flag discrepancy' }).click();
await page.getByText('Discrepancy Flagged').first().waitFor();
check(await seen(page.getByText('Discrepancy Flagged').first()), 'T03 status → Discrepancy Flagged', results);
await go(page, '/audit?q=verification.flag');
const flagRow = page.getByRole('row', { name: /FDR-DEMO-0014/ }).first();
check(await seen(flagRow.getByText(/UNDER_REVIEW/)) && await seen(flagRow.getByText(/DISCREPANCY_FLAGGED/)) && await seen(flagRow.getByText(/does not match/)), 'T03 audit shows before/after and comment', results);

// ---------- T04 renewal ----------
await loginAs(page, 'Rahul Menon');
await go(page, '/fdrs/FDR-DEMO-0005/renew');
await page.getByLabel('FDR reference number').fill('NTB/FD/900005');
await page.getByRole('button', { name: 'Next' }).click();
await page.locator('input[type=file]').setInputFiles(pdf('renewal-scan.pdf'));
await page.getByText('renewal-scan.pdf').waitFor();
await page.getByRole('button', { name: 'Next' }).click();
await page.getByRole('button', { name: 'Submit for verification' }).click();
await page.getByText('Submitted for verification').waitFor();
const succId = (await page.locator('a', { hasText: /^FDR-\d{4}-\d{5}$/ }).first().innerText()).trim();
s = await state();
check(s.fdrs[succId]?.predecessorId === 'FDR-DEMO-0005', `T04 successor ${succId} links to FDR-DEMO-0005`, results);
await loginAs(page, 'Ananya Rao');
await go(page, `/verification/${succId}`);
await page.getByRole('button', { name: 'Assign officer' }).click();
await dialog().getByLabel('Verification officer').selectOption('USR-OFF-02');
await dialog().getByRole('button', { name: 'Assign' }).click();
await loginAs(page, 'Farah Siddiqui');
await go(page, `/verification/${succId}`);
await page.getByRole('button', { name: 'Mark as reviewed' }).click();
await dialog().getByRole('button', { name: 'Mark as reviewed' }).click();
await page.getByRole('button', { name: 'Recommend acceptance' }).click();
for (const cb of await dialog().getByRole('checkbox').all()) await cb.check();
await dialog().getByLabel(/Recommendation note/).fill('Renewal consistent with predecessor.');
await dialog().getByRole('button', { name: 'Recommend acceptance' }).click();
await page.getByText('Recommended: accept').first().waitFor();
await loginAs(page, 'Ananya Rao');
await go(page, `/verification/${succId}`);
await page.getByRole('button', { name: 'Accept', exact: true }).click();
await dialog().getByRole('button', { name: 'Accept', exact: true }).click();
await page.getByText('Accepted after verification').first().waitFor();
await go(page, '/fdrs/FDR-DEMO-0005?tab=renewal');
check(await seen(page.locator('h1').getByText('Superseded')), 'T04 predecessor shows Superseded', results);
check(await seen(page.getByRole('link', { name: succId })), 'T04 renewal chain lists successor; history retained', results);

// ---------- T05 release request ----------
await loginAs(page, 'Rahul Menon');
await go(page, '/requests/new?fdr=FDR-DEMO-0003');
await page.getByLabel('Reason').fill('Programme approval conditions fulfilled; requesting release of the deposit.');
await page.locator('input[type=file]').setInputFiles(pdf('approval-letter.pdf'));
await page.getByText('approval-letter.pdf').waitFor();
await page.getByRole('button', { name: 'Submit request' }).click();
await page.waitForURL(/#\/requests\/REQ-/);
const reqId = page.url().split('/').pop();
check(await seen(page.locator('h1').getByText('Validated — awaiting assignment')), `T05 ${reqId} submitted and validated`, results);
await loginAs(page, 'Ananya Rao');
await go(page, `/requests/${reqId}`);
await page.getByRole('button', { name: 'Assign officer' }).click();
await dialog().getByLabel('Verification officer').selectOption('USR-OFF-01');
await dialog().getByRole('button', { name: 'Assign officer' }).click();
await loginAs(page, 'Vikram Nair');
await go(page, `/requests/${reqId}`);
await page.getByRole('button', { name: 'Record recommendation' }).click();
await dialog().getByLabel('Review notes').fill('Supporting documents consistent with the record.');
await dialog().getByRole('button', { name: 'Record recommendation' }).click();
await loginAs(page, 'Ananya Rao');
await go(page, `/requests/${reqId}`);
await page.getByRole('button', { name: 'Approve (simulated)' }).click();
check(await seen(dialog().getByText(/^Simulated administrative decision\. This records/)), 'T05 approval shows simulated-decision label', results);
await dialog().getByLabel('Decision reference').fill('AICTE/RB/DEMO/2026/099');
await dialog().getByLabel('Decision note').fill('Approved on recommendation.');
await dialog().getByRole('button', { name: 'Approve (simulated)' }).click();
await page.getByRole('button', { name: 'Record final action' }).click();
await dialog().getByLabel('Final action reference').fill('AICTE/RB/DEMO/2026/099-FA');
await dialog().getByRole('button', { name: 'Record final action' }).click();
await page.getByRole('button', { name: 'Close request' }).click();
await dialog().getByRole('button', { name: 'Close request' }).click();
await page.locator('h1').getByText('Closed').waitFor();
s = await state();
const acts = s.audit.filter((e) => e.entityId === reqId).map((e) => e.action);
check(s.requests[reqId].stage === 'CLOSED' && s.fdrs['FDR-DEMO-0003'].adminStatus === 'RELEASED', 'T05 request closed and FDR administrative status Released', results);
check(['request.submit', 'request.validate', 'request.assign', 'request.recommend', 'request.approve', 'request.recordAction', 'request.close'].every((a) => acts.includes(a)), 'T05 audit shows every stage', results);

// ---------- T06 access control ----------
await loginAs(page, 'Priya Iyer');
const auditorNav = await page.locator('nav[aria-label="Main navigation"] a').allInnerTexts();
await go(page, '/fdrs/new');
check(await seen(page.getByText('403 — Access not permitted')), 'T06 auditor direct URL → 403', results);
await go(page, '/fdrs/FDR-DEMO-0015');
check(!(await page.getByRole('button', { name: 'Edit' }).count()) && !(await page.getByRole('button', { name: /Submit renewal/ }).count()), 'T06 auditor sees no action buttons', results);
s = await state();
check(s.audit.some((e) => e.outcome === 'DENIED' && e.userId === 'USR-AUD-01' && e.entityId === '/fdrs/new'), 'T06 denied audit event written', results);
await loginAs(page, 'Rahul Menon');
const repNav = await page.locator('nav[aria-label="Main navigation"] a').allInnerTexts();
check(auditorNav.join() !== repNav.join(), 'T06 roles see different sidebar items', results);

// ---------- T07 report export ----------
await loginAs(page, 'Ananya Rao');
await go(page, `/reports?report=RPT-03&status=ACTIVE&from=${today}&to=${shift(today, 400)}`);
const info = await page.getByText(/rows? · \d+ columns will be exported/).innerText();
const [nRows, nCols] = info.match(/\d+/g).map(Number);
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export CSV' }).click()]);
const csv = readFileSync(await dl.path(), 'utf8');
const lines = csv.replace(/^﻿/, '').split('\r\n');
check(csv.startsWith('﻿') && lines.length - 1 === nRows && lines[0].split('","').length === nCols, `T07 CSV has exactly the previewed ${nRows} rows × ${nCols} columns (${dl.suggestedFilename()})`, results);

// ---------- T08 persistence ----------
await page.reload();
await go(page, `/fdrs/${newId}`);
s = await state();
check(await seen(page.locator('h1').getByText(newId)) && s.fdrs['FDR-DEMO-0005'].adminStatus === 'SUPERSEDED' && s.requests[reqId].stage === 'CLOSED' && s.fdrs['FDR-DEMO-0014'].verificationStatus === 'DISCREPANCY_FLAGGED', 'T08 changes from T01–T05 survive refresh', results);

// ---------- T09 notifications ----------
await go(page, '/notifications?read=unread');
const before = await unread();
const first = page.locator('li', { has: page.getByRole('button', { name: 'Open' }) }).first();
const title = await first.locator('span.text-sm').first().innerText();
await first.getByRole('button', { name: 'Open' }).click();
await page.waitForLoadState('networkidle');
const after = await unread();
check(after === before - 1, `T09 open notification "${title.slice(0, 40)}" follows link and unread ${before} → ${after}`, results);
await page.reload();
await page.waitForTimeout(500);
check((await unread()) === after, 'T09 read state survives refresh', results);

// ---------- T11 audit integrity ----------
await go(page, '/audit');
await page.getByRole('button', { name: 'Verify chain integrity' }).click();
check(await seen(page.getByText('Chain intact.')), 'T11 chain reports intact', results);
await page.evaluate(() => { const env = JSON.parse(localStorage.getItem('securefdr:v1:state')); env.data.audit[25].comment = 'edited in DevTools'; localStorage.setItem('securefdr:v1:state', JSON.stringify(env)); });
await page.reload();
await go(page, '/audit');
await page.getByRole('button', { name: 'Verify chain integrity' }).click();
check(await seen(page.getByText('Chain broken at event #26.')), 'T11 tampering reports the first broken event (#26)', results);

// ---------- T12 reset and recovery ----------
await go(page, '/settings');
await page.getByRole('button', { name: 'Reset demo data…' }).click();
await dialog().getByLabel(/Type "RESET"/).fill('RESET');
await dialog().getByRole('button', { name: 'Reset demo data' }).click();
await page.waitForURL(/#\/$/);
s = await state();
check(s.audit[0].action === 'demo.reset' && s.fdrs['FDR-DEMO-0005'].adminStatus === 'RECORDED' && s.fdrs['FDR-DEMO-0014'].verificationStatus === 'UNDER_REVIEW' && !s.fdrs[newId] && s.requests['REQ-DEMO-0004'].stage === 'RECOMMENDED', 'T12 reset restores the scenario catalogue; new chain starts with demo.reset', results);
await page.evaluate(() => localStorage.setItem('securefdr:v1:state', '{"schemaVersion":1,"data":{oops'));
await page.reload();
check(await seen(page.getByText('Stored data could not be loaded')) && await seen(page.getByRole('button', { name: 'Download corrupted data' })), 'T12 corrupted storage shows recovery banner, not a crash', results);
await page.getByRole('button', { name: 'Reset demo data' }).click();
await page.getByRole('heading', { name: 'Sign in as a demo user' }).or(page.getByText(/Welcome,/)).first().waitFor();

check(errors.length === 0, `No console errors during the run${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`, results);
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
