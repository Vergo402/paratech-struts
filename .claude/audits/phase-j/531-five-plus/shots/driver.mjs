// #531 verification driver — drives the REAL UI (no event injection) on the worktree dev server :5204.
// Seeds identity + dept bucket the same way as phase-j/minibatch-shots/driver.mjs (double boot), blocks Firebase hosts.
// Phone 390x844 @2x, dark theme. Records PASS/FAIL per flow with the exact strings seen.
const PW = '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const BASE = 'http://localhost:5204';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore-531/.claude/audits/phase-j/531-five-plus/shots';
const SRC = '/@fs/Users/alex/Developer/paratech-struts/fieldshore-531/src';
const DEPT_ID = 'sim-meadowville';
const ACCT = 'sim-acct-bc';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const seedIdentity = async (page) => {
  await page.evaluate(async ({ DEPT_ID, ACCT, SRC }) => {
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
    localStorage.setItem('fieldshore_theme', 'dark');
  }, { DEPT_ID, ACCT, SRC });
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
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const consoleErrors = [];
const step = async (name, fn) => {
  try { await fn(); }
  catch (e) { note(`BLOCKED ${name} — ${String(e.message).split('\n')[0].slice(0, 220)}`); }
};

const run = async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', isMobile: true, hasTouch: true });
  await context.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[console.error] ${m.text().slice(0, 300)} @ ${m.location().url || '(no url)'}`); });
  const failedReqs = [];
  page.on('requestfailed', (r) => failedReqs.push(`${r.url().slice(0, 140)} :: ${r.failure()?.errorText}`));
  page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${String(e.message).slice(0, 300)}`));

  // Double boot: identity first, then dept bucket (the dept IndexedDB only exists after the shell boots into the dept).
  await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await seedIdentity(page);
  await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await seedDeptBucket(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const openQuickFind = async (load) => {
    await page.goto(`${BASE}/quickfind`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.locator('input[aria-label="Feet"]').fill('2');
    await page.locator('input[aria-label="Inches"]').fill('6');
    await page.getByLabel('Estimated load (lbs) — optional').fill(String(load));
    await page.getByRole('button', { name: 'Find Struts' }).click();
    await page.locator('.fs-qf-results .fs-rec').first().waitFor();
    await page.waitForTimeout(500);
  };
  const cardSummaries = async () => page.locator('.fs-qf-results .fs-rec').evaluateAll((els) =>
    els.map((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      const model = (el.querySelector('.fs-rec-calc-model')?.textContent || '').trim();
      const tile = (el.querySelector('.fs-rec-need-tile')?.textContent || '').trim();
      return { model, tile, text: t };
    }));

  // ---------- Flow 1 ----------
  await step('flow1', async () => {
    await openQuickFind(500000);
    const dialogText = norm(await page.locator('[role="dialog"]').first().innerText());
    const title = norm(await page.locator('.fs-qf-count').first().innerText());
    const cards = await cardSummaries();
    const first = cards[0];
    const bodyText = norm(await page.locator('body').innerText());
    const cannot = /cannot be deployed/i.test(bodyText) || /cannot be deployed/i.test(dialogText);
    const sentence = 'This load needs 23 struts — plan additional shore sets, or consult rescue engineering.';
    // Screenshot 1: first card in view
    await page.locator('.fs-qf-results .fs-rec').first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/01-qf-500k.png` });
    // Also a sheet-top shot so the title is on record
    await page.evaluate(() => { let el = document.querySelector('.fs-qf-sheet'); while (el && el !== document.body) { if (el.scrollHeight > el.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) { el.scrollTop = 0; break; } el = el.parentElement; } });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/01b-qf-500k-sheet-top.png` });
    const ok = /^5 struts fit$/.test(title) && /LS 203/.test(first.model) && first.tile === '×23' && first.text.includes(sentence) && !cannot;
    note(`FLOW1 ${ok ? 'PASS' : 'FAIL'} title="${title}" firstCard.model="${first.model}" tile="${first.tile}" sentencePresent=${first.text.includes(sentence)} needWord=${first.text.includes('struts needed for this load')} cannotBeDeployedOnScreen=${cannot} cards=${JSON.stringify(cards.map((c) => `${c.model} ${c.tile}`))}`);
    note(`FLOW1 firstCardText="${first.text.slice(0, 420)}"`);
  });

  // ---------- Flow 2 ----------
  await step('flow2', async () => {
    await openQuickFind(100000);
    const title = norm(await page.locator('.fs-qf-count').first().innerText());
    const cards = await cardSummaries();
    await page.screenshot({ path: `${OUT}/02-qf-100k.png` });
    const ls203 = cards.find((c) => /LS 203/.test(c.model));
    const at2536 = cards.find((c) => /AT 25-36/.test(c.model));
    const bodyText = norm(await page.locator('body').innerText());
    const ok = !!ls203 && ls203.tile === '×5' && !!at2536 && at2536.tile === '×5';
    note(`FLOW2 ${ok ? 'PASS' : 'FAIL'} title="${title}" LS203=${ls203 ? ls203.tile : 'absent'} AT25-36=${at2536 ? at2536.tile : 'absent'} cards=${JSON.stringify(cards.map((c) => `${c.model} ${c.tile}`))} cannotBeDeployed=${/cannot be deployed/i.test(bodyText)}`);
    // scroll shot to show AT 25-36 if it's off-screen
    if (at2536) {
      await page.locator('.fs-qf-results .fs-rec', { hasText: 'AT 25-36' }).first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/02b-qf-100k-at2536.png` });
    }
  });

  // ---------- Flow 3 / 4 ----------
  await page.goto(`${BASE}/operations`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await step('ops: start operation', async () => {
    const start = page.getByRole('button', { name: 'Start Operation' }).first();
    if (await start.count()) {
      await start.click();
      await page.getByPlaceholder('e.g. Cascade Building Fire').fill('531 five-plus verification');
      await page.locator('[role="dialog"]').getByRole('button', { name: 'Start Operation' }).click();
      await page.waitForTimeout(800);
      note('OPS started operation "531 five-plus verification"');
    } else {
      note('OPS an operation was already active');
    }
  });

  await step('ops: add T-Shore 2ft6 load 500000', async () => {
    const fab = page.locator('.fs-ops-fab');
    if (await fab.count()) await fab.click();
    else await page.getByRole('button', { name: /\+ (Add )?Shore Point/ }).first().click();
    const dlg = page.locator('[role="dialog"]').last();
    await dlg.locator('input[aria-label="Feet"]').fill('2');
    await dlg.locator('input[aria-label="Inches"]').fill('6');
    await dlg.getByLabel('Estimated load (lbs) — optional').fill('500000');
    const seg = await dlg.locator('.fs-segment').allInnerTexts();
    note(`OPS shore-type segments: ${JSON.stringify(seg.map(norm))}`);
    const selected = await dlg.locator('.fs-segment[aria-checked="true"], .fs-segment[aria-pressed="true"], .fs-segment.is-active, .fs-segment[data-state="on"]').allInnerTexts();
    note(`OPS selected shore type: ${JSON.stringify(selected.map(norm))} (default T-Shore expected)`);
    await page.screenshot({ path: `${OUT}/03a-add-point-modal.png` });
    await page.getByRole('button', { name: /Save as Pending|Add to Pending/ }).click();
    await page.waitForTimeout(900);
  });

  await step('ops: open Assign Equipment', async () => {
    let assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first();
    if (!(await assign.count())) {
      await page.locator('.fs-spc-head[aria-expanded]').first().click();
      await page.waitForTimeout(400);
      assign = page.getByRole('button', { name: 'Assign Equipment', exact: true }).first();
    }
    await assign.click();
    await page.locator('.fs-assign-list .fs-rec').first().waitFor();
    await page.waitForTimeout(600);
  });

  await step('flow3: assign sheet before ack', async () => {
    const cards = page.locator('.fs-assign-list .fs-rec');
    const n = await cards.count();
    const summaries = await cards.evaluateAll((els) => els.map((el) => ({
      model: (el.querySelector('.fs-rec-slot-model, .fs-rec-model, .fs-rec-calc-model, h3, h4')?.textContent || '').trim(),
      tile: (el.querySelector('.fs-rec-need-tile')?.textContent || '').trim(),
      text: (el.innerText || '').replace(/\s+/g, ' ').trim(),
    })));
    note(`FLOW3 assign-sheet cards (${n}): ${JSON.stringify(summaries.map((s) => `${s.model || s.text.slice(0, 20)} | ${s.tile}`))}`);
    const ls = page.locator('.fs-assign-list .fs-rec', { hasText: 'LS 203' }).first();
    await ls.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const text = norm(await ls.innerText());
    const tile = norm(await ls.locator('.fs-rec-need-tile').first().textContent());
    const gate = 'Deploying short of the required struts needs a recorded team acknowledgment.';
    const deployBtn = ls.getByRole('button', { name: /Deploy 1 of 23 anyway/ });
    const disabledBefore = await deployBtn.isDisabled();
    await page.screenshot({ path: `${OUT}/03a-assign-card-top.png` });
    await deployBtn.scrollIntoViewIfNeeded();
    await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /Deploy 1 of 23 anyway/.test(x.textContent || '')); b?.scrollIntoView({ block: 'end' }); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/03-assign-before-ack.png` });
    // full-card capture of the LS 203 card for evidence of all text
    await ls.screenshot({ path: `${OUT}/03b-assign-ls203-card.png` });
    const ack = ls.getByRole('checkbox', { name: /Team acknowledges the over-capacity deploy/ });
    const ackBefore = await ack.getAttribute('aria-checked');
    const ok = tile === '×23' && text.includes(gate) && (await deployBtn.count()) === 1 && disabledBefore && ackBefore === 'false';
    note(`FLOW3 ${ok ? 'PASS' : 'FAIL'} (before ack) LS203.tile="${tile}" gatePresent=${text.includes(gate)} ackLabelPresent=${(await ack.count()) === 1} ack.aria-checked=${ackBefore} "Deploy 1 of 23 anyway".disabled=${disabledBefore} cannotBeDeployed=${/cannot be deployed/i.test(text)}`);
    await ack.click();
    await page.waitForTimeout(500);
    const ackAfter = await ack.getAttribute('aria-checked');
    const disabledAfter = await deployBtn.isDisabled();
    await page.screenshot({ path: `${OUT}/04-assign-after-ack.png` });
    note(`FLOW3b ${ackAfter === 'true' && !disabledAfter ? 'PASS' : 'FAIL'} (after ack) ack.aria-checked=${ackAfter} "Deploy 1 of 23 anyway".disabled=${disabledAfter}`);
  });

  await step('flow4: deploy', async () => {
    const ls = page.locator('.fs-assign-list .fs-rec', { hasText: 'LS 203' }).first();
    await ls.getByRole('button', { name: /Deploy 1 of 23 anyway/ }).click();
    await page.waitForTimeout(900);
    const dlgText = norm(await page.locator('[role="dialog"]').last().innerText().catch(() => ''));
    const btns = await page.locator('button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)).filter(Boolean));
    note(`FLOW4 after Deploy click: visible buttons = ${JSON.stringify(btns)}`);
    await page.screenshot({ path: `${OUT}/04b-after-deploy-click.png` });
    // missing-piece chooser: prefer the off-book option; otherwise a truck
    const offBook = page.getByRole('button', { name: /Deploy off-book \(untracked\)/i }).first();
    const radioOff = page.getByRole('radio', { name: /off-book/i }).first();
    if (await offBook.count()) { note('FLOW4 chooser: clicking "Deploy off-book (untracked)" button'); await offBook.click(); await page.waitForTimeout(500); }
    else if (await radioOff.count()) { note('FLOW4 chooser: selecting off-book radio'); await radioOff.click(); await page.waitForTimeout(500); }
    else note('FLOW4 chooser: no missing-piece chooser appeared');
    const commit = page.getByRole('button', { name: /Confirm & deploy|Confirm and deploy|Confirm/i }).first();
    if (await commit.count() && await commit.isVisible()) { note(`FLOW4 confirm: clicking "${norm(await commit.textContent())}"`); await commit.click(); await page.waitForTimeout(1200); }
    await page.screenshot({ path: `${OUT}/04c-after-confirm.png` });
    const stillOpen = await page.locator('.fs-assign-list').count();
    note(`FLOW4 assign sheet still open after confirm: ${stillOpen > 0}`);
    if (stillOpen > 0) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
  });

  await step('flow4: board flag', async () => {
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/05-board-flag.png`, fullPage: true });
    const flags = await page.locator('.fs-capflag, [class*="capflag"], [class*="cap-flag"]').allInnerTexts().catch(() => []);
    const bodyText = norm(await page.locator('body').innerText());
    const hasOver = /Over capacity/.test(bodyText);
    note(`FLOW4 ${hasOver ? 'PASS' : 'FAIL'} board shows "Over capacity" text=${hasOver} flagElements=${JSON.stringify(flags.map(norm))} cannotBeDeployed=${/cannot be deployed/i.test(bodyText)}`);
  });

  await step('flow4: drawer', async () => {
    await page.locator('.fs-spc-head--detail').first().click();
    await page.waitForTimeout(900);
    const dlg = page.locator('[role="dialog"]').last();
    const text = norm(await dlg.innerText());
    await page.screenshot({ path: `${OUT}/06-drawer.png` });
    const expected = "Over capacity — estimated load 500,000 lbs exceeds this strut's 22,000 lbs rating at this length.";
    note(`FLOW4b ${text.includes(expected) ? 'PASS' : 'FAIL'} drawer contains expected warning=${text.includes(expected)}`);
    const m = text.match(/Over capacity[^.]*\./g);
    note(`FLOW4b drawer "Over capacity" sentences: ${JSON.stringify(m)}`);
    note(`FLOW4b drawerText="${text.slice(0, 700)}"`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });

  // ---------- Flow 5 ----------
  await step('flow5: gallery', async () => {
    const before = consoleErrors.length;
    await page.goto(`${BASE}/gallery`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const sec = page.locator('section', { has: page.locator('h2', { hasText: '5+ struts #531' }) }).first();
    if (!(await sec.count())) throw new Error('gallery section "5+ struts #531" not found; h2s: ' + JSON.stringify((await page.locator('h2').allInnerTexts()).slice(0, 12)));
    await sec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const h2 = norm(await sec.locator('h2').first().innerText());
    const tiles = (await sec.locator('.fs-rec-need-tile').allTextContents()).map(norm);
    const stext = norm(await sec.innerText());
    // screenshot the section: scroll the 5+ card into view and shoot the viewport, plus the element
    const fiveCard = sec.locator('.fs-rec', { has: page.locator('.fs-rec-need-tile') }).first();
    await fiveCard.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/07-gallery.png` });
    await sec.screenshot({ path: `${OUT}/07b-gallery-section.png` });
    const newErrs = consoleErrors.slice(before);
    note(`FLOW5 ${tiles.includes('×14') ? 'PASS' : 'FAIL'} h2="${h2}" needTiles=${JSON.stringify(tiles)} gate/ack present=${stext.includes('Deploying short of the required struts needs a recorded team acknowledgment.')} errorsDuringGallery=${newErrs.length}`);
  });

  // ---------- Flow 6 ----------
  const vite = (e) => /\[vite\]|WebSocket|ws:\/\/|wss:\/\//i.test(e);
  const blocked = (e) => /(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/i.test(e);
  const failedHosts = {}; failedReqs.forEach((u) => { const h = (u.match(/^https?:\/\/([^/]+)/) || [])[1] || u.slice(0, 30); failedHosts[h] = (failedHosts[h] || 0) + 1; });
  note(`FLOW6 failed requests by host: ${JSON.stringify(failedHosts)}`);
  const real = consoleErrors.filter((e) => !vite(e) && !blocked(e));
  const blockedOnly = consoleErrors.filter((e) => !vite(e) && blocked(e));
  note(`FLOW6 console errors total=${consoleErrors.length} vite-ws-noise=${consoleErrors.filter(vite).length} blocked-network(aborted Firebase/Google hosts)=${blockedOnly.length} other=${real.length}`);
  real.forEach((e) => note(`FLOW6 other: ${e}`));
  blockedOnly.slice(0, 6).forEach((e) => note(`FLOW6 blocked-sample: ${e}`));
  writeFileSync(`${OUT}/console-errors.txt`, consoleErrors.join('\n'));
  writeFileSync(`${OUT}/results.txt`, results.join('\n'));
  await browser.close();
};
run().catch((e) => { console.error('FATAL', e); process.exit(1); });
