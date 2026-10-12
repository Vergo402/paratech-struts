// Tap-target evidence for prompt-audit decision 6 (mobile-ux 44px vs 56px rule).
// Drives the REAL sign-up flow against the local Firebase emulators (:5200 / dev:emu),
// then annotates every interactive control on four screens with its measured height.
// Run: node capture.mjs   (emulators + `npm run dev:emu` must already be up)
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE ?? 'http://localhost:5200';
const OUT = dirname(fileURLToPath(import.meta.url));
const CSV = '/Users/alex/Developer/paratech-struts/fieldshore/.claude/skills/shared/millbrook-inventory.csv';
mkdirSync(OUT, { recursive: true });

// Throwaway emulator-only test account (never printed, never leaves localhost).
const stamp = Date.now().toString(36);
const EMAIL = `tapaudit-${stamp}@example.test`;
const PASSWORD = `Tt-${stamp}-${Math.random().toString(36).slice(2, 10)}`;

const log = [];
const step = async (name, fn) => {
  try { await fn(); log.push(`OK   ${name}`); return true; }
  catch (e) { log.push(`SKIP ${name} — ${String(e.message).split('\n')[0].slice(0, 140)}`); return false; }
};

// Draw a box + height label on every visible interactive control; return counts.
const annotate = (page) => page.evaluate(() => {
  document.querySelectorAll('.tap-audit-overlay').forEach((n) => n.remove());
  const sel = 'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=radio], [role=tab], [role=option], [role=switch], [role=slider], [role=menuitem], label.fs-import-change';
  const vw = window.innerWidth, vh = window.innerHeight;
  const seen = new Set();
  const counts = { lt44: 0, b44: 0, ge56: 0, rows: [] };
  for (const el of document.querySelectorAll(sel)) {
    // file inputs are hidden behind their label; measure the label instead
    if (el.tagName === 'INPUT' && el.type === 'file') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`;
    if (seen.has(key)) continue; seen.add(key);
    const h = Math.round(r.height);
    const cls = h < 44 ? 'lt44' : h < 56 ? 'b44' : 'ge56';
    counts[cls]++;
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    counts.rows.push({ h, w: Math.round(r.width), name, cls });
    const color = cls === 'lt44' ? '#e5484d' : cls === 'b44' ? '#f5a524' : '#30a46c';
    const box = document.createElement('div');
    box.className = 'tap-audit-overlay';
    box.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border:2px solid ${color};box-sizing:border-box;pointer-events:none;z-index:2147483646;border-radius:4px;`;
    const tag = document.createElement('div');
    tag.className = 'tap-audit-overlay';
    tag.textContent = `${h}`;
    tag.style.cssText = `position:fixed;left:${Math.max(0, r.right - 30)}px;top:${Math.max(0, r.top - 1)}px;min-width:28px;height:16px;line-height:16px;text-align:center;font:700 11px/16px -apple-system,Helvetica,Arial,sans-serif;color:#fff;background:${color};border-radius:3px;pointer-events:none;z-index:2147483647;`;
    document.body.append(box, tag);
  }
  return counts;
});

const shots = [];
const capture = async (page, id, title, route) => {
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) { const s = page.getByRole('button', { name: /^Skip$/ }); if (!(await s.count())) break; await s.first().click().catch(() => {}); await page.waitForTimeout(400); }
  const counts = await annotate(page);
  const file = `${id}.png`;
  await page.screenshot({ path: `${OUT}/${file}` });
  await page.evaluate(() => document.querySelectorAll('.tap-audit-overlay').forEach((n) => n.remove()));
  shots.push({ id, title, route, file, counts });
  log.push(`SHOT ${id}: <44=${counts.lt44} 44–55=${counts.b44} ≥56=${counts.ge56}`);
};

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(10000);

await step('auth: open', async () => {
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
});
await step('auth: create account', async () => {
  const seg = page.getByText('Create Account', { exact: true }).first();
  await seg.click();
  await page.locator('input[autocomplete=name]').first().fill('Tap Audit');
  await page.locator('input[autocomplete=email]').first().fill(EMAIL);
  await page.locator('input[type=password]').first().fill(PASSWORD);
  await page.getByRole('button', { name: /^Create Account$/ }).click();
  await page.waitForTimeout(2500);
});
await step('dept: create', async () => {
  if (!page.url().includes('/create-department')) {
    await page.goto(`${BASE}/create-department`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
  }
  await page.getByPlaceholder('Hamden Fire Rescue').fill('Tap Audit FD');
  await page.getByRole('button', { name: /^Create department$/ }).click();
  await page.waitForTimeout(2500);
  // success panel → primary "done" button if present
  const done = page.locator('button.fs-btn--primary, button[data-variant=primary]').last();
  if (await done.count()) await done.click().catch(() => {});
  await page.waitForTimeout(1200);
});

const dismissTour = async () => {
  for (let i = 0; i < 4; i++) {
    const skip = page.getByRole('button', { name: /^Skip$/ });
    if (!(await skip.count())) break;
    await skip.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
};
await step('dismiss first-run tour', dismissTour);

await step('settings index', async () => {
  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await capture(page, '1-settings', 'Settings (back-office list)', '/settings');
});
await step('settings administration (checklist editor)', async () => {
  await page.goto(`${BASE}/settings/administration`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await capture(page, '2-settings-administration', 'Settings › Administration (checklist editor — the 44px rows)', '/settings/administration');
});
await step('inventory import flow', async () => {
  await page.goto(`${BASE}/settings/data`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.getByText('Import inventory', { exact: true }).first().click();
  await page.waitForTimeout(800);
  const file = page.locator('[role=dialog] input[type=file]').first();
  await file.setInputFiles(CSV);
  await page.waitForTimeout(1500);
  await capture(page, '3-inventory-import', 'Inventory › Import flow (back-office — the 44px "Change file")', '/settings/data → Import inventory');
  await page.keyboard.press('Escape').catch(() => {});
});
await step('operations board', async () => {
  await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const start = page.getByRole('button', { name: 'Start Operation' }).first();
  if (await start.count()) {
    await start.click();
    await page.getByPlaceholder('e.g. Cascade Building Fire').fill('Tap Audit Collapse');
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
    await page.waitForTimeout(800);
  }
  await capture(page, '4-operations', 'Operations board (fireground — 56px floor)', '/operations');
});

await browser.close();
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ shots, log }, null, 2));
console.log(log.join('\n'));
