// Adjudication probe: computed color of the hazard chip's VALUE SPAN per theme.
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const BASE = process.env.BASE ?? 'http://localhost:3000';
const DEPT_ID = 'sim-probe';
const ACCT = 'sim-acct-probe';

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
await context.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
const page = await context.newPage();
page.setDefaultTimeout(8000);
await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
await page.evaluate(async ({ DEPT_ID, ACCT }) => {
  const put = (dbName, store, row) => new Promise((resolve) => {
    const req = indexedDB.open(dbName);
    req.onsuccess = () => { const db = req.result; try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(row); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); resolve(); }; } catch { db.close(); resolve(); } };
    req.onerror = () => resolve();
  });
  const { firebaseApp } = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/auth/firebase.ts');
  const apiKey = firebaseApp.options.apiKey;
  const b64u = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const now = Math.floor(Date.now() / 1000);
  const jwt = `${b64u({ alg: 'none' })}.${b64u({ sub: ACCT, user_id: ACCT, iat: now, exp: now + 31536000 })}.s`;
  await put('firebaseLocalStorageDb', 'firebaseLocalStorage', { fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`, value: { uid: ACCT, email: 'p@x.com', emailVerified: true, isAnonymous: false, displayName: 'Probe', providerData: [], stsTokenManager: { refreshToken: 'r', accessToken: jwt, expirationTime: Date.now() + 31536000000 }, createdAt: '1', lastLoginAt: '1', apiKey, appName: '[DEFAULT]' } });
  await put('fieldshore-global', 'meta', { key: 'fieldshore_session', value: JSON.stringify({ identity: { kind: 'member', accountId: ACCT, displayName: 'Probe' }, departmentId: DEPT_ID, departmentName: 'Probe FD', role: 'admin', inviteCode: 'P' }) });
  await put('fieldshore-global', 'meta', { key: 'fieldshore_dept_memberships', value: JSON.stringify({ [ACCT]: { id: DEPT_ID, name: 'Probe FD', role: 'admin', inviteCode: 'P' } }) });
}, { DEPT_ID, ACCT });
await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Start Operation' }).first().click();
await page.getByPlaceholder('e.g. Cascade Building Fire').fill('Probe Op');
await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
await page.waitForTimeout(400);
await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: /Hazards/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Add Hazard' }).first().click();
await page.waitForTimeout(300);
await page.locator('[role="dialog"]').getByLabel('Location').fill('probe');
await page.locator('[role="dialog"] [role="radio"]', { hasText: 'High' }).click();
await page.locator('[role="dialog"]').getByRole('button', { name: 'Add Hazard' }).click();
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const out = await page.evaluate(() => {
  const res = {};
  for (const theme of ['dark', 'light', 'sunlight', 'broadcast']) {
    document.documentElement.setAttribute('data-theme', theme);
    const v = document.querySelector('.fs-ichip--hazard .fs-ichip-v');
    const btn = document.querySelector('.fs-ichip--hazard');
    res[theme] = v && btn ? { spanColor: getComputedStyle(v).color, btnColor: getComputedStyle(btn).color, btnBg: getComputedStyle(btn).backgroundColor } : 'not mounted';
  }
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
