// Pre-TTX mini-batch verification driver (#484/#485). Seeds identity+dept the same way
// as .claude/audits/phase-j/261-shots/driver.mjs, builds the scene through the UI,
// injects the unknown plate id + the split-group status as EVENTS (the only real-world
// paths), and screenshots each surface for the main loop to inspect.
const PW = '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const BASE = 'http://localhost:5199';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/minibatch-shots';
const DEPT_ID = 'sim-meadowville';
const ACCT = 'sim-acct-bc';
const UNKNOWN_PLATE = 'future-plate-99';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const seedIdentity = async (page) => {
  await page.evaluate(async ({ DEPT_ID, ACCT }) => {
    const put = (dbName, store, row) => new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => { const db = req.result; try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(row); tx.oncomplete = () => { db.close(); resolve(true); }; tx.onerror = () => { db.close(); resolve(false); }; } catch { db.close(); resolve(false); } };
      req.onerror = () => resolve(false);
    });
    const { firebaseApp } = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/auth/firebase.ts');
    const apiKey = firebaseApp.options.apiKey;
    const b64u = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const jwt = `${b64u({ alg: 'none', typ: 'JWT' })}.${b64u({ sub: ACCT, user_id: ACCT, aud: firebaseApp.options.projectId, iss: `https://securetoken.google.com/${firebaseApp.options.projectId}`, iat: now, auth_time: now, exp: now + 31536000, firebase: { sign_in_provider: 'password' } })}.sig`;
    await put('firebaseLocalStorageDb', 'firebaseLocalStorage', { fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`, value: { uid: ACCT, email: 'bc@example.com', emailVerified: true, isAnonymous: false, displayName: 'BC McAllister', providerData: [{ providerId: 'password', uid: 'bc@example.com', displayName: 'BC McAllister', email: 'bc@example.com', phoneNumber: null, photoURL: null }], stsTokenManager: { refreshToken: 'fake-refresh', accessToken: jwt, expirationTime: Date.now() + 31536000000 }, createdAt: String(Date.now() - 86400000), lastLoginAt: String(Date.now()), apiKey, appName: '[DEFAULT]' } });
    const dept = { id: DEPT_ID, name: 'Meadowville Fire Rescue', role: 'admin', inviteCode: 'SIM123' };
    await put('fieldshore-global', 'meta', { key: 'fieldshore_session', value: JSON.stringify({ identity: { kind: 'member', accountId: ACCT, displayName: 'BC McAllister' }, departmentId: dept.id, departmentName: dept.name, role: dept.role, inviteCode: dept.inviteCode }) });
    await put('fieldshore-global', 'meta', { key: 'fieldshore_dept_memberships', value: JSON.stringify({ [ACCT]: dept }) });
    localStorage.setItem('fieldshore_theme', 'dark');
  }, { DEPT_ID, ACCT });
};

const seedDeptBucket = async (page) => {
  await page.evaluate(async ({ DEPT_ID }) => {
    const item = (id, apparatus, apparatusId, fields) => ({ id, apparatus, apparatusId, ...fields });
    const r2 = (id, f) => item(id, 'Rescue 2', 'app-rescue-2', f);
    const e1 = (id, f) => item(id, 'Engine 1', 'app-engine-1', f);
    const rows = [
      r2('inv-r2-ls203', { type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 4, available: 4 }),
      r2('inv-r2-ls304', { type: 'strut', model: 'LS 304', system: 'LongShore', quantity: 4, available: 4 }),
      r2('inv-r2-ls406', { type: 'strut', model: 'LS 406', system: 'LongShore', quantity: 2, available: 2 }),
      r2('inv-r2-at2536', { type: 'strut', model: 'AT 25-36', system: 'AcmeThread', quantity: 4, available: 4 }),
      r2('inv-r2-at3758', { type: 'strut', model: 'AT 37-58', system: 'AcmeThread', quantity: 4, available: 4 }),
      r2('inv-r2-lsext12', { type: 'extension', system: 'LongShore', length: 12, quantity: 2, available: 2 }),
      r2('inv-r2-lsext24', { type: 'extension', system: 'LongShore', length: 24, quantity: 2, available: 2 }),
      r2('inv-r2-rigid6', { type: 'plate', plateId: 'rigid6', quantity: 8, available: 8 }),
      r2('inv-r2-swivel6', { type: 'plate', plateId: 'swivel6', quantity: 4, available: 4 }),
      e1('inv-e1-at1925', { type: 'strut', model: 'AT 19-25', system: 'AcmeThread', quantity: 2, available: 2 }),
      e1('inv-e1-ls1016', { type: 'strut', model: 'LS 1016', system: 'LongShore', quantity: 2, available: 2 }),
    ];
    const roster = [{ id: 'app-rescue-2', name: 'Rescue 2', type: 'Rescue' }, { id: 'app-engine-1', name: 'Engine 1', type: 'Engine' }];
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(`fieldshore-dept-${DEPT_ID}`);
      req.onsuccess = () => { const db = req.result; try { const tx = db.transaction(['inventory', 'meta'], 'readwrite'); const inv = tx.objectStore('inventory'); rows.forEach((r) => inv.put(r)); tx.objectStore('meta').put({ key: 'fieldshore_apparatus_roster', value: JSON.stringify(roster) }); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(new Error('dept seed tx failed')); }; } catch (e) { db.close(); reject(e); } };
      req.onerror = () => reject(new Error('dept bucket missing'));
    });
  }, { DEPT_ID });
};

// Read the event log; append events. Returns {opId, by, points:[{spId, eighths, status}]}
const readLog = (page) => page.evaluate(async ({ DEPT_ID }) => new Promise((resolve, reject) => {
  const req = indexedDB.open(`fieldshore-dept-${DEPT_ID}`);
  req.onsuccess = () => {
    const db = req.result; const tx = db.transaction('events', 'readonly');
    const all = tx.objectStore('events').getAll();
    all.onsuccess = () => {
      const evs = all.result;
      const first = evs.find((e) => e.opId);
      const points = evs.filter((e) => e.type === 'ShorePointAdded').map((e) => ({ spId: e.shorePoint.id, eighths: e.shorePoint.measurementEighths, groupIndex: e.shorePoint.groupIndex }));
      const statuses = {};
      evs.filter((e) => e.type === 'ShorePointStatusChanged').forEach((e) => { statuses[e.spId] = e.to; });
      db.close(); resolve({ opId: first?.opId, by: first?.by, points, statuses, n: evs.length, types: evs.map((e) => e.type) });
    };
    all.onerror = () => { db.close(); reject(new Error('getAll failed')); };
  };
  req.onerror = () => reject(new Error('open failed'));
}), { DEPT_ID });

const appendEvents = (page, rows) => page.evaluate(async ({ DEPT_ID, rows }) => new Promise((resolve, reject) => {
  const req = indexedDB.open(`fieldshore-dept-${DEPT_ID}`);
  req.onsuccess = () => {
    const db = req.result; const tx = db.transaction('events', 'readwrite');
    rows.forEach((r) => tx.objectStore('events').add(r));
    tx.oncomplete = () => { db.close(); resolve(rows.length); };
    tx.onerror = (e) => { db.close(); reject(new Error('append failed: ' + (tx.error && tx.error.message))); };
  };
  req.onerror = () => reject(new Error('open failed'));
}), { DEPT_ID, rows });

const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`OK   ${name}`); }
  catch (e) { results.push(`SKIP ${name} — ${e.message.split('\n')[0].slice(0, 160)}`); }
};
const uuid = () => crypto.randomUUID();

const run = async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await seedIdentity(page);
  await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await seedDeptBucket(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  const addPoint = async (feet, inches, type) => {
    const fab = page.locator('.fs-ops-fab');
    if (await fab.count()) await fab.click();
    else await page.getByRole('button', { name: /\+ (Add )?Shore Point/ }).first().click();
    await page.locator('[role="dialog"] input[aria-label="Feet"]').fill(String(feet));
    await page.locator('[role="dialog"] input[aria-label="Inches"]').fill(String(inches));
    if (type) await page.locator('[role="dialog"] .fs-segment', { hasText: type }).click();
    await page.getByRole('button', { name: 'Save as Pending' }).click();
    await page.waitForTimeout(500);
  };

  await step('scene: start op', async () => {
    await page.getByRole('button', { name: 'Start Operation' }).first().click();
    await page.getByPlaceholder('e.g. Cascade Building Fire').fill('Mini-batch verification');
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
    await page.waitForTimeout(500);
  });

  // C = SP-1: 7′0″ single, gets the unknown plate while PENDING, then deployed via UI.
  await step('scene: SP-1 7′0″ pending', () => addPoint(7, 0, null));
  let log = await readLog(page);
  await step('inject: unknown plate on SP-1 (pending)', async () => {
    const sp1 = log.points.find((p) => p.eighths === 84 * 8);
    if (!sp1) throw new Error('SP-1 not found: ' + JSON.stringify(log.points));
    await appendEvents(page, [{ type: 'ShorePointEdited', id: uuid(), opId: log.opId, at: Date.now(), by: log.by, spId: sp1.spId,
      patch: { deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'swivel6', bottomPlate: UNKNOWN_PLATE } } }]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
  });
  await step('shot: pending SP-1 card + recommendation (unknown plate)', async () => {
    await page.locator('.fs-spc-head[aria-expanded]').first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/01-pending-card-expanded.png`, fullPage: true });
  });
  await step('shot: assign sheet ledger (unknown plate)', async () => {
    await page.getByRole('button', { name: 'Assign Equipment', exact: true }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/02-assign-sheet-ledger.png`, fullPage: true });
  });
  await step('scene: deploy SP-1', async () => {
    const btns = await page.getByRole('button', { name: /^Deploy/ }).all();
    results.push('DEPLOY-BUTTONS ' + JSON.stringify(await Promise.all(btns.map(async (b) => [(await b.textContent())?.slice(0, 40), await b.isDisabled()]))));
    await page.getByRole('button', { name: /^Deploy/ }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/08-after-deploy-click.png`, fullPage: true });
    const all = await page.locator('button').all();
    const texts = (await Promise.all(all.map(async (b) => (await b.isVisible()) ? (await b.textContent())?.trim().slice(0, 50) : null))).filter(Boolean);
    results.push('VISIBLE-BUTTONS ' + JSON.stringify(texts));
    const confirm = page.getByRole('button', { name: /anyway|untracked|confirm|continue|deploy as|keep going|off-book|without/i }).first();
    if (await confirm.count()) { results.push('CONFIRM ' + (await confirm.textContent())?.slice(0, 60)); await confirm.click(); await page.waitForTimeout(500); }
    const commit = page.getByRole('button', { name: /Confirm & deploy|Confirm and deploy/i }).first();
    if (await commit.count()) { await commit.click(); await page.waitForTimeout(900); results.push('COMMITTED off-book deploy'); }
    await page.screenshot({ path: `${OUT}/09-after-confirm.png`, fullPage: true });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  });

  // B = SP-2/SP-3: T-Shore 4′8″ group → deploy both → Strut Set (group) → leg 1 to cutting by EVENT.
  await step('scene: 3-Post 4′8″ group', () => addPoint(4, 8, '3-Post'));
  await step('scene: deploy group legs', async () => {
    for (let i = 0; i < 3; i++) {
      const assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first();
      if (!(await assign.count())) break;
      await assign.click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: /^Deploy/ }).first().click();
      await page.waitForTimeout(700);
      const c2 = page.getByRole('button', { name: /Confirm & deploy/i }).first();
      if (await c2.count()) { await c2.click(); await page.waitForTimeout(700); }
    }
    await page.getByRole('button', { name: /set Strut Set/i }).first().click();
    await page.waitForTimeout(400);
  });
  log = await readLog(page);
  await step('inject: leg 1 → cutting (split group)', async () => {
    const legs = log.points.filter((p) => p.eighths === 56 * 8);
    const leg1 = legs.find((p) => p.groupIndex === 1) ?? legs[0];
    if (!leg1) throw new Error('legs not found: ' + JSON.stringify(log.points));
    const leg2 = legs.find((p) => p.spId !== leg1.spId);
    const t = Date.now();
    const ev = (spId, from, to, dt) => ({ type: 'ShorePointStatusChanged', id: uuid(), opId: log.opId, at: t + dt, by: log.by, spId, from, to });
    await appendEvents(page, [
      ev(leg1.spId, 'strutset', 'cutting', 0),   // fans out: all legs → cutting
      ev(leg1.spId, 'cutting', 'runner', 10),    // individual phase: leg 1 only
      ev(leg2.spId, 'cutting', 'strutset', 20),  // fans out to legs still at cutting (2 + 3)
      ev(leg1.spId, 'runner', 'cutting', 30),    // individual: leg 1 back to cutting → straddle
    ]);
  });

  // A = SP-4: 8′0″ single, stays pending, unknown plate for the raw-opening + tell check.
  await step('scene: SP-4 8′0″ pending', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await addPoint(8, 0, null);
  });
  log = await readLog(page);
  await step('inject: unknown plate on SP-4 (pending)', async () => {
    const sp4 = log.points.find((p) => p.eighths === 96 * 8);
    if (!sp4) throw new Error('SP-4 not found');
    await appendEvents(page, [{ type: 'ShorePointEdited', id: uuid(), opId: log.opId, at: Date.now(), by: log.by, spId: sp4.spId,
      patch: { deductions: { headerWood: '4x4', footerWood: '4x4', topPlate: 'swivel6', bottomPlate: UNKNOWN_PLATE } } }]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
  });

  const setLayout = async (layout) => {
    await page.evaluate(({ opId, layout }) => {
      const key = `fs-board-prefs-${opId}`;
      let p = {}; try { p = JSON.parse(localStorage.getItem(key) || '{}'); } catch {}
      localStorage.setItem(key, JSON.stringify({ ...p, layout }));
    }, { opId: log.opId, layout });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
  };

  await step('shot: board (lanes) full', async () => {
    await setLayout('lanes');
    await page.screenshot({ path: `${OUT}/03-board-lanes.png`, fullPage: true });
  });
  await step('shot: quick view SP-1 (deployed, unknown plate)', async () => {
    await page.locator('.fs-spc-head--detail').first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/04-quickview-deployed.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
  await step('shot: list', async () => {
    await setLayout('list');
    await page.screenshot({ path: `${OUT}/05-list.png`, fullPage: true });
  });
  await step('shot: division', async () => {
    await setLayout('division');
    await page.screenshot({ path: `${OUT}/06-division.png`, fullPage: true });
  });
  await step('shot: cutting station', async () => {
    await setLayout('lanes');
    await page.getByRole('button', { name: /Cutting/ }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/07-cutting.png`, fullPage: true });
  });

  const finalLog = await readLog(page);
  results.push(`LOG ${finalLog.n} events; types: ${[...new Set(finalLog.types)].join(',')}`);
  results.push(`STATUSES ${JSON.stringify(finalLog.statuses)}`);
  await browser.close();
  console.log(results.join('\n'));
};
run().catch((e) => { console.error('FATAL', e); process.exit(1); });
