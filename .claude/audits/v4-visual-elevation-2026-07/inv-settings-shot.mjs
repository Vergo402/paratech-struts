// After-shots for Inventory (#431) + Settings — seeds the guest+admin session
// (brings the sample apparatus/inventory) and captures both phone screens in
// their FINAL Stage-3 state (Inventory 'deployed' is now neutral, not gold).
// PW_PATH / BASE overridable via env.
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

  await page.goto(`${BASE}/inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/phone-inventory.png` });

  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/phone-settings.png` });

  await browser.close();
  console.log('inventory + settings after-shots written');
};

run().catch((e) => { console.error(e.message); process.exit(1); });
