// Gated RecommendationCard header (option C) verification — drives the REAL UI on the worktree dev server :5206.
// Seeders reused from 531-five-plus/driver.mjs. Phone 390x844 @2x. One fresh browser context per (theme, scenario).
const PW = '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const BASE = 'http://localhost:5206';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore-rec-header/.claude/audits/phase-j/rec-gated-header/shots';
const SRC = '/@fs/Users/alex/Developer/paratech-struts/fieldshore-rec-header/src';
const DEPT_ID = 'sim-meadowville';
const ACCT = 'sim-acct-bc';
import { writeFileSync } from 'node:fs';
let THEME = 'dark';
const seedIdentity = async (page) => {
  await page.evaluate(async ({ DEPT_ID, ACCT, SRC, THEME }) => {
    const put = (dbName, store, row) => new Promise((resolve) => {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => { const db = req.result; try { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).put(row); tx.oncomplete = () => { db.close(); resolve(true); }; tx.onerror = () => { db.close(); resolve(false); }; } catch { db.close(); resolve(false); } };
      req.onerror = () => resolve(false);
    });
    const { firebaseApp } = await import(`${SRC}/data/auth/firebase.ts`);
    const apiKey = firebaseApp.options.apiKey;
    const b64u = (o) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const now = Math.floor(Date.now() / 1000);
    const jwt = `${b64u({ alg: 'none', typ: 'JWT' })}.${b64u({ sub: ACCT, user_id: ACCT, aud: firebaseApp.options.projectId, iss: `https://securetoken.google.com/${firebaseApp.options.projectId}`, iat: now, auth_time: now, exp: now + 31536000, firebase: { sign_in_provider: 'password' } })}.sig`;
    await put('firebaseLocalStorageDb', 'firebaseLocalStorage', { fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`, value: { uid: ACCT, email: 'bc@example.com', emailVerified: true, isAnonymous: false, displayName: 'BC McAllister', providerData: [{ providerId: 'password', uid: 'bc@example.com', displayName: 'BC McAllister', email: 'bc@example.com', phoneNumber: null, photoURL: null }], stsTokenManager: { refreshToken: 'fake-refresh', accessToken: jwt, expirationTime: Date.now() + 31536000000 }, createdAt: String(Date.now() - 86400000), lastLoginAt: String(Date.now()), apiKey, appName: '[DEFAULT]' } });
    const dept = { id: DEPT_ID, name: 'Meadowville Fire Rescue', role: 'admin', inviteCode: 'SIM123' };
    await put('fieldshore-global', 'meta', { key: 'fieldshore_session', value: JSON.stringify({ identity: { kind: 'member', accountId: ACCT, displayName: 'BC McAllister' }, departmentId: dept.id, departmentName: dept.name, role: dept.role, inviteCode: dept.inviteCode }) });
    await put('fieldshore-global', 'meta', { key: 'fieldshore_dept_memberships', value: JSON.stringify({ [ACCT]: dept }) });
    localStorage.setItem('fieldshore_theme', THEME);
  }, { DEPT_ID, ACCT, SRC, THEME });
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

const results = [];
const note = (s) => { results.push(s); console.log(s); };
const consoleErrors = [];

// Header geometry for one card: overlap + truncation + identity line count.
const measure = (el) => {
  const r = (q) => { const n = el.querySelector(q); if (!n) return null; const b = n.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height, sw: n.scrollWidth, cw: n.clientWidth, text: (n.textContent || '').trim(), lh: parseFloat(getComputedStyle(n).lineHeight), ta: getComputedStyle(n).textAlign } ; };
  const hit = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  const card = el.getBoundingClientRect();
  const id = r('.fs-rec-identity'), fit = r('.fs-rec-header > .fs-rec-fit'), app = r('.fs-rec-apparatus'), loc = r('.fs-rec-loc'), stock = r('.fs-rec-stock');
  return {
    gated: el.classList.contains('is-gated'), theme: document.documentElement.dataset.theme,
    identity: id && id.text, identityLines: id ? Math.round(id.h / id.lh) : null, identityAlign: id && id.ta,
    badge: fit && fit.text, apparatus: app && app.text, location: loc && loc.text, stock: stock && stock.text,
    badgeOverIdentity: hit(id, fit), badgeOverApparatus: hit(app, fit), badgeOverLoc: hit(loc, fit),
    apparatusTruncated: app ? app.sw > app.cw + 1 : null, locTruncated: loc ? loc.sw > loc.cw + 1 : null, stockTruncated: stock ? stock.sw > stock.cw + 1 : null,
    badgeInsideCard: fit ? fit.r <= card.right - 8 && fit.l >= card.left : null,
  };
};

// Decision captures: the same live card under each candidate header layout. The
// overrides below are TEMPORARY page-injected previews for choosing, not the fix.
const VARIANTS = {
  'c-as-built': '.x-none{}',
  'c-model-whole': '.fs-rec-model{white-space:nowrap}',
  'c-badge-row': '.fs-rec.is-gated .fs-rec-header>.fs-rec-fit{grid-column:1/-1!important;justify-self:end} .fs-rec.is-gated .fs-rec-identity{grid-column:1/-1!important}',
  'a-centered': '.fs-rec.is-gated .fs-rec-header{display:flex!important;flex-direction:column;align-items:center;gap:var(--space-2)} .fs-rec.is-gated .fs-rec-headcol{display:flex!important;text-align:center!important} .fs-rec.is-gated .fs-rec-header>.fs-rec-fit{position:static!important;order:-1} .fs-rec.is-gated .fs-rec-connectors{justify-content:center!important}',
};
const modelWhole = () => document.querySelectorAll('.fs-rec-identity').forEach((p) => {
  if (p.querySelector('.fs-rec-model')) return;
  const t = p.lastChild; const s = document.createElement('span'); s.className = 'fs-rec-model'; s.textContent = t.textContent; t.replaceWith(s);
});
// The model ("LS 203", "LS 1016 + 12″") must sit on ONE line: every line box of its text shares one top.
const modelOneLine = (el) => {
  const p = el.querySelector('.fs-rec-identity'); const node = p.querySelector('.fs-rec-model')?.firstChild || p.lastChild;
  const r = document.createRange(); r.selectNodeContents(node);
  const tops = [...r.getClientRects()].map((b) => Math.round(b.top));
  return { model: node.textContent, oneLine: new Set(tops).size === 1, identityLines: Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)) };
};

const openAssign = async (browser, label, ft, inch, load) => {
  THEME = 'dark';
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true, hasTouch: true });
  await context.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
  await seedIdentity(page);
  await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000);
  await seedDeptBucket(page); await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Start Operation' }).first().click();
  await page.getByPlaceholder('e.g. Cascade Building Fire').fill(`variants ${label}`);
  await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click(); await page.waitForTimeout(800);
  const fab = page.locator('.fs-ops-fab'); if (await fab.count()) await fab.click(); else await page.getByRole('button', { name: /\+ (Add )?Shore Point/ }).first().click();
  const dlg = page.locator('[role="dialog"]').last();
  await dlg.locator('input[aria-label="Feet"]').fill(String(ft)); await dlg.locator('input[aria-label="Inches"]').fill(String(inch));
  if (load) await dlg.getByLabel('Estimated load (lbs) — optional').fill(String(load));
  await page.getByRole('button', { name: /Save as Pending|Add to Pending/ }).click(); await page.waitForTimeout(900);
  let assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first();
  if (!(await assign.count())) { await page.locator('.fs-spc-head[aria-expanded]').first().click(); await page.waitForTimeout(400); assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first(); }
  await assign.click(); await page.locator('.fs-assign-list .fs-rec').first().waitFor(); await page.waitForTimeout(700);
  return { context, page };
};

const run = async () => {
  let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
  for (const [label, ft, inch, load] of [['over', 2, 6, 500000], ['unrated', 17, 0, 0], ...(process.argv.slice(2).map((l) => ['mixed', 2, 6, Number(l)]))]) {
    const { context, page } = await openAssign(browser, label, ft, inch, load);
    const summary = await page.locator('.fs-assign-list .fs-rec').evaluateAll((els) => els.map((e) => `${e.querySelector('.fs-rec-identity')?.textContent} ${e.classList.contains('is-gated') ? '[GATED ' + (e.querySelector('.fs-rec-header>.fs-rec-fit')?.textContent || '') + ']' : '[clean]'}`));
    note(`${label} load=${load}: ${JSON.stringify(summary)}`);
    let style = null;
    for (const [v, css] of Object.entries(VARIANTS)) {
      if (style) await style.evaluate((s) => s.remove());
      style = await page.addStyleTag({ content: css });
      if (v === 'c-model-whole') await page.evaluate(modelWhole);
      await page.waitForTimeout(200);
      const first = page.locator('.fs-assign-list .fs-rec').first();
      if (label === 'mixed') {
        await page.evaluate(() => { const l = document.querySelector('.fs-assign-list'); l?.querySelector('.fs-rec')?.scrollIntoView({ block: 'start' }); });
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${OUT}/v-${label}-${v}.png` });
      } else {
        await first.scrollIntoViewIfNeeded();
        await first.locator('.fs-rec-header').screenshot({ path: `${OUT}/v-${label}-${v}.png` });
        const gatedCards = page.locator('.fs-assign-list .fs-rec.is-gated');
        const m = await gatedCards.evaluateAll((els, fnSrc) => { const f = eval(fnSrc); return els.map(f); }, `(${modelOneLine.toString()})`);
        note(`${label} ${v}: ${JSON.stringify(m)}`);
      }
    }
    await context.close();
  }
  writeFileSync(`${OUT}/variants-results.txt`, results.join('\n'));
  await browser.close();
};
run().catch((e) => { console.error('FATAL', e); process.exit(1); });
