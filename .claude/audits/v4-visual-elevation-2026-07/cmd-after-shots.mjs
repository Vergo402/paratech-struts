// After-shots for #434 (Stage 2c Command elevation) — seeds a guest+admin session
// on the dev server, builds the Maple St scene via the real UI (3-Post to Cutting,
// Engine 1 on Shoring Group, a 4th point assigned to it, one HIGH hazard), and
// captures the Command surfaces into the audit folder. Playwright resolves from the
// npx cache (not a repo dep): override with PW_PATH if the cache moves.
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);

const BASE = process.env.BASE ?? 'http://localhost:5199';
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

  // ── Operations scene: op + 3-Post group advanced to Cutting ──
  await page.goto(`${BASE}/operations`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start Operation' }).first().click();
  await page.getByPlaceholder('e.g. Cascade Building Fire').fill('Maple St collapse');
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
  await page.waitForTimeout(400);

  await page.getByRole('button', { name: '+ Add Shore Point' }).click();
  await page.locator('[role="dialog"] input[aria-label="Feet"]').fill('4');
  await page.locator('[role="dialog"] input[aria-label="Inches"]').fill('6');
  await page.locator('[role="dialog"] .fs-segment', { hasText: '3-Post' }).click();
  await page.getByRole('button', { name: 'Save as Pending' }).click();
  await page.waitForTimeout(400);

  for (let i = 0; i < 3; i++) {
    const assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first();
    if (!(await assign.count())) break;
    await assign.click();
    await page.waitForTimeout(300);
    await page.locator('[role="dialog"] button', { hasText: 'Deploy LS 304' }).first().click();
    await page.waitForTimeout(400);
  }
  await page.getByRole('button', { name: /set Strut Set/i }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /send to Cutting Station/i }).first().click();
  await page.waitForTimeout(400);

  // ── Assign Engine 1 to Shoring Group (phone org sheet → node panel → assign) ──
  await page.goto(`${BASE}/command`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Org Chart/ }).click();
  await page.waitForTimeout(400);
  await page.locator('.fs-org-node', { hasText: 'Shoring Group Supervisor' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Change or add apparatus' }).click();
  await page.waitForTimeout(300);
  await page.locator('.fs-assign-row', { hasText: 'Engine 1' }).click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); // node panel
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape'); // org sheet
  await page.waitForTimeout(300);

  // ── 4th shore point assigned to Engine 1 ──
  await page.goto(`${BASE}/operations`, { waitUntil: 'networkidle' });
  // Phone add affordance = the FAB (Stage 2a); fall back to the header button.
  const fab = page.locator('.fs-ops-fab');
  if (await fab.count()) await fab.click();
  else await page.getByRole('button', { name: /\+ (Add )?Shore Point/ }).first().click();
  await page.locator('[role="dialog"] input[aria-label="Feet"]').fill('5');
  await page.locator('[role="dialog"] button', { hasText: '— None —' }).click();
  await page.waitForTimeout(300);
  // The unit option lives in the stacked picker sheet (role varies) — match loosely.
  await page
    .locator('[role="dialog"]')
    .last()
    .locator('button, [role="option"], [role="radio"]')
    .filter({ hasText: 'Engine 1' })
    .first()
    .click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Save as Pending' }).click();
  await page.waitForTimeout(400);

  // ── One HIGH hazard via the phone hazard sheet ──
  await page.goto(`${BASE}/command`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Hazards/ }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Add Hazard' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('[role="dialog"]').getByLabel('Location').fill('Div 1 — north wall');
  await page.locator('[role="dialog"] [role="radio"]', { hasText: 'High' }).click();
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Add Hazard' }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); // hazard sheet
  await page.waitForTimeout(300);

  // ── Phone shots ──
  await page.goto(`${BASE}/command`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/phone-command.png` });
  await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/phone-command-2.png` });
  await page.getByRole('button', { name: /Org Chart/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/phone-command-org.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // ── Desktop shots ──
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/desk-command.png` });
  await page.locator('.fs-segment', { hasText: 'Hazard Log' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/desk-command-hazards.png` });
  await page.locator('.fs-segment', { hasText: 'Org Chart' }).click();
  await page.waitForTimeout(300);
  await page.locator('.fs-org-node', { hasText: 'Shoring Group Supervisor' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/desk-command-node.png` });

  await browser.close();
  console.log('cmd after-shots written');
};

run().catch((e) => { console.error(e.message); process.exit(1); });
