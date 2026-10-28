// Shared helpers for the browser acceptance scripts (agent.md Phase 6).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
export const { chromium } = pw;

export const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';

export async function launch() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  return { browser, context, page, errors };
}

export async function loginAs(page, name) {
  await page.goto(`${BASE}#/login`);
  await page.evaluate(() => localStorage.removeItem('securefdr:v1:session'));
  await page.reload();
  await page.getByRole('heading', { name: 'Sign in as a demo user' }).waitFor();
  await page.getByRole('button', { name: new RegExp(name) }).first().click();
  await page.waitForURL(/#\/$/);
}

export async function go(page, hash) {
  await page.goto(`${BASE}#${hash}`);
  await page.waitForLoadState('networkidle');
}

export function check(cond, label, results) {
  results.push({ ok: !!cond, label });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
}
