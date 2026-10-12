// Live import smoke for the sim inventory fixtures: for each CSV, create a fresh
// emulator account + department, run the 4-step Import flow end to end, and record
// "N rows imported" plus the per-rig scope tabs the Inventory screen shows.
// Run: node import-smoke.mjs <csv> [<csv> ...]   (emulators + `npm run dev:emu` must be up)
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE ?? 'http://localhost:5200';
const OUT = dirname(fileURLToPath(import.meta.url));
const csvs = process.argv.slice(2);
if (!csvs.length) { console.error('usage: node import-smoke.mjs <csv>...'); process.exit(2); }

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const results = [];

for (const rel of csvs) {
  const csv = resolve(rel);
  const id = basename(csv, '.csv');
  const expectedRows = readFileSync(csv, 'utf8').trim().split('\n').length - 1;
  const expectedRigs = new Set(readFileSync(csv, 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')[1]).filter(Boolean));
  const r = { csv: rel, expectedRows, expectedRigs: expectedRigs.size, imported: null, skipped: null, rigTabs: [], steps: [], error: null };
  const stamp = Date.now().toString(36);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const dismissTour = async () => { for (let i = 0; i < 4; i++) { const s = page.getByRole('button', { name: /^Skip$/ }); if (!(await s.count())) break; await s.first().click().catch(() => {}); await page.waitForTimeout(300); } };
  try {
    await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1000);
    await page.getByText('Create Account', { exact: true }).first().click();
    await page.locator('input[autocomplete=name]').first().fill(`Smoke ${id}`);
    await page.locator('input[autocomplete=email]').first().fill(`smoke-${id}-${stamp}@example.test`);
    await page.locator('input[type=password]').first().fill(`Sm-${stamp}-${Math.random().toString(36).slice(2, 10)}`);
    await page.getByRole('button', { name: /^Create Account$/ }).click(); await page.waitForTimeout(2000);
    if (!page.url().includes('/create-department')) await page.goto(`${BASE}/create-department`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Hamden Fire Rescue').fill(`Smoke ${id}`);
    await page.getByRole('button', { name: /^Create department$/ }).click(); await page.waitForTimeout(2000);
    const done = page.locator('button.fs-btn--primary, button[data-variant=primary]').last(); if (await done.count()) await done.click().catch(() => {});
    await page.waitForTimeout(800); await dismissTour();
    r.steps.push('account+department ok');

    await page.goto(`${BASE}/settings/data`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200); await dismissTour();
    await page.getByText('Import inventory', { exact: true }).first().click(); await page.waitForTimeout(600);
    await page.locator('[role=dialog] input[type=file]').first().setInputFiles(csv); await page.waitForTimeout(1200);
    r.steps.push('step1 file picked');
    // Steps 1→2→3: Continue; step 4: "Import N rows"
    for (let i = 0; i < 3; i++) {
      const cont = page.locator('[role=dialog]').getByRole('button', { name: /^Continue$/ });
      if (!(await cont.count())) break;
      await cont.first().click(); await page.waitForTimeout(900);
      r.steps.push(`continue ${i + 1}`);
    }
    const importBtn = page.locator('[role=dialog]').getByRole('button', { name: /^Import \d+ rows?$/ });
    if (!(await importBtn.count())) {
      const txt = (await page.locator('[role=dialog]').innerText()).replace(/\s+/g, ' ').slice(0, 600);
      throw new Error(`no Import button at step 4 — dialog reads: ${txt}`);
    }
    r.steps.push((await importBtn.first().innerText()).trim());
    await importBtn.first().click();
    await page.locator('[role=dialog]').getByText('Import complete').waitFor({ timeout: 30000 });
    const summary = (await page.locator('[role=dialog]').innerText()).replace(/\s+/g, ' ');
    const m = summary.match(/(\d+) rows? imported/); r.imported = m ? Number(m[1]) : null;
    const sk = summary.match(/(\d+) (?:rows? )?skipped/); r.skipped = sk ? Number(sk[1]) : 0;
    await page.screenshot({ path: `${OUT}/${id}-import-complete.png` });
    await page.locator('[role=dialog]').getByRole('button', { name: /^Done$/ }).first().click().catch(() => {});
    await page.goto(`${BASE}/inventory`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500); await dismissTour();
    r.rigTabs = await page.locator('[role=tab]').allInnerTexts().then((t) => t.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean));
    await page.screenshot({ path: `${OUT}/${id}-inventory.png` });
  } catch (e) {
    r.error = String(e.message).split('\n')[0].slice(0, 300);
    await page.screenshot({ path: `${OUT}/${id}-FAILED.png` }).catch(() => {});
  }
  await context.close();
  results.push(r);
  console.log(`${id}: imported=${r.imported} skipped=${r.skipped} expectedRows=${expectedRows} rigs=${r.rigTabs.length}/${expectedRigs.size} ${r.error ? 'ERROR ' + r.error : 'OK'}`);
}
await browser.close();
writeFileSync(`${OUT}/import-smoke-results.json`, JSON.stringify(results, null, 2));
