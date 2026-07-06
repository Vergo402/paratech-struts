// After-shots for #432 (Stage 2a Operations elevation) — seeds a guest+admin
// session on the dev server, builds a 3-Post op via the real UI, and captures
// the board + Cutting Station into the audit folder. Mouse pointer → the
// slides render as tap-once buttons (ADR-034), so the flow is clickable.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/v4-visual-elevation-2026-07/after';

const seedSession = async (page) => {
  await page.evaluate(async () => {
    const value = JSON.stringify({ identity: { kind: 'guest' }, departmentId: null, departmentName: null, role: 'admin', inviteCode: null });
    const seed = (dbName) => new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('meta', 'readwrite');
          tx.objectStore('meta').put({ key: 'fieldshore_session', value });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); resolve(); };
        } catch { db.close(); resolve(); }
      };
      req.onerror = () => resolve();
    });
    await seed('fieldshore-dept-guest');
    await seed('fieldshore-global');
    localStorage.setItem('fieldshore_theme', 'dark');
  });
};

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await seedSession(page);
  await page.reload({ waitUntil: 'networkidle' });

  // Start the operation
  await page.goto(`${BASE}/operations`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start Operation' }).first().click();
  await page.getByPlaceholder('e.g. Cascade Building Fire').fill('Maple St collapse');
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
  await page.waitForTimeout(400);

  // Add a 3-Post shore point, 4' 6" opening, saved pending
  await page.getByRole('button', { name: '+ Add Shore Point' }).click();
  await page.locator('[role="dialog"] input[aria-label="Feet"]').fill('4');
  await page.locator('[role="dialog"] input[aria-label="Inches"]').fill('6');
  await page.locator('[role="dialog"] .fs-segment', { hasText: '3-Post' }).click();
  await page.getByRole('button', { name: 'Save as Pending' }).click();
  await page.waitForTimeout(400);

  // Deploy every post (the front pending card cycles), then advance the group
  for (let i = 0; i < 3; i++) {
    const assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first();
    if (!(await assign.count())) break;
    await assign.click();
    await page.waitForTimeout(300);
    await page.locator('[role="dialog"] button', { hasText: 'Deploy LS 304' }).first().click();
    await page.waitForTimeout(400);
  }

  // Board after-shot (assigned/mixed state)
  await page.screenshot({ path: `${OUT}/phone-operations.png` });

  // Advance: Strut Set → Cutting (group-wide taps, mouse mode)
  await page.getByRole('button', { name: /set Strut Set/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /send to Cutting Station/i }).first().click();
  await page.waitForTimeout(300);

  // Cutting Station after-shot
  await page.locator('.fs-segment', { hasText: 'Cutting' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/phone-cutting-station.png` });

  // Desktop board
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/desk-operations.png` });

  await browser.close();
  console.log('after-shots written');
};

run().catch((e) => { console.error(e.message); process.exit(1); });
