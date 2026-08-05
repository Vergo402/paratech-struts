// #261 independent review — Track 1 stress/edge-state captures. Same auth-unlock
// recipe as driver.mjs (member+dept seed + fake persisted Firebase user + host
// block); scene is deliberately hostile: mixed-severity hazards with a long
// location, an 18-rig roster, multi-division points, no-op and post-op states,
// and a 4-theme computed-style sweep of the new chip/rollup CSS.
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/261-shots';
const DEPT_ID = 'sim-stress';
const ACCT = 'sim-acct-po';

const seedIdentity = async (page) => {
  await page.evaluate(async ({ DEPT_ID, ACCT }) => {
    const put = (dbName, store, row) => new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(store, 'readwrite');
          tx.objectStore(store).put(row);
          tx.oncomplete = () => { db.close(); resolve(true); };
          tx.onerror = () => { db.close(); resolve(false); };
        } catch { db.close(); resolve(false); }
      };
      req.onerror = () => resolve(false);
    });
    const { firebaseApp } = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/auth/firebase.ts');
    const apiKey = firebaseApp.options.apiKey;
    const b64u = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const jwt = `${b64u({ alg: 'none', typ: 'JWT' })}.${b64u({ sub: ACCT, user_id: ACCT, aud: firebaseApp.options.projectId, iss: `https://securetoken.google.com/${firebaseApp.options.projectId}`, iat: now, auth_time: now, exp: now + 31536000, firebase: { sign_in_provider: 'password' } })}.sig`;
    await put('firebaseLocalStorageDb', 'firebaseLocalStorage', {
      fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`,
      value: {
        uid: ACCT, email: 'po@example.com', emailVerified: true, isAnonymous: false,
        displayName: 'Deputy Chief Konstantinopoulos-Alvarez', providerData: [{ providerId: 'password', uid: 'po@example.com', displayName: 'Deputy Chief Konstantinopoulos-Alvarez', email: 'po@example.com', phoneNumber: null, photoURL: null }],
        stsTokenManager: { refreshToken: 'fake-refresh', accessToken: jwt, expirationTime: Date.now() + 31536000000 },
        createdAt: String(Date.now() - 86400000), lastLoginAt: String(Date.now()),
        apiKey, appName: '[DEFAULT]',
      },
    });
    const dept = { id: DEPT_ID, name: 'Metro Valley Consolidated Fire District', role: 'admin', inviteCode: 'STR123' };
    await put('fieldshore-global', 'meta', { key: 'fieldshore_session', value: JSON.stringify({ identity: { kind: 'member', accountId: ACCT, displayName: 'Deputy Chief Konstantinopoulos-Alvarez' }, departmentId: dept.id, departmentName: dept.name, role: dept.role, inviteCode: dept.inviteCode }) });
    await put('fieldshore-global', 'meta', { key: 'fieldshore_dept_memberships', value: JSON.stringify({ [ACCT]: dept }) });
    localStorage.setItem('fieldshore_theme', 'dark');
  }, { DEPT_ID, ACCT });
};

// 18 rigs; inventory only on Rescue 2 so deploys still resolve.
const seedDeptBucket = async (page) => {
  await page.evaluate(async ({ DEPT_ID }) => {
    const item = (id, apparatus, apparatusId, fields) => ({ id, apparatus, apparatusId, ...fields });
    const r2 = (id, f) => item(id, 'Rescue 2', 'app-rescue-2', f);
    const rows = [
      r2('inv-r2-ls203', { type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 8, available: 8 }),
      r2('inv-r2-ls304', { type: 'strut', model: 'LS 304', system: 'LongShore', quantity: 8, available: 8 }),
      r2('inv-r2-at2536', { type: 'strut', model: 'AT 25-36', system: 'AcmeThread', quantity: 8, available: 8 }),
      r2('inv-r2-lsext12', { type: 'extension', system: 'LongShore', length: 12, quantity: 4, available: 4 }),
      r2('inv-r2-rigid6', { type: 'plate', plateId: 'rigid6', quantity: 16, available: 16 }),
    ];
    const roster = [
      { id: 'app-rescue-2', name: 'Rescue 2', type: 'Rescue' },
      { id: 'app-battalion-1', name: 'Battalion 1', type: 'Chief' },
      { id: 'app-usar-tf1', name: 'State USAR Task Force 1 Heavy Rescue', type: 'Task Force' },
      ...Array.from({ length: 8 }, (_, i) => ({ id: `app-engine-${i + 1}`, name: `Engine ${i + 1}`, type: 'Engine' })),
      ...Array.from({ length: 4 }, (_, i) => ({ id: `app-ladder-${i + 1}`, name: `Ladder ${i + 1}`, type: 'Ladder' })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `app-squad-${i + 1}`, name: `Squad ${i + 1}`, type: 'Squad' })),
    ];
    await new Promise((resolve, reject) => {
      const req = indexedDB.open(`fieldshore-dept-${DEPT_ID}`);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(['inventory', 'meta'], 'readwrite');
          const inv = tx.objectStore('inventory');
          rows.forEach((r) => inv.put(r));
          tx.objectStore('meta').put({ key: 'fieldshore_apparatus_roster', value: JSON.stringify(roster) });
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror = () => { db.close(); reject(new Error('dept seed tx failed')); };
        } catch (e) { db.close(); reject(e); }
      };
      req.onerror = () => reject(new Error('dept bucket missing'));
    });
  }, { DEPT_ID });
};

const results = [];
const step = async (name, fn) => {
  try { const extra = await fn(); results.push(`OK   ${name}${extra ? ` — ${extra}` : ''}`); }
  catch (e) { results.push(`SKIP ${name} — ${e.message.split('\n')[0].slice(0, 140)}`); }
};

const addHazard = async (page, location, severity) => {
  await page.getByRole('button', { name: 'Add Hazard' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('[role="dialog"]').getByLabel('Location').fill(location);
  await page.locator('[role="dialog"] [role="radio"]', { hasText: severity }).click();
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Add Hazard' }).click();
  await page.waitForTimeout(400);
};

const run = async () => {
  const browser = await chromium.launch();
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

  // ── EDGE 1: Operations with NO active op — does the chip strip render? ──
  await step('shot: no-op operations', async () => {
    await page.screenshot({ path: `${OUT}/stress-no-op.png` });
    const hasStrip = await page.locator('.fs-ichip-strip').count();
    return `chip strip present: ${hasStrip > 0}`;
  });

  // ── Scene: op + points in 3 divisions ──
  await step('scene: start op', async () => {
    await page.getByRole('button', { name: 'Start Operation' }).first().click();
    await page.getByPlaceholder('e.g. Cascade Building Fire').fill('Metro Valley Parking Structure Pancake — Mutual Aid Declared');
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
    await page.waitForTimeout(400);
  });

  await step('scene: points across divisions', async () => {
    for (const div of [1, 2, 3]) {
      const fab = page.locator('.fs-ops-fab');
      if (await fab.count()) await fab.click();
      else await page.getByRole('button', { name: /\+ (Add )?Shore Point/ }).first().click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] input[aria-label="Feet"]').fill('5');
      // DivisionPicker — try to bump division; tolerate any shape.
      try {
        const divBtn = page.locator('[role="dialog"]').getByRole('button', { name: new RegExp(`Div(ision)? ${div}$`, 'i') });
        if (div > 1) {
          const picker = page.locator('[role="dialog"]').getByRole('button', { name: /Div(ision)?/i }).first();
          await picker.click({ timeout: 2000 });
          await page.waitForTimeout(200);
          await page.locator(`[role="dialog"] button, [role="option"], [role="radio"]`).filter({ hasText: new RegExp(`^Div(ision)? ${div}$`, 'i') }).first().click({ timeout: 2000 });
          await page.waitForTimeout(200);
        } else if (await divBtn.count()) { /* default is Div 1 */ }
      } catch { /* division picker shape drifted — points land in Div 1 */ }
      await page.getByRole('button', { name: 'Save as Pending' }).click();
      await page.waitForTimeout(400);
    }
    // Deploy the first pending point so statuses vary.
    const assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first();
    if (await assign.count()) {
      await assign.click();
      await page.waitForTimeout(300);
      await page.locator('[role="dialog"] button', { hasText: /Deploy LS/ }).first().click();
      await page.waitForTimeout(400);
    }
  });

  // ── EDGE 2: mixed-severity hazards — chip semantics ──
  await step('scene: 1 HIGH + 2 LOW hazards (one long location)', async () => {
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Hazards/ }).click();
    await page.waitForTimeout(400);
    await addHazard(page, 'Division 2 — unreinforced masonry parapet overhanging the Bravo-side egress corridor near the collapsed stairwell', 'High');
    await addHazard(page, 'Div 1 — standing water', 'Low');
    await addHazard(page, 'Div 3 — rebar trip hazard', 'Low');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  await step('shot: command hazard chip @ 1H+2L', async () => {
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/stress-command-hazardchip.png` });
    const txt = await page.locator('.fs-ichip--hazard').first().innerText().catch(() => 'NOT FOUND');
    return `chip reads: ${JSON.stringify(txt)}`;
  });

  await step('shot: ops chip strip @ 1H+2L', async () => {
    await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/stress-ops-chips.png` });
    const txt = await page.locator('.fs-ichip--hazard').first().innerText().catch(() => 'NOT FOUND');
    return `chip reads: ${JSON.stringify(txt)}`;
  });

  // ── EDGE 3: Cutting Station tab — is the strip visible there? ──
  await step('shot: cutting tab strip', async () => {
    await page.locator('.fs-segment', { hasText: 'Cutting' }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/stress-cutting-strip.png` });
    const hasStrip = await page.locator('.fs-ichip-strip').count();
    return `chip strip present on Cutting: ${hasStrip > 0}`;
  });

  // ── EDGE 4: transfer picker @ 18 rigs ──
  await step('shot: transfer picker 18 rigs', async () => {
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Transfer', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/stress-transfer-top.png` });
    const rigRows = await page.locator('[aria-label="Apparatus on scene"] li').count();
    await page.evaluate(() => { const d = document.querySelector('.fs-xfer-body, [role="dialog"]'); if (d) d.scrollTop = d.scrollHeight; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/stress-transfer-bottom.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return `rig rows: ${rigRows}`;
  });

  // ── EDGE 5: By-Division rollup with multiple divisions ──
  await step('shot: rollup multi-division', async () => {
    await page.locator('.fs-segment', { hasText: 'By Division' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/stress-rollup.png` });
    const scroller = await page.evaluate(() => {
      const el = document.querySelector('.fs-rollup-scroll');
      if (!el) return 'no scroller';
      return `scrollWidth ${el.scrollWidth} vs clientWidth ${el.clientWidth} (overflows: ${el.scrollWidth > el.clientWidth})`;
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    return scroller;
  });

  // ── EDGE 6: theme sweep of the new CSS (computed styles, all 4 themes) ──
  await step('theme sweep .fs-ichip / .fs-rollup', async () => {
    await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const sweep = await page.evaluate(() => {
      const out = {};
      for (const theme of ['dark', 'light', 'sunlight', 'broadcast']) {
        document.documentElement.setAttribute('data-theme', theme);
        const chip = document.querySelector('.fs-ichip--hazard') || document.querySelector('.fs-ichip');
        const safety = document.querySelector('.fs-ichip--safety .fs-ichip-v');
        if (!chip) { out[theme] = 'chip not mounted'; continue; }
        const cs = getComputedStyle(chip);
        out[theme] = {
          bg: cs.backgroundColor, color: cs.color, border: cs.borderColor,
          safetyColor: safety ? getComputedStyle(safety).color : 'n/a',
        };
      }
      document.documentElement.setAttribute('data-theme', 'dark');
      return out;
    });
    return JSON.stringify(sweep);
  });

  // Light-theme screenshot of the chips for the record.
  await step('shot: light-theme chips', async () => {
    await page.evaluate(() => { localStorage.setItem('fieldshore_theme', 'light'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/stress-light-chips.png` });
    await page.evaluate(() => { localStorage.setItem('fieldshore_theme', 'dark'); });
  });

  // ── EDGE 7: end the op → past-op/archive view ──
  await step('shot: post-op state', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: /End Operation/i }).click();
    await page.waitForTimeout(400);
    const confirm = page.locator('[role="dialog"]').getByRole('button', { name: /End Operation|End/i }).last();
    if (await confirm.count()) await confirm.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/stress-post-op.png` });
    const hasStrip = await page.locator('.fs-ichip-strip').count();
    return `chip strip after end-op: ${hasStrip > 0}`;
  });

  await browser.close();
  console.log(results.join('\n'));
};

run().catch((e) => { console.error(e.message); process.exit(1); });
