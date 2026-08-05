// #261 battalion-chief field review — scene build + IC-surface capture.
// Pattern lifted from .claude/audits/v4-visual-elevation-2026-07/cmd-after-shots.mjs.
// Every capture step is tolerant: a missed selector logs SKIP and moves on so one
// drifted control doesn't sink the whole walkthrough.
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/phase-j/261-shots';

// The Operations gate (RequireDepartment, since 34c0822) needs identity.kind ===
// 'member' AND a department. The old guest+admin seed no longer unlocks it. New
// recipe: (1) block every Firebase host so the SDK can neither refresh tokens nor
// sign the user out, (2) plant a fake persisted Firebase-auth user whose uid matches
// the seeded member session (authSession's reconcile then no-ops), (3) seed the
// member+dept session row in fieldshore-global, (4) after the app's first boot has
// created the dept bucket's schema, plant the fixture inventory + roster there
// (activateBucket only auto-seeds the guest bucket) and reload.
const DEPT_ID = 'sim-meadowville';
const ACCT = 'sim-acct-bc';

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

    // Fake persisted Firebase auth user — apiKey read from the app's own module
    // (Vite dev serves it transformed; the secret never leaves the page).
    const { firebaseApp } = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/auth/firebase.ts');
    const apiKey = firebaseApp.options.apiKey;
    const b64u = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const jwt = `${b64u({ alg: 'none', typ: 'JWT' })}.${b64u({
      sub: ACCT, user_id: ACCT, aud: firebaseApp.options.projectId, iss: `https://securetoken.google.com/${firebaseApp.options.projectId}`,
      iat: now, auth_time: now, exp: now + 31536000, firebase: { sign_in_provider: 'password' },
    })}.sig`;
    await put('firebaseLocalStorageDb', 'firebaseLocalStorage', {
      fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`,
      value: {
        uid: ACCT, email: 'bc@example.com', emailVerified: true, isAnonymous: false,
        displayName: 'BC McAllister', providerData: [{ providerId: 'password', uid: 'bc@example.com', displayName: 'BC McAllister', email: 'bc@example.com', phoneNumber: null, photoURL: null }],
        stsTokenManager: { refreshToken: 'fake-refresh', accessToken: jwt, expirationTime: Date.now() + 31536000000 },
        createdAt: String(Date.now() - 86400000), lastLoginAt: String(Date.now()),
        apiKey, appName: '[DEFAULT]',
      },
    });

    const dept = { id: DEPT_ID, name: 'Meadowville Fire Rescue', role: 'admin', inviteCode: 'SIM123' };
    await put('fieldshore-global', 'meta', {
      key: 'fieldshore_session',
      value: JSON.stringify({
        identity: { kind: 'member', accountId: ACCT, displayName: 'BC McAllister' },
        departmentId: dept.id, departmentName: dept.name, role: dept.role, inviteCode: dept.inviteCode,
      }),
    });
    await put('fieldshore-global', 'meta', {
      key: 'fieldshore_dept_memberships',
      value: JSON.stringify({ [ACCT]: dept }),
    });
    localStorage.setItem('fieldshore_theme', 'dark');
  }, { DEPT_ID, ACCT });
};

// Fixture inventory (mirror of src/data/store/seed.ts buildSeedInventory + roster) —
// planted into the dept bucket, which activateBucket never auto-seeds.
const seedDeptBucket = async (page) => {
  await page.evaluate(async ({ DEPT_ID }) => {
    const item = (id, apparatus, apparatusId, fields) => ({ id, apparatus, apparatusId, ...fields });
    const r2 = (id, f) => item(id, 'Rescue 2', 'app-rescue-2', f);
    const e1 = (id, f) => item(id, 'Engine 1', 'app-engine-1', f);
    const s3 = (id, f) => item(id, 'Squad 3', 'app-squad-3', f);
    const rows = [
      r2('inv-r2-ls203', { type: 'strut', model: 'LS 203', system: 'LongShore', quantity: 4, available: 4 }),
      r2('inv-r2-ls304', { type: 'strut', model: 'LS 304', system: 'LongShore', quantity: 4, available: 4 }),
      r2('inv-r2-ls406', { type: 'strut', model: 'LS 406', system: 'LongShore', quantity: 2, available: 2 }),
      r2('inv-r2-at2536', { type: 'strut', model: 'AT 25-36', system: 'AcmeThread', quantity: 4, available: 4 }),
      r2('inv-r2-at3758', { type: 'strut', model: 'AT 37-58', system: 'AcmeThread', quantity: 4, available: 4 }),
      r2('inv-r2-lsext12', { type: 'extension', system: 'LongShore', length: 12, quantity: 2, available: 2 }),
      r2('inv-r2-lsext24', { type: 'extension', system: 'LongShore', length: 24, quantity: 2, available: 2 }),
      r2('inv-r2-atext6', { type: 'extension', system: 'AcmeThread', length: 6, quantity: 2, available: 2 }),
      r2('inv-r2-atext12', { type: 'extension', system: 'AcmeThread', length: 12, quantity: 2, available: 2 }),
      r2('inv-r2-rigid6', { type: 'plate', plateId: 'rigid6', quantity: 8, available: 8 }),
      r2('inv-r2-swivel6', { type: 'plate', plateId: 'swivel6', quantity: 4, available: 4 }),
      e1('inv-e1-at1925', { type: 'strut', model: 'AT 19-25', system: 'AcmeThread', quantity: 2, available: 2 }),
      e1('inv-e1-at2536', { type: 'strut', model: 'AT 25-36', system: 'AcmeThread', quantity: 2, available: 2 }),
      e1('inv-e1-ls1016', { type: 'strut', model: 'LS 1016', system: 'LongShore', quantity: 2, available: 2 }),
      e1('inv-e1-lsext48', { type: 'extension', system: 'LongShore', length: 48, quantity: 1, available: 1 }),
      s3('inv-s3-ls304', { type: 'strut', model: 'LS 304', system: 'LongShore', quantity: 2, available: 0 }),
      s3('inv-s3-at3758', { type: 'strut', model: 'AT 37-58', system: 'AcmeThread', quantity: 1, available: 0 }),
    ];
    const roster = [
      { id: 'app-rescue-2', name: 'Rescue 2', type: 'Rescue' },
      { id: 'app-engine-1', name: 'Engine 1', type: 'Engine' },
      { id: 'app-squad-3', name: 'Squad 3', type: 'Squad' },
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
  try { await fn(); results.push(`OK   ${name}`); }
  catch (e) { results.push(`SKIP ${name} — ${e.message.split('\n')[0].slice(0, 120)}`); }
};

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // Firebase fully offline: the SDK keeps a persisted user it cannot re-validate,
  // and no scene data ever touches the real fieldshore-database project.
  await context.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(8000); // tolerant steps shouldn't stall 30s per miss
  // Seed from a real app route ('/' serves the static welcome page, whose module
  // graph can't fetch /src/... imports).
  await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await seedIdentity(page);
  // Boot 1 — app creates the dept bucket schema (empty). Then plant fixtures, reboot.
  await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await seedDeptBucket(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // ── Scene: op + 3-Post group to Cutting + extra points ──
  await step('scene: start op', async () => {
    await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Start Operation' }).first().click();
    await page.getByPlaceholder('e.g. Cascade Building Fire').fill('Meadowville Warehouse Collapse');
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
    await page.waitForTimeout(400);
  });

  await step('scene: 3-Post group 4′6″', async () => {
    await page.getByRole('button', { name: '+ Add Shore Point' }).click();
    await page.locator('[role="dialog"] input[aria-label="Feet"]').fill('4');
    await page.locator('[role="dialog"] input[aria-label="Inches"]').fill('6');
    await page.locator('[role="dialog"] .fs-segment', { hasText: '3-Post' }).click();
    await page.getByRole('button', { name: 'Save as Pending' }).click();
    await page.waitForTimeout(400);
  });

  await step('scene: deploy group + advance to Cutting', async () => {
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
  });

  await step('scene: assign Engine 1 to Shoring Group', async () => {
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Org Chart/ }).click();
    await page.waitForTimeout(400);
    await page.locator('.fs-org-node', { hasText: 'Shoring Group Supervisor' }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Change or add apparatus' }).click();
    await page.waitForTimeout(300);
    await page.locator('.fs-assign-row', { hasText: 'Engine 1' }).click();
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  await step('scene: pending point on Engine 1', async () => {
    await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
    const fab = page.locator('.fs-ops-fab');
    if (await fab.count()) await fab.click();
    else await page.getByRole('button', { name: /\+ (Add )?Shore Point/ }).first().click();
    await page.locator('[role="dialog"] input[aria-label="Feet"]').fill('5');
    await page.locator('[role="dialog"] button', { hasText: '— None —' }).click();
    await page.waitForTimeout(300);
    await page
      .locator('[role="dialog"]').last()
      .locator('button, [role="option"], [role="radio"]')
      .filter({ hasText: 'Engine 1' }).first().click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: 'Save as Pending' }).click();
    await page.waitForTimeout(400);
  });

  await step('scene: HIGH hazard', async () => {
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Hazards/ }).click();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: 'Add Hazard' }).first().click();
    await page.waitForTimeout(300);
    await page.locator('[role="dialog"]').getByLabel('Location').fill('Div 1 — north wall lean');
    await page.locator('[role="dialog"] [role="radio"]', { hasText: 'High' }).click();
    await page.locator('[role="dialog"]').getByRole('button', { name: 'Add Hazard' }).click();
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ── Phone captures ──
  await step('shot: ops board', async () => {
    await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/phone-ops-board.png` });
  });

  await step('shot: cutting station', async () => {
    await page.getByRole('button', { name: /Cutting/ }).first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/phone-ops-cutting.png` });
  });

  await step('shot: quick view (deployed detail)', async () => {
    await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
    // Deployed card head IS the Quick View entry (#14 — no "Details" link anymore).
    await page.locator('.fs-spc-head--detail').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/phone-quickview.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  await step('shot: command sitstat', async () => {
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/phone-command.png` });
    await page.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight; });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/phone-command-2.png` });
  });

  await step('shot: by-division rollup', async () => {
    await page.locator('.fs-segment', { hasText: 'By Division' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/phone-command-division.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  await step('shot: org chart + node sheet', async () => {
    await page.getByRole('button', { name: /Org Chart/ }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/phone-command-org.png` });
    await page.locator('.fs-org-node', { hasText: 'Shoring Group Supervisor' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/phone-org-node.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  await step('shot: my role sheet', async () => {
    await page.getByRole('button', { name: /My Role/i }).first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/phone-myrole.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  await step('shot: IC command checklist (201 brief)', async () => {
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /IC Command Checklist/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/phone-checklist.png` });
    await page.evaluate(() => {
      const d = document.querySelector('.fs-drawer, [role="dialog"]');
      if (d) d.scrollTop = d.scrollHeight;
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${OUT}/phone-checklist-2.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  await step('shot: transfer command flow', async () => {
    await page.getByRole('button', { name: 'Transfer', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/phone-transfer-1.png` });
    // Walk one step in if a target list is visible (named-target path → accept code).
    const target = page.locator('[role="dialog"] button, [role="dialog"] [role="radio"]').filter({ hasText: 'Engine 1' }).first();
    if (await target.count()) {
      await target.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${OUT}/phone-transfer-2.png` });
      const next = page.locator('[role="dialog"]').getByRole('button', { name: /Transfer|Continue|Next|Begin/i }).first();
      if (await next.count()) {
        await next.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUT}/phone-transfer-3.png` });
      }
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // If a pending transfer strip is now showing, capture then cancel it.
    const cancel = page.getByRole('button', { name: /Cancel/i }).first();
    if (await cancel.count()) {
      await page.screenshot({ path: `${OUT}/phone-transfer-pending.png` });
      await cancel.click();
      await page.waitForTimeout(300);
    }
  });

  await step('shot: offline banner', async () => {
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/phone-offline.png` });
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(400);
  });

  // ── Desktop deck ──
  await step('shot: desktop command deck', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${BASE}/command`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/desk-command.png` });
  });

  await step('shot: desktop hazard log', async () => {
    await page.locator('.fs-segment', { hasText: 'Hazard Log' }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/desk-command-hazards.png` });
  });

  await step('shot: desktop org node drawer', async () => {
    await page.locator('.fs-segment', { hasText: 'Org Chart' }).click();
    await page.waitForTimeout(300);
    await page.locator('.fs-org-node', { hasText: 'Shoring Group Supervisor' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/desk-command-node.png` });
  });

  await browser.close();
  console.log(results.join('\n'));
};

run().catch((e) => { console.error(e.message); process.exit(1); });
