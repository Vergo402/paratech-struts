/**
 * Phase H slice — #247 verification screenshot capture.
 *
 * Replays the six verification states against a running production preview
 * (`npm run build && npm run preview -- --port 5198`) and saves the PNGs in
 * `docs/v4-design/13-slice/screenshots/`. The authoritative interactive drive
 * is recorded in `_PHASE-H-SLICE-VERIFICATION.md`; this script is the camera,
 * re-runnable any time the slice changes.
 *
 * Run from the repo root:
 *   npm i --no-save playwright-core   # once; package.json stays untouched
 *   node docs/v4-design/13-slice/capture-screenshots.mjs
 *
 * Uses the locally cached ms-playwright Chromium (no download). WIPES the
 * preview's IndexedDB so the seed re-runs — never point it at real data.
 */
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.PREVIEW_URL ?? 'http://localhost:5198';
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'screenshots');
mkdirSync(OUT, { recursive: true });

// Newest cached Chromium, e.g. ~/Library/Caches/ms-playwright/chromium-1217
const cacheDir = join(homedir(), 'Library/Caches/ms-playwright');
const rev = readdirSync(cacheDir).filter((d) => /^chromium-\d+$/.test(d)).sort().at(-1);
const exe = join(cacheDir, rev, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });

let n = 0;
const shot = async (name) => {
  await page.waitForTimeout(350); // let Radix enter animations settle
  n += 1;
  await page.screenshot({ path: join(OUT, `${String(n).padStart(2, '0')}-${name}.png`) });
  console.log(`  ${String(n).padStart(2, '0')}-${name}.png`);
};
const dialog = () => page.locator('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
const waitDialogGone = () => page.waitForSelector('[role="dialog"], [role="alertdialog"]', { state: 'detached' });

/** Set the measurement steppers inside the open Add/Edit modal. */
const setMeasure = async (feet, inches) => {
  for (let i = 0; i < feet; i++) await dialog().getByRole('button', { name: 'Up one foot' }).click();
  for (let i = 0; i < inches; i++) await dialog().getByRole('button', { name: 'Up one inch' }).click();
};
const addShorePoint = async ({ feet, inches, qty }) => {
  await page.getByRole('button', { name: '+ Add Shore Point' }).click();
  await dialog().waitFor();
  if (qty) await dialog().getByLabel('Quantity').fill(String(qty));
  await setMeasure(feet, inches);
  await dialog().getByRole('button', { name: 'Add Shore Point', exact: true }).click();
  await waitDialogGone();
};
const assignOn = async (cardText) => {
  const card = page.locator('.fs-lane.is-pending .fs-card', { hasText: cardText }).first();
  await card.getByRole('button', { name: 'Assign Equipment', exact: true }).click();
  await dialog().waitFor();
};
const deployFromSheet = async (model) => {
  await dialog().getByRole('button', { name: new RegExp(`^Deploy ${model}`) }).first().click();
  await waitDialogGone();
};

// ── Fresh seed ────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/operations`);
await page.evaluate(async () => {
  localStorage.clear();
  await new Promise((res) => { const r = indexedDB.deleteDatabase('fieldshore'); r.onsuccess = r.onblocked = res; });
});
await page.reload();
await page.getByText('No active operation').waitFor();
await shot('fresh-empty-state');

// ── State 1 — happy path ─────────────────────────────────────────────────────
await page.getByRole('button', { name: 'Start Operation' }).click();
await dialog().waitFor();
await dialog().getByLabel('Operation name').fill('Maple St Collapse');
await dialog().getByLabel('Location / address').fill('12 Maple St');
await shot('start-operation-modal');
await dialog().getByRole('button', { name: 'Start Operation' }).click();
await waitDialogGone();

await addShorePoint({ feet: 2, inches: 6 }); // 30″
await shot('board-pending-30');

await assignOn('30″');
await shot('assign-sheet-recommendations');
await deployFromSheet('LS 203');
await page.locator('.fs-lane.is-process .fs-card').first().waitFor();
await shot('in-process-deployed');

await page.getByRole('button', { name: 'Advance to Strut Set' }).click();
await page.locator('.fs-lane.is-strutset .fs-card').first().waitFor();
await shot('strut-set');

// ── State 2 — grouped T-Shore ×3 + group gate ────────────────────────────────
await addShorePoint({ feet: 2, inches: 6, qty: 3 });
await page.locator('.fs-lane.is-pending .fs-card', { hasText: '1 / 3' }).waitFor();
await shot('group-three-pending');

await assignOn('1 / 3');
await deployFromSheet('LS 203');
await page.locator('.fs-lane.is-process .fs-card', { hasText: '1 / 3' }).waitFor();
await page.locator('.fs-lane.is-process .fs-card', { hasText: 'Waiting on group' }).scrollIntoViewIfNeeded();
await shot('group-gate-waiting');

// ── State 3 — step-back un-deploy (inventory-consequential modal) ────────────
await page.locator('.fs-lane.is-process .fs-card', { hasText: '1 / 3' })
  .getByRole('button', { name: 'Step back to Pending' }).click();
await dialog().waitFor();
await shot('stepback-confirm-modal');
await dialog().getByRole('button', { name: 'Return & Step Back' }).click();
await waitDialogGone();

// ── State 5a — unrated warning gate (while LS 1016 stock exists) ─────────────
await addShorePoint({ feet: 16, inches: 8 }); // 200″
await assignOn('200″');
await page.locator('.fs-rec.is-gated').first().scrollIntoViewIfNeeded();
await shot('unrated-gate-locked');
await dialog().locator('[role="checkbox"], input[type="checkbox"]').first().click();
await shot('unrated-gate-acknowledged');
await page.keyboard.press('Escape');
await waitDialogGone();

// ── State 4 — empty states: no-match (16″) + no-inventory (190″ ×3) ──────────
await addShorePoint({ feet: 1, inches: 4 }); // 16″ → no-match
for (let i = 0; i < 2; i++) {
  await addShorePoint({ feet: 15, inches: 10 }); // 190″
  await assignOn('190″');
  await deployFromSheet('LS 1016');
}
await addShorePoint({ feet: 15, inches: 10 }); // third 190″ → no stock left
await page.locator('.fs-lane.is-pending .fs-card', { hasText: 'Waiting for inventory' }).first().waitFor();
await page.locator('.fs-lane.is-pending').scrollIntoViewIfNeeded();
await shot('pending-reasons-board');

await assignOn('16″');
await shot('empty-state-no-match');
await page.keyboard.press('Escape');
await waitDialogGone();

await assignOn('190″');
await shot('empty-state-no-inventory');
await page.keyboard.press('Escape');
await waitDialogGone();

// ── State 5b — over-capacity #40 card, engine-driven in the gallery ──────────
await page.goto(`${BASE}/gallery`);
const overCap = page.locator('.fs-rec.is-gated', { hasText: 'exceeds' }).first();
await overCap.scrollIntoViewIfNeeded();
await shot('gallery-over-capacity');

await browser.close();
console.log(`\nDone — ${n} screenshots in ${OUT}`);
