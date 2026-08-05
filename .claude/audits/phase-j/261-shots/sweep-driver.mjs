// Coverage sweep — every surface no #261 review pass visited. Seeded member+dept
// context for dept screens; fresh context for the signed-out auth flows. Captures
// a screenshot + console errors per surface.
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/261-shots';
const DEPT_ID = 'sim-sweep';
const ACCT = 'sim-acct-sweep';

const results = [];
const step = async (name, fn) => {
  try { const extra = await fn(); results.push(`OK   ${name}${extra ? ` — ${extra}` : ''}`); }
  catch (e) { results.push(`SKIP ${name} — ${e.message.split('\n')[0].slice(0, 130)}`); }
};

const seed = async (page) => {
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
    await put('firebaseLocalStorageDb', 'firebaseLocalStorage', { fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`, value: { uid: ACCT, email: 's@x.com', emailVerified: true, isAnonymous: false, displayName: 'Sweep Chief', providerData: [], stsTokenManager: { refreshToken: 'r', accessToken: jwt, expirationTime: Date.now() + 31536000000 }, createdAt: '1', lastLoginAt: '1', apiKey, appName: '[DEFAULT]' } });
    await put('fieldshore-global', 'meta', { key: 'fieldshore_session', value: JSON.stringify({ identity: { kind: 'member', accountId: ACCT, displayName: 'Sweep Chief' }, departmentId: DEPT_ID, departmentName: 'Sweep FD', role: 'admin', inviteCode: 'SW' }) });
    await put('fieldshore-global', 'meta', { key: 'fieldshore_dept_memberships', value: JSON.stringify({ [ACCT]: { id: DEPT_ID, name: 'Sweep FD', role: 'admin', inviteCode: 'SW' } }) });
    localStorage.setItem('fieldshore_theme', 'dark');
  }, { DEPT_ID, ACCT });
};

const seedInv = async (page) => {
  await page.evaluate(async ({ DEPT_ID }) => {
    const rows = [
      { id: 'i1', apparatus: 'Rescue 2', apparatusId: 'app-r2', type: 'strut', model: 'LS 304', system: 'LongShore', quantity: 4, available: 4 },
      { id: 'i2', apparatus: 'Rescue 2', apparatusId: 'app-r2', type: 'plate', plateId: 'rigid6', quantity: 8, available: 8 },
    ];
    const roster = [{ id: 'app-r2', name: 'Rescue 2', type: 'Rescue' }];
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(`fieldshore-dept-${DEPT_ID}`);
      req.onsuccess = () => { const db = req.result; try { const tx = db.transaction(['inventory', 'meta'], 'readwrite'); const inv = tx.objectStore('inventory'); rows.forEach((r) => inv.put(r)); tx.objectStore('meta').put({ key: 'fieldshore_apparatus_roster', value: JSON.stringify(roster) }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(new Error('tx')); }; } catch (e) { db.close(); reject(e); } };
      req.onerror = () => reject(new Error('no bucket'));
    });
  }, { DEPT_ID });
};

const consoleErrs = [];
const attachConsole = (page, tag) => {
  page.on('console', (m) => { if (m.type() === 'error' && !/websocket|WebSocket|net::ERR|Failed to load resource/.test(m.text())) consoleErrs.push(`[${tag}] ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => consoleErrs.push(`[${tag}] PAGEERROR ${String(e).slice(0, 160)}`));
};

const run = async () => {
  const browser = await chromium.launch();

  // ── Seeded member context ──
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  attachConsole(page, 'member');
  page.setDefaultTimeout(8000);
  await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await seed(page);
  await page.goto(`${BASE}/inventory`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await seedInv(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  await step('inventory screen', async () => {
    await page.screenshot({ path: `${OUT}/sweep-inventory.png` });
    return (await page.locator('text=LS 304').count()) ? 'rows render' : 'NO ROWS';
  });

  await step('inventory export tap', async () => {
    const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    await page.getByRole('button', { name: /Export/i }).first().click();
    const d = await dl;
    return d ? `download: ${d.suggestedFilename()}` : 'no download event';
  });

  await step('quickfind calc', async () => {
    await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.locator('input[aria-label="Feet"]').first().fill('4');
    await page.locator('input[aria-label="Inches"]').first().fill('6');
    const find = page.getByRole('button', { name: /Find Struts|Search|Find/i }).first();
    if (await find.count()) await find.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/sweep-quickfind.png` });
    return 'captured';
  });

  const settingsPages = ['', 'appearance', 'department', 'administration', 'data', 'account', 'about'];
  for (const sp of settingsPages) {
    await step(`settings/${sp || 'index'}`, async () => {
      await page.goto(`${BASE}/settings${sp ? '/' + sp : ''}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/sweep-settings-${sp || 'index'}.png` });
      const empty = await page.locator('main').innerText();
      return empty.trim().length < 40 ? `NEAR-EMPTY: ${JSON.stringify(empty.slice(0, 40))}` : `renders (${empty.trim().length} chars)`;
    });
  }

  await step('audit log', async () => {
    await page.goto(`${BASE}/settings/administration`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /Audit Log/i }).first().click().catch(async () => {
      await page.getByRole('link', { name: /Audit Log/i }).first().click();
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/sweep-auditlog.png` });
    return 'captured';
  });

  await step('user manager', async () => {
    await page.goto(`${BASE}/settings/administration`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /User Manager|Users/i }).first().click().catch(async () => {
      await page.getByRole('link', { name: /User Manager|Users/i }).first().click();
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/sweep-usermanager.png` });
    return 'captured';
  });

  await step('feedback sheet', async () => {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: /Feedback/i }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/sweep-feedback.png` });
    await page.keyboard.press('Escape');
    return 'captured';
  });

  await step('help page', async () => {
    await page.goto(`${BASE}/help`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/sweep-help.png` });
    return 'captured';
  });

  await ctx.close();

  // ── Fresh signed-out context: auth flows render ──
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx2.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
  const p2 = await ctx2.newPage();
  attachConsole(p2, 'guest');
  p2.setDefaultTimeout(8000);
  for (const r of ['auth', 'join-department', 'create-department']) {
    await step(`signed-out /${r}`, async () => {
      await p2.goto(`${BASE}/${r}`, { waitUntil: 'domcontentloaded' });
      await p2.waitForTimeout(900);
      await p2.screenshot({ path: `${OUT}/sweep-${r}.png` });
      const txt = await p2.locator('main').innerText().catch(() => '');
      return txt.trim().length < 40 ? `NEAR-EMPTY` : `renders (${txt.trim().length} chars)`;
    });
  }
  await ctx2.close();

  await browser.close();
  console.log(results.join('\n'));
  console.log('--- console errors (filtered) ---');
  console.log(consoleErrs.length ? consoleErrs.join('\n') : 'none');
};

run().catch((e) => { console.error(e.message); process.exit(1); });
