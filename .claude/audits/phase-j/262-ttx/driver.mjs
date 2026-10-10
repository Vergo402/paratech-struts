// #262 tabletop exercise driver — Level IV Hamden strip mall (822 Dixwell Ave), run on the
// LOCAL Firebase emulators with three simulated devices (plan: .claude/plans/v4-phase-j-262-ttx.md).
//
//   A = Incident Commander's phone   (iPhone 13, touch → status SLIDERS)
//   B = second member's phone        (iPhone 13, touch)
//   C = cold reader on a desktop     (1280×800 mouse → status BUTTONS)
//
// The driver RECORDS — it never decides PASS/FAIL. Every probe writes captures
// (NN-<item>-<device>.png), an evidence/<probe>.json dump (REST GET of the op's events
// node + each device's IndexedDB event log + the UI reads the plan's PASS column names)
// and a results.json entry. Adjudication is the main loop's job.
//
// Prereqs (see README.md): `npm run emulators` and `npm run dev:emu` (:5200) running.
// Env knobs: BASE (default http://localhost:5200), STOP_AFTER=<step-name prefix>,
// HEADED=1 (watch it), KEEP_STATE=1 (skip the emulator wipe at start).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium, devices } = await import(PW);

const ROOT = '/Users/alex/Developer/paratech-struts/fieldshore';
const OUT = dirname(fileURLToPath(import.meta.url));
const EVID = join(OUT, 'evidence');
const FIX = join(OUT, 'fixtures');
mkdirSync(EVID, { recursive: true });
mkdirSync(FIX, { recursive: true });

const BASE = process.env.BASE ?? 'http://localhost:5200';
const DB = 'http://127.0.0.1:9000';
// The app's databaseURL is the -default-rtdb instance → that's the emulator namespace.
const NS = process.env.NS ?? 'fieldshore-database-default-rtdb';
const AUTH_EMU = 'http://127.0.0.1:9099';
const PROJECT = 'fieldshore-database';
const CSV = join(ROOT, '.claude/skills/shared/millbrook-inventory.csv');
const FB_SYNC = `/@fs${ROOT}/src/data/sync/firebase.ts`;
const STOP_AFTER = process.env.STOP_AFTER ?? null;

const DEPT_NAME = 'Millbrook Fire Department';
const OP_NAME = 'Dixwell Ave Strip Mall Collapse';
const OP_ADDR = '822 Dixwell Ave, Hamden CT';

// Production hosts the run must never reach. Matched on HOSTNAME only — the Auth
// emulator puts "identitytoolkit.googleapis.com" in the PATH of 127.0.0.1:9099 URLs.
const PROD_HOST = /(^|\.)(firebaseio\.com|firebaseapp\.com)$|^(identitytoolkit|securetoken)\.googleapis\.com$/;
const EXT_HOST = /(^|\.)(maps\.googleapis\.com|places\.googleapis\.com|maps\.gstatic\.com|what3words\.com)$/;

// ─────────────────────────────────────────────────────────────── run bookkeeping
const lines = [];
const results = [];
const prodHits = [];
const extResponses = [];
const otherGoogle = [];
const wsLog = [];
const navLog = [];
const consoleErrors = { A: [], B: [], C: [] };
const notes = [];
let shotN = 0;
let stopped = false;
let currentCaptures = [];
let mark = 0;
const begin = () => { currentCaptures = []; mark = lines.length; };
const log = (s) => { lines.push(s); console.log(s); };
const note = (s) => { notes.push(s); log(`NOTE ${s}`); };

const step = async (name, fn, devs = []) => {
  if (stopped) { lines.push(`---- ${name} (stopped)`); return undefined; }
  let out;
  try {
    out = await fn();
    log(`OK   ${name}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split('\n')[0].slice(0, 220);
    log(`SKIP ${name} — ${msg}`);
    for (const d of devs) {
      try { await d.page.screenshot({ path: join(OUT, `skip-${String(++shotN).padStart(2, '0')}-${d.name}.png`), fullPage: true }); } catch { /* page gone */ }
    }
  }
  if (STOP_AFTER && name.startsWith(STOP_AFTER)) { stopped = true; log(`STOP_AFTER reached at "${name}"`); }
  return out;
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, { timeout = 15000, interval = 500, label = 'condition' } = {}) => {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) {
    try { last = await fn(); if (last) return last; } catch (e) { last = undefined; }
    await sleep(interval);
  }
  throw new Error(`timed out waiting for ${label}`);
};
const untilSoft = async (fn, opts) => { try { return await until(fn, opts); } catch { return null; } };

// ─────────────────────────────────────────────────────────────── REST (emulator)
// Canonical event order — source of truth: src/core/operation/eventLog.ts (ADR-041).
// Server-stamped receivedAt first (events without it sort last), then `at`, then id.
// Ids compare with < >, never localeCompare, so the order matches the app's fold.
const compareCanonical = (a, b) => {
  const ra = a.receivedAt ?? Infinity;
  const rb = b.receivedAt ?? Infinity;
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};
// Evidence-only fold. `available` is no longer stored on inventory rows (derived, ADR-033
// / ADR-041), so the driver derives it as quantity − held. Held = tracked BOM components
// (inventoryId set) on points that are deployed and not returned. Simple fold, not the
// app's projection (the app's own projection is the oracle): per spId we keep the latest
// deployedBom and status from the events below.
const heldFromEvents = (events) => {
  const pts = {};
  for (const e of [...events].sort(compareCanonical)) {
    const p = (pts[e.spId] ??= { bom: null, status: 'pending' });
    switch (e.type) {
      case 'EquipmentDeployed': p.bom = e.deployedBom ?? null; p.status = 'process'; break;
      case 'EquipmentReturned': p.bom = null; p.status = 'pending'; break;
      case 'EquipmentReclaimed': p.status = 'returned'; break;
      case 'ShorePointStatusChanged': p.status = e.to; break;
      case 'ComponentResourced':
        if (p.bom) p.bom = p.bom.map((c, i) => (i === e.componentIndex ? { ...c, inventoryId: e.inventoryId } : c));
        break;
      default: break;
    }
  }
  const held = {};
  for (const p of Object.values(pts)) {
    if (!p.bom || p.status === 'returned') continue;
    for (const c of p.bom) if (c.inventoryId) held[c.inventoryId] = (held[c.inventoryId] ?? 0) + 1;
  }
  return held;
};
const derivedAvailable = (rows, events) => {
  const held = heldFromEvents(events);
  return rows.map((r) => ({ ...r, available: r.quantity - (held[r.id] ?? 0) }));
};

const restUrl = (path, q = '') => `${DB}/${path ? `${path}.json` : '.json'}?ns=${NS}${q}`;
const rest = async (method, path, body, q = '') => {
  const r = await fetch(restUrl(path, q), {
    method,
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`REST ${method} /${path} → ${r.status} ${t.slice(0, 160)}`);
  return t ? JSON.parse(t) : null;
};
const opEvents = async (ctx) => {
  const v = await rest('GET', `orgs/${ctx.deptId}/events/${ctx.opId}`);
  return Object.values(v ?? {}).sort(compareCanonical);
};
// Inventory rows carry `quantity` only; `available` is derived in evidence (derivedAvailable).
const restInventory = async (ctx) => {
  const v = await rest('GET', `orgs/${ctx.deptId}/inventory`);
  return Object.entries(v ?? {}).map(([k, r]) => ({ key: k, id: r.id ?? k, apparatus: r.apparatus, type: r.type, model: r.model, plateId: r.plateId, length: r.length, quantity: r.quantity }));
};
const liteEvent = (e) => ({
  id: e.id, type: e.type, at: e.at, by: e.by, seq: e.seq,
  receivedAt: e.receivedAt, batchId: e.batchId, transferId: e.transferId,
  ...(e.spId ? { spId: e.spId } : {}),
  ...(e.from ? { from: e.from } : {}),
  ...(e.to ? { to: e.to } : {}),
  ...(e.toResource ? { toResource: e.toResource } : {}),
  ...(e.account ? { account: e.account } : {}),
  ...(e.claimCode ? { claimCode: e.claimCode } : {}),
  ...(e.shorePoint ? { shorePoint: { id: e.shorePoint.id, label: e.shorePoint.label, groupId: e.shorePoint.groupId, groupIndex: e.shorePoint.groupIndex, measurementEighths: e.shorePoint.measurementEighths, assignedResource: e.shorePoint.assignedResource } } : {}),
  ...(e.hazard ? { hazard: { id: e.hazard.id, severity: e.hazard.severity, location: e.hazard.location } } : {}),
  ...(e.position ? { position: { id: e.position.id, title: e.position.title, parentId: e.position.parentId } } : {}),
  ...(e.resource ? { resource: e.resource } : {}),
  ...(e.positionId ? { positionId: e.positionId } : {}),
  ...(e.deployedStrut ? { deployedStrut: e.deployedStrut } : {}),
  ...(e.deployedBom ? { deployedBom: e.deployedBom } : {}),
});

// ─────────────────────────────────────────────────────────────── browser helpers
// The app scrolls inside its own containers (main, sheets), so Playwright's fullPage
// stops at the viewport. On the phones, grow the viewport by the largest inner overflow
// for the capture, then restore it — the shot shows everything below the fold.
const shot = async (dev, item) => {
  const file = `${String(++shotN).padStart(2, '0')}-${item}-${dev.name}.png`;
  const vp = dev.page.viewportSize();
  let grown = false;
  if (!dev.desktop && vp) {
    const extra = await dev.page.evaluate(() => {
      let m = 0;
      for (const el of document.querySelectorAll('*')) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 4) m = Math.max(m, el.scrollHeight - el.clientHeight);
      }
      return m;
    }).catch(() => 0);
    if (extra > 0) {
      await dev.page.setViewportSize({ width: vp.width, height: Math.min(vp.height + extra, 4200) });
      await dev.page.waitForTimeout(350);
      grown = true;
    }
  }
  await dev.page.screenshot({ path: join(OUT, file), fullPage: true });
  if (grown) { await dev.page.setViewportSize(vp); await dev.page.waitForTimeout(250); }
  currentCaptures.push(file);
  return file;
};

// Pre-import the app's own sync module (same URL graph → the same RTDB instance) and
// watch .info/connected. Must run while ONLINE: an offline page can't fetch a module.
const arm = async (dev) => {
  await dev.page.evaluate(async (p) => {
    if (window.__fsArmed) return;
    try {
      const m = await import(p);
      window.__fsSync = m;
      window.__fsConnected = null;
      m.onValue(m.ref(m.rtdb, '.info/connected'), (s) => { window.__fsConnected = s.val(); });
      window.__fsArmed = true;
    } catch (e) { window.__fsArmErr = String(e); }
  }, FB_SYNC).catch(() => {});
};
const connected = (dev) => dev.page.evaluate(() => window.__fsConnected).catch(() => null);

// First-run Welcome intro (createAccount starts onboarding) + any coachmark.
const dismissOverlays = async (dev) => {
  const p = dev.page;
  for (let i = 0; i < 3; i++) {
    const skip = p.getByRole('button', { name: 'Skip', exact: true });
    if (await skip.count()) { await skip.first().click().catch(() => {}); await p.waitForTimeout(300); continue; }
    break;
  }
};
const settle = async (dev, ms = 1200) => {
  await dev.page.waitForTimeout(ms);
  await arm(dev);
  await dismissOverlays(dev);
};
const go = async (dev, path, ms) => {
  await dev.page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await settle(dev, ms);
};
const reload = async (dev, ms) => {
  await dev.page.reload({ waitUntil: 'domcontentloaded' });
  await settle(dev, ms);
};
const topDialog = (p) => p.locator('[role="dialog"]').last();
// Sheets keep their own scroll position — reset it so a capture shows the sheet's head.
const scrollDialogTop = (p) => topDialog(p).evaluate((el) => { [el, ...el.querySelectorAll('*')].forEach((n) => { if (n.scrollTop) n.scrollTop = 0; }); }).catch(() => {});
const clickFirst = async (p, cands, what) => {
  const tried = [];
  for (const [desc, loc] of cands) {
    tried.push(desc);
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < n; i++) {
      const el = loc.nth(i);
      if (await el.isVisible().catch(() => false)) { await el.click(); return desc; }
    }
  }
  throw new Error(`${what}: none of [${tried.join(' | ')}] visible`);
};
const text = async (loc) => ((await loc.count()) ? (await loc.first().innerText()).replace(/\s+/g, ' ').trim() : null);
const texts = async (loc) => (await loc.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());

// IndexedDB readers (dept bucket only — never the auth store, which holds tokens).
const readLog = (dev, deptId) => dev.page.evaluate(async (deptId) => new Promise((resolve) => {
  const req = indexedDB.open(`fieldshore-dept-${deptId}`);
  req.onsuccess = () => {
    const db = req.result;
    try {
      const all = db.transaction('events', 'readonly').objectStore('events').getAll();
      all.onsuccess = () => { db.close(); resolve(all.result); };
      all.onerror = () => { db.close(); resolve([]); };
    } catch { db.close(); resolve([]); }
  };
  req.onerror = () => resolve([]);
}), deptId);
const readInventory = (dev, deptId) => dev.page.evaluate(async (deptId) => new Promise((resolve) => {
  const req = indexedDB.open(`fieldshore-dept-${deptId}`);
  req.onsuccess = () => {
    const db = req.result;
    try {
      const all = db.transaction('inventory', 'readonly').objectStore('inventory').getAll();
      all.onsuccess = () => { db.close(); resolve(all.result.map((r) => ({ id: r.id, apparatus: r.apparatus, type: r.type, model: r.model, plateId: r.plateId, length: r.length, quantity: r.quantity }))); };
      all.onerror = () => { db.close(); resolve([]); };
    } catch { db.close(); resolve([]); }
  };
  req.onerror = () => resolve([]);
}), deptId);
const readSession = (dev) => dev.page.evaluate(async () => new Promise((resolve) => {
  const req = indexedDB.open('fieldshore-global');
  req.onsuccess = () => {
    const db = req.result;
    try {
      const g = db.transaction('meta', 'readonly').objectStore('meta').get('fieldshore_session');
      g.onsuccess = () => {
        db.close();
        try {
          const s = JSON.parse(g.result?.value ?? 'null');
          resolve(s ? { identity: s.identity, departmentId: s.departmentId, departmentName: s.departmentName, role: s.role } : null);
        } catch { resolve(null); }
      };
      g.onerror = () => { db.close(); resolve(null); };
    } catch { db.close(); resolve(null); }
  };
  req.onerror = () => resolve(null);
}));
// Backdate one event row in a device's local log. `seq` is the primary key → go via the `id` index.
const patchLocalAt = (dev, deptId, id, at) => dev.page.evaluate(async ({ deptId, id, at }) => new Promise((resolve) => {
  const req = indexedDB.open(`fieldshore-dept-${deptId}`);
  req.onsuccess = () => {
    const db = req.result;
    let ok = false;
    try {
      const tx = db.transaction('events', 'readwrite');
      const st = tx.objectStore('events');
      const g = st.index('id').get(id);
      g.onsuccess = () => { const row = g.result; if (row) { row.at = at; st.put(row); ok = true; } };
      tx.oncomplete = () => { db.close(); resolve(ok); };
      tx.onerror = () => { db.close(); resolve(false); };
    } catch { db.close(); resolve(false); }
  };
  req.onerror = () => resolve(false);
}), { deptId, id, at });

// ─────────────────────────────────────────────────────────────── network forcing
// Offline = all three levers: Chromium offline emulation (navigator.onLine → the app's
// banner + syncService), the dispatched `offline` event, and goOffline(rtdb) through the
// app's own module (offline emulation is not trusted to drop an open WebSocket).
const setNet = async (dev, online) => {
  const p = dev.page;
  const t0 = Date.now();
  const rtdbSocketCloses = () => wsLog.filter((w) => w.device === dev.name && w.ev === 'close' && w.key.startsWith('127.0.0.1:9000') && w.t >= t0).length;
  if (!online) {
    await arm(dev);
    await dev.ctx.setOffline(true);
    await p.evaluate(() => window.dispatchEvent(new Event('offline')));
    const r = await p.evaluate(() => { try { window.__fsSync.goOffline(window.__fsSync.rtdb); return 'goOffline'; } catch (e) { return `goOffline failed: ${e}`; } });
    const c = await untilSoft(async () => ((await connected(dev)) === false ? 'false' : null), { timeout: 6000, label: `${dev.name} .info/connected=false` });
    const nav = await p.evaluate(() => navigator.onLine);
    return { lever: r, infoConnected: c ?? String(await connected(dev)), navigatorOnLine: nav, rtdbSocketClosed: rtdbSocketCloses() };
  }
  await dev.ctx.setOffline(false);
  const r = await p.evaluate(() => { try { window.__fsSync.goOnline(window.__fsSync.rtdb); return 'goOnline'; } catch (e) { return `goOnline failed: ${e}`; } });
  await p.evaluate(() => window.dispatchEvent(new Event('online')));
  const c = await untilSoft(async () => ((await connected(dev)) === true ? 'true' : null), { timeout: 10000, label: `${dev.name} .info/connected=true` });
  return { lever: r, infoConnected: c ?? String(await connected(dev)), navigatorOnLine: await p.evaluate(() => navigator.onLine) };
};

// ─────────────────────────────────────────────────────────────── app actions
const signUp = async (dev) => {
  const p = dev.page;
  await go(dev, '/auth', 800);
  await clickFirst(p, [
    ['radio "Create Account"', p.getByRole('radio', { name: 'Create Account' })],
    ['.fs-segment "Create Account"', p.locator('.fs-segment', { hasText: 'Create Account' })],
  ], 'mode toggle');
  await p.getByLabel('Display name', { exact: true }).fill(dev.acct.displayName);
  await p.getByLabel('Email', { exact: true }).fill(dev.acct.email);
  await p.getByLabel('Password', { exact: true }).fill(dev.acct.password);
  await p.getByRole('button', { name: 'Create Account', exact: true }).click();
  await p.waitForURL(/\/(create-department|operations)/, { timeout: 20000 });
  await p.waitForTimeout(600);
};

const assignedPick = async (p, dialog, apparatus) => {
  await dialog.getByRole('button', { name: 'Assigned', exact: true }).click();
  await p.waitForTimeout(300);
  await p.getByRole('option', { name: apparatus, exact: true }).first().click();
  await p.waitForTimeout(300);
};
const platePick = async (p, dialog, which, re) => {
  await dialog.getByRole('button', { name: which, exact: true }).click();
  await p.waitForTimeout(300);
  const opts = p.getByRole('option', { name: re });
  const n = await opts.count();
  if (!n) throw new Error(`${which}: no option matching ${re}`);
  await opts.first().click();
  await p.waitForTimeout(300);
};

const addPoint = async (dev, { label, feet, inches, type = null, assigned = null, plates = false }) => {
  const p = dev.page;
  await clickFirst(p, [
    ['.fs-ops-fab', p.locator('.fs-ops-fab')],
    ['button /Add shore point/i', p.getByRole('button', { name: /^\+? ?Add shore point$/i })],
  ], 'add shore point trigger');
  await p.waitForTimeout(500);
  const d = topDialog(p);
  // "Assigned" carries over from the newest point (#220 last-used defaults) — so an
  // unassigned point must explicitly pick "— None —".
  const assignedNow = await text(d.getByRole('button', { name: 'Assigned', exact: true }));
  if (assigned) await assignedPick(p, d, assigned);
  else if (assignedNow && !/^—/.test(assignedNow)) await assignedPick(p, d, '— None —');
  await d.getByLabel('Label', { exact: true }).fill(label);
  if (type) await d.locator('.fs-segment', { hasText: type }).first().click();
  await d.locator('input[aria-label="Feet"]').fill(String(feet));
  await d.locator('input[aria-label="Inches"]').fill(String(inches));
  if (plates) {
    const tog = d.locator('.fs-ledger-toggle');
    if ((await tog.count()) && (await tog.getAttribute('aria-expanded')) === 'false') await tog.click();
    await p.waitForTimeout(200);
    await platePick(p, d, 'Top plate', /Swivel/);
    await platePick(p, d, 'Bottom plate', /Swivel/);
  }
  const which = await clickFirst(p, [
    ['Save as Pending', d.getByRole('button', { name: 'Save as Pending', exact: true })],
    ['Add to Pending', d.getByRole('button', { name: 'Add to Pending', exact: true })],
    ['Add Shore Point (two-step)', d.getByRole('button', { name: 'Add Shore Point', exact: true })],
  ], 'shore point submit');
  await p.waitForTimeout(800);
  return { submit: which, assignedCarriedOver: assignedNow };
};

const card = (p, label) => p.locator('.fs-spc').filter({ hasText: label });
// A grouped shore (3-Post) renders as a stack showing ONE member; "Show all N cards"
// fans it out so every leg is its own .fs-spc (component state — resets on navigation).
const expandGroups = async (p) => {
  for (let i = 0; i < 6; i++) {
    const b = p.locator('.fs-gs-expand').filter({ visible: true });
    if (!(await b.count())) return;
    await b.first().click();
    await p.waitForTimeout(300);
  }
};
const cardStatus = async (p, label) => {
  await expandGroups(p);
  const c = card(p, label);
  const n = await c.count();
  const out = [];
  for (let i = 0; i < n; i++) {
    const cls = (await c.nth(i).getAttribute('class')) ?? '';
    out.push((cls.match(/\bis-(pending|process|strutset|cutting|runner|secured|returned)\b/) ?? [])[1] ?? cls);
  }
  return out;
};

// Deploy the first pending card matching `label` from the Assign Equipment sheet.
const deployCard = async (dev, label, { pick = 0 } = {}) => {
  const p = dev.page;
  await expandGroups(p);
  const c = card(p, label).filter({ has: p.getByRole('button', { name: 'Assign Equipment', exact: true }) }).first();
  if (!(await c.count())) throw new Error(`no pending card "${label}" with Assign Equipment`);
  await c.getByRole('button', { name: 'Assign Equipment', exact: true }).click();
  await p.waitForTimeout(700);
  return commitDeploy(dev, { pick });
};
const commitDeploy = async (dev, { pick = 0 } = {}) => {
  const p = dev.page;
  const d = topDialog(p);
  const btns = d.getByRole('button', { name: /^Deploy/ });
  const n = await btns.count();
  const avail = [];
  for (let i = 0; i < n; i++) avail.push({ i, name: (await btns.nth(i).innerText()).replace(/\s+/g, ' ').slice(0, 80), disabled: await btns.nth(i).isDisabled() });
  const enabled = avail.filter((b) => !b.disabled);
  if (!enabled.length) throw new Error(`no enabled Deploy button (${JSON.stringify(avail).slice(0, 160)})`);
  const target = enabled[Math.min(pick, enabled.length - 1)];
  await btns.nth(target.i).click();
  await p.waitForTimeout(900);
  const res = { chose: target.name, review: false, offBook: 0 };
  const title = await text(topDialog(p).locator('h2, [class*="title"]').first()).catch(() => null);
  if ((await p.getByText('Review sources', { exact: true }).count()) > 0) {
    res.review = true;
    for (let k = 0; k < 4; k++) {
      const conf = p.getByRole('button', { name: /Confirm (&|and) deploy/i }).first();
      if ((await conf.count()) && !(await conf.isDisabled())) { await conf.click(); break; }
      const off = p.getByRole('button', { name: 'Deploy off-book (untracked)', exact: true }).first();
      if (await off.count()) { await off.click(); res.offBook++; await p.waitForTimeout(400); continue; }
      break;
    }
    await p.waitForTimeout(900);
  }
  res.dialogTitleAfter = title;
  // Close a still-open Assign sheet (e.g. a group's next leg).
  if ((await p.locator('[role="dialog"]').count()) > 0 && (await p.getByText('Assign Equipment', { exact: true }).count()) > 0) {
    await p.keyboard.press('Escape');
    await p.waitForTimeout(300);
  }
  return res;
};

// Drag a status slide on a touch context; on the mouse context the slide is a button.
const slide = async (dev, label, slideLabel) => {
  const p = dev.page;
  await expandGroups(p);
  const c = card(p, label).first();
  if (!(await c.count())) throw new Error(`card "${label}" not found`);
  const s = c.locator('.fs-slide').filter({ has: p.locator('.fs-slide-label', { hasText: new RegExp(`^${esc(slideLabel)}$`) }) }).first();
  if (await s.count()) {
    const track = s.locator('.fs-slide-track');
    await track.scrollIntoViewIfNeeded();
    const b = await track.boundingBox();
    if (!b) throw new Error('slide track has no box');
    const back = ((await s.getAttribute('class')) ?? '').includes('fs-slide--stepback');
    const y = b.y + b.height / 2;
    const [x0, x1] = back ? [b.x + b.width - 8, b.x + 6] : [b.x + 8, b.x + b.width - 6];
    await p.mouse.move(x0, y);
    await p.mouse.down();
    await p.mouse.move(x1, y, { steps: 14 });
    await p.mouse.up();
    await p.waitForTimeout(800);
    return `dragged ${back ? 'back' : 'forward'}`;
  }
  // Mouse branch (ADR-034): "Slide to set X" → "Set X"; status step-back → "Back".
  const btn = /^Slide back to /.test(slideLabel) ? 'Back'
    : slideLabel.replace(/^Slide to /, '').replace(/^Slide back — /, '').replace(/^./, (m) => m.toUpperCase());
  await c.getByRole('button', { name: btn, exact: true }).click();
  await p.waitForTimeout(800);
  return `button "${btn}"`;
};

const openCommand = async (dev) => { await go(dev, '/command', 1200); };
const icName = async (dev) => text(dev.page.locator('.fs-cmd-ic-name'));
const xferState = async (dev) => texts(dev.page.locator('.fs-cmd-xfer, .fs-cmd-xfer-quiet'));
const openOrg = async (dev) => {
  const p = dev.page;
  if (dev.desktop) {
    const seg = p.locator('.fs-segment', { hasText: 'Org Chart' });
    if (await seg.count()) await seg.first().click();
  } else {
    await p.locator('.fs-cmd-entry', { hasText: 'Org Chart' }).click();
  }
  await p.waitForTimeout(600);
};
const openNode = async (dev, title) => {
  await dev.page.locator('.fs-org-node', { hasText: title }).first().click();
  await dev.page.waitForTimeout(600);
};
const openHazards = async (dev) => {
  await dev.page.locator('.fs-cmd-entry', { hasText: 'Hazards' }).first().click();
  await dev.page.waitForTimeout(600);
};
const addHazard = async (dev, location) => {
  const p = dev.page;
  await p.getByRole('button', { name: 'Add Hazard', exact: true }).first().click();
  await p.waitForTimeout(500);
  const d = topDialog(p);
  await d.getByLabel('Location', { exact: true }).fill(location);
  await d.locator('.fs-segment', { hasText: 'High' }).first().click();
  await d.getByRole('button', { name: 'Add Hazard', exact: true }).click();
  await p.waitForTimeout(700);
};
const closeAll = async (dev, n = 3) => {
  for (let i = 0; i < n; i++) {
    if (!(await dev.page.locator('[role="dialog"]').count())) return;
    await dev.page.keyboard.press('Escape');
    await dev.page.waitForTimeout(300);
  }
};
const openTransfer = async (dev) => {
  await dev.page.getByRole('button', { name: 'Transfer', exact: true }).click();
  await dev.page.waitForTimeout(600);
  return dev.page.locator('.fs-xfer');
};
const brief = async (dev) => text(dev.page.locator('.fs-201'));

// ─────────────────────────────────────────────────────────────── evidence
const evidence = async (ctx, probe, devs, ui = {}) => {
  const out = { probe, at: new Date().toISOString(), deptId: ctx.deptId, opId: ctx.opId, ui, rest: null, devices: {} };
  try { out.rest = ctx.opId ? (await opEvents(ctx)).map(liteEvent) : null; } catch (e) { out.restError = String(e.message); }
  for (const d of devs) {
    try {
      const evs = await readLog(d, ctx.deptId);
      out.devices[d.name] = { connected: await connected(d), url: d.page.url(), events: evs.filter((e) => !ctx.opId || e.opId === ctx.opId).map(liteEvent) };
    } catch (e) { out.devices[d.name] = { error: String(e.message) }; }
  }
  writeFileSync(join(EVID, `${probe}.json`), JSON.stringify(out, null, 2));
  return `evidence/${probe}.json`;
};
// Convergence gate — recorded at the start of each race probe so the adjudicator can see
// whether the race began from agreement: each device's local op event ids vs REST, the
// Alpha/Delta card status, and Dexie strut stock. (Needs the closure's ctx/ALL — bound in run.)
let gate = async () => null;
const record = (probe, status, observed) => {
  const stepSkips = lines.slice(mark).filter((l) => l.startsWith('SKIP '));
  results.push({ probe, status, stepSkips, observed, captures: currentCaptures });
  currentCaptures = [];
  mark = lines.length;
};

// ─────────────────────────────────────────────────────────────── main
const run = async () => {
  // Fresh output: drop the previous run's captures / evidence (fixtures stay).
  if (!process.env.KEEP_STATE) {
    const { readdirSync, unlinkSync } = await import('node:fs');
    for (const f of readdirSync(OUT)) if (/\.png$/.test(f) || f === 'results.json' || f === 'run-log.txt') unlinkSync(join(OUT, f));
    for (const f of readdirSync(EVID)) if (/\.(json|csv)$/.test(f)) unlinkSync(join(EVID, f));
  }
  // Clean slate (owner REST may wipe the emulator RTDB root; the Auth emulator exposes a reset).
  if (!process.env.KEEP_STATE) {
    await rest('DELETE', '');
    const r = await fetch(`${AUTH_EMU}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
    log(`OK   reset: RTDB root deleted; auth emulator accounts reset → ${r.status}`);
  }

  // Test accounts — *.test addresses + generated passwords; written to the gitignored
  // fixtures file, never printed.
  const tag = randomBytes(3).toString('hex');
  const pw = () => randomBytes(12).toString('base64url');
  const accounts = {
    A: { email: `ttx-ic-${tag}@millbrook.test`, password: pw(), displayName: 'BC R. Alvarez' },
    B: { email: `ttx-capt-${tag}@millbrook.test`, password: pw(), displayName: 'Capt. D. Brennan' },
    C: { email: `ttx-lt-${tag}@millbrook.test`, password: pw(), displayName: 'Lt. K. Chen' },
  };
  writeFileSync(join(FIX, 'accounts.json'), JSON.stringify(accounts, null, 2));
  log('OK   accounts written to fixtures/accounts.json (not printed)');

  const browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED });
  const phone = { ...devices['iPhone 13'], isMobile: true, hasTouch: true };
  delete phone.defaultBrowserType;
  const mkDev = async (name, opts, desktop = false) => {
    const ctx = await browser.newContext({ ...opts, acceptDownloads: true });
    // Prod fence — hostname-matched; HTTP and WebSocket.
    await ctx.route((u) => PROD_HOST.test(u.hostname), (route) => {
      const u = new URL(route.request().url());
      prodHits.push({ device: name, url: `${u.origin}${u.pathname}` });
      return route.abort();
    });
    await ctx.routeWebSocket((u) => PROD_HOST.test(u.hostname), (ws) => {
      const u = new URL(ws.url());
      prodHits.push({ device: name, url: `${u.origin}${u.pathname}`, websocket: true });
      ws.close();
    });
    ctx.on('response', (r) => {
      try {
        const u = new URL(r.url());
        if (EXT_HOST.test(u.hostname)) extResponses.push({ device: name, host: u.hostname, path: u.pathname, status: r.status() });
        else if (/googleapis\.com$/.test(u.hostname) && !PROD_HOST.test(u.hostname)) otherGoogle.push({ device: name, host: u.hostname, path: u.pathname, status: r.status() });
      } catch { /* non-URL */ }
    });
    let authSeen = false;
    ctx.on('request', (r) => {
      if (!authSeen && r.url().startsWith(AUTH_EMU)) { authSeen = true; const u = new URL(r.url()); log(`INFO ${name} first auth-emulator request: ${u.origin}${u.pathname}`); }
    });
    await ctx.addInitScript(() => { try { localStorage.setItem('fieldshore_entered', '1'); } catch { /* storage blocked */ } });
    const page = await ctx.newPage();
    page.setDefaultTimeout(8000);
    page.on('websocket', (ws) => {
      const u = new URL(ws.url());
      const key = `${u.host}${u.pathname}`;
      wsLog.push({ device: name, ev: 'open', key, t: Date.now() });
      ws.on('close', () => wsLog.push({ device: name, ev: 'close', key, t: Date.now() }));
    });
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navLog.push({ device: name, url: f.url(), t: Date.now() }); });
    page.on('console', (m) => { if (m.type() === 'error' && consoleErrors[name].length < 60) consoleErrors[name].push(m.text().slice(0, 240)); });
    page.on('pageerror', (e) => { if (consoleErrors[name].length < 60) consoleErrors[name].push(`pageerror: ${String(e.message).slice(0, 240)}`); });
    return { name, ctx, page, desktop, acct: accounts[name] };
  };
  const A = await mkDev('A', phone);
  const B = await mkDev('B', phone);
  const C = await mkDev('C', { viewport: { width: 1280, height: 800 } }, true);
  const ALL = [A, B, C];
  const ctx = { deptId: null, opId: null, code: null, sp: {} };
  gate = async () => {
    const restIds = new Set((await opEvents(ctx)).map((e) => e.id));
    const out = { restEventCount: restIds.size, devices: {} };
    for (const D of ALL) {
      const lev = (await readLog(D, ctx.deptId)).filter((e) => e.opId === ctx.opId).sort(compareCanonical);
      const ids = new Set(lev.map((e) => e.id));
      const o = {
        localEventCount: ids.size,
        missingVsRest: [...restIds].filter((id) => !ids.has(id)).length,
        extraVsRest: [...ids].filter((id) => !restIds.has(id)).length,
        strutStock: derivedAvailable(await readInventory(D, ctx.deptId), lev).filter((r) => r.type === 'strut').map((r) => `${r.apparatus}|${r.model}|${r.available}/${r.quantity}`).sort(),
      };
      if (D.page.url().includes('/operations')) { o.alpha = await cardStatus(D.page, 'Alpha'); o.delta = await cardStatus(D.page, 'Delta'); }
      out.devices[D.name] = o;
    }
    const stocks = ALL.map((D) => JSON.stringify(out.devices[D.name].strutStock));
    out.allInAgreement = ALL.every((D) => out.devices[D.name].missingVsRest === 0 && out.devices[D.name].extraVsRest === 0) && new Set(stocks).size === 1;
    return out;
  };

  // ════════════════════════════════ SCENE ════════════════════════════════
  currentCaptures = [];
  await step('scene: A signs up (Create Account)', () => signUp(A), [A]);
  await step('scene: A creates Millbrook Fire Department', async () => {
    const p = A.page;
    if (!/create-department/.test(p.url())) await go(A, '/create-department', 800);
    await p.getByLabel('Department name', { exact: true }).fill(DEPT_NAME);
    await p.getByRole('button', { name: 'Create department', exact: true }).click();
    await p.getByText(`${DEPT_NAME} is ready`).waitFor({ timeout: 15000 });
    const uiCode = await text(topDialog(p).locator('strong'));
    await shot(A, 'scene-dept-created');
    const codes = await until(async () => {
      const v = await rest('GET', 'orgs/inviteCodes');
      const hit = Object.entries(v ?? {}).find(([, r]) => r.deptName === DEPT_NAME);
      return hit ? { code: hit[0], ...hit[1] } : null;
    }, { timeout: 15000, label: 'invite code in RTDB' });
    ctx.code = codes.code;
    ctx.deptId = codes.deptId;
    log(`INFO dept ${ctx.deptId}; invite code via REST ${ctx.code === uiCode ? '== UI sheet code' : `!= UI sheet code (${uiCode})`}`);
    await p.getByRole('button', { name: 'Done', exact: true }).click();
    await p.waitForURL(/\/operations/, { timeout: 15000 });
    await settle(A);
  }, [A]);

  for (const D of [B, C]) {
    await step(`scene: ${D.name} signs up + joins by code`, async () => {
      if (!ctx.code) throw new Error('no invite code (dept step failed)');
      await signUp(D);
      const p = D.page;
      if (!/join-department/.test(p.url())) {
        if (/create-department/.test(p.url())) await p.getByRole('button', { name: 'Join an existing department', exact: true }).click();
        else await go(D, '/join-department', 800);
      }
      await p.getByLabel('Enter it by hand', { exact: true }).fill(ctx.code);
      await p.getByRole('button', { name: 'Join department', exact: true }).click();
      await p.getByText(`Joined ${DEPT_NAME}`).waitFor({ timeout: 15000 });
      await shot(D, 'scene-joined');
      await p.getByRole('button', { name: 'Continue', exact: true }).click();
      await p.waitForURL(/\/operations/, { timeout: 15000 });
      await settle(D);
    }, [D]);
  }
  await step('scene: sessions + member rows', async () => {
    for (const D of ALL) D.session = await readSession(D);
    const members = await rest('GET', `orgs/${ctx.deptId}/members`);
    log(`INFO sessions: ${ALL.map((D) => `${D.name}=${D.session?.identity?.kind}/${D.session?.role}/${D.session?.departmentId === ctx.deptId ? 'dept-ok' : 'dept-MISMATCH'}`).join(' ')}; members in RTDB: ${Object.keys(members ?? {}).length}`);
    for (const D of ALL) D.accountId = D.session?.identity?.accountId;
    if (Object.keys(members ?? {}).length !== 3) throw new Error(`expected 3 member rows, got ${Object.keys(members ?? {}).length}`);
  });

  // Inventory (A = Admin; the Default role can't import). A fresh dept shows only the
  // "No apparatus yet" empty state — the import trigger needs ≥1 rig — so BC-1 goes first.
  await step('scene: A adds apparatus BC-1 (unlocks the inventory data controls)', async () => {
    const p = A.page;
    await go(A, '/inventory');
    await clickFirst(p, [
      ['empty-state "Add apparatus"', p.getByRole('button', { name: 'Add apparatus', exact: true })],
      ['scope "+" (aria Add apparatus)', p.locator('.fs-inv-scope-add')],
    ], 'add apparatus');
    await p.waitForTimeout(400);
    const d = topDialog(p);
    await d.getByLabel('Apparatus name', { exact: true }).fill('BC-1');
    const typeBtn = d.getByRole('button', { name: 'Type', exact: true });
    if (await typeBtn.count()) {
      await typeBtn.click();
      await p.waitForTimeout(300);
      const chief = p.getByRole('option', { name: /Chief|Battalion|Command/i });
      if (await chief.count()) { log(`INFO BC-1 type → ${await chief.first().innerText()}`); await chief.first().click(); }
      else { log('INFO BC-1 type: no Chief/Battalion option; left default'); await p.keyboard.press('Escape'); }
      await p.waitForTimeout(300);
    }
    await d.getByRole('button', { name: 'Add', exact: true }).click();
    await p.waitForTimeout(600);
  }, [A]);

  const importCsv = async (file, tagName) => {
    const p = A.page;
    await p.getByRole('button', { name: 'Import and export inventory', exact: true }).click();
    await p.waitForTimeout(400);
    await p.locator('.fs-inv-data-row', { hasText: 'Import inventory' }).click();
    await p.waitForTimeout(500);
    await p.locator('.fs-import input[type="file"]').first().setInputFiles(file);
    await p.waitForTimeout(600);
    const steps = [];
    for (let i = 0; i < 3; i++) {
      const cont = p.locator('.fs-import-foot').getByRole('button', { name: 'Continue', exact: true });
      if (!(await cont.count())) break;
      if (await cont.isDisabled()) throw new Error(`Continue disabled at step ${i + 1}: ${await text(p.locator('.fs-import-h'))}`);
      steps.push(await text(p.locator('.fs-import-h')));
      await cont.click();
      await p.waitForTimeout(500);
    }
    steps.push(await text(p.locator('.fs-import-h')));
    const chips = await texts(p.locator('.fs-import-chips'));
    await shot(A, `${tagName}-review`);
    const btn = p.locator('.fs-import-foot').getByRole('button', { name: /^Import \d+ rows?$/ });
    const btnText = await btn.innerText();
    await btn.click();
    await p.getByText('Import complete', { exact: true }).waitFor({ timeout: 10000 });
    const sub = await text(p.locator('.fs-import-sub'));
    await shot(A, `${tagName}-done`);
    await p.locator('.fs-import-done').getByRole('button', { name: 'Done', exact: true }).click();
    await p.waitForTimeout(500);
    return { steps, chips, button: btnText, result: sub };
  };
  const exportCsv = async (name) => {
    const p = A.page;
    await p.getByRole('button', { name: 'Import and export inventory', exact: true }).click();
    await p.waitForTimeout(400);
    const [dl] = await Promise.all([
      p.waitForEvent('download', { timeout: 10000 }),
      p.locator('.fs-inv-data-row', { hasText: 'Export inventory' }).click(),
    ]);
    const path = join(EVID, name);
    await dl.saveAs(path);
    await closeAll(A, 2);
    return path;
  };
  const csvIds = (path) => {
    const rows = readFileSync(path, 'utf8').trim().split(/\r?\n/);
    const head = rows[0].split(',');
    const idCol = head.findIndex((h) => /^"?ID"?$/i.test(h.trim()));
    return { header: rows[0], count: rows.length - 1, ids: idCol < 0 ? [] : rows.slice(1).map((r) => r.split(',')[idCol]) };
  };

  let importObs = null;
  await step('scene: A imports millbrook-inventory.csv', async () => {
    importObs = await importCsv(CSV, 'scene-import');
    await shot(A, 'scene-inventory');
    log(`INFO import: ${importObs.button} → ${importObs.result}`);
  }, [A]);
  await step('scene: roster provisioned (Engine 1/2, Rescue 1)', async () => {
    const tabs = await texts(A.page.locator('.fs-inv-scope-row'));
    log(`INFO inventory rigs: ${tabs.join(' ')}`);
    await until(async () => (await restInventory(ctx)).length >= 12, { timeout: 15000, label: '12 inventory rows in RTDB' });
  }, [A]);

  // ── Probe 10: CSV round trip (import is disabled during an op → runs before Start Operation)
  currentCaptures = [];
  await step('probe 10: export → re-import → IDs and counts unchanged', async () => {
    const before = await restInventory(ctx);
    const localBefore = await readInventory(A, ctx.deptId);
    const f1 = await exportCsv('p10-export-1.csv');
    const e1 = csvIds(f1);
    const re = await importCsv(f1, 'p10-reimport');
    await sleep(3000);
    const after = await untilSoft(async () => { const v = await restInventory(ctx); return v.length >= before.length ? v : null; }, { timeout: 8000 }) ?? await restInventory(ctx);
    const localAfter = await readInventory(A, ctx.deptId);
    const f2 = await exportCsv('p10-export-2.csv');
    const e2 = csvIds(f2);
    const sameIds = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
    // Before the op there are no op events, so nothing is held and available = quantity.
    const evNow = ctx.opId ? await opEvents(ctx) : [];
    const observed = {
      sceneImport: importObs,
      export1: { rows: e1.count, header: e1.header, ids: e1.ids },
      reimport: re,
      export2: { rows: e2.count, ids: e2.ids },
      restBefore: { count: before.length, ids: before.map((r) => r.id) },
      restAfter: { count: after.length, ids: after.map((r) => r.id) },
      localBefore: localBefore.length,
      localAfter: localAfter.length,
      idsUnchangedRest: sameIds(before.map((r) => r.id), after.map((r) => r.id)),
      idsUnchangedCsv: sameIds(e1.ids, e2.ids),
      quantitiesBefore: derivedAvailable(before, evNow).map((r) => `${r.apparatus}|${r.type}|${r.model ?? r.plateId ?? r.length}|${r.quantity}/${r.available}`).sort(),
      quantitiesAfter: derivedAvailable(after, evNow).map((r) => `${r.apparatus}|${r.type}|${r.model ?? r.plateId ?? r.length}|${r.quantity}/${r.available}`).sort(),
    };
    writeFileSync(join(EVID, '10.json'), JSON.stringify({ probe: '10', at: new Date().toISOString(), ...observed, restInventoryAfter: derivedAvailable(after, evNow), localInventoryAfter: derivedAvailable(localAfter, evNow) }, null, 2));
    record('10', 'ran', { ...observed, evidence: 'evidence/10.json' });
  }, [A]);
  if (!results.find((r) => r.probe === '10')) record('10', 'skipped', { reason: 'probe step failed — see run log SKIP line' });

  begin();
  const scene = { addressField: null, points: {}, deploys: {} };
  await step('scene: A starts operation (822 Dixwell Ave typed plain)', async () => {
    const p = A.page;
    await go(A, '/operations');
    await p.getByRole('button', { name: 'Start Operation', exact: true }).first().click();
    await p.waitForTimeout(500);
    const d = topDialog(p);
    await d.getByLabel('Operation name', { exact: true }).fill(OP_NAME);
    const addr = d.getByLabel('Location / address', { exact: true });
    await addr.fill(OP_ADDR);
    await p.waitForTimeout(1500);
    scene.addressField = {
      role: await addr.getAttribute('role'),
      ariaAutocomplete: await addr.getAttribute('aria-autocomplete'),
      listboxCount: await p.locator('[role="listbox"]').count(),
      consoleErrorsSoFar: consoleErrors.A.length,
    };
    await shot(A, 'scene-start-op-address');
    await d.getByRole('button', { name: 'Start Operation', exact: true }).click();
    await p.waitForTimeout(1200);
    await closeAll(A, 1); // any first-op briefing surface
    const evs = await readLog(A, ctx.deptId);
    const created = evs.find((e) => e.type === 'OperationCreated');
    if (!created) throw new Error('no OperationCreated in A log');
    ctx.opId = created.opId;
    ctx.opCreatedId = created.id;
    log(`INFO op ${ctx.opId}; OperationCreated ${ctx.opCreatedId}; address field role=${scene.addressField.role}`);
  }, [A]);

  // 5 singles (2 assigned to rigs) + one 3-Post = 8 cards. Stock: AT 37-58 ×4 (Rescue 1),
  // AT 56-88 ×6 (E1 ×2, E2 ×2, R1 ×2), swivel6 on every rig. 3-Post auto-adds 6×6 wood (11″).
  const POINTS = [
    { label: 'Alpha', feet: 6, inches: 0, assigned: 'Engine 1' },
    { label: 'Bravo', feet: 6, inches: 6, assigned: 'Engine 2', plates: true },
    { label: 'Charlie', feet: 7, inches: 0 },
    { label: 'Delta', feet: 5, inches: 6 },
    { label: 'Echo', feet: 6, inches: 3 },
    { label: 'Foxtrot', feet: 5, inches: 6, type: '3-Post' },
  ];
  for (const pt of POINTS) {
    await step(`scene: A adds ${pt.label}${pt.type ? ` (${pt.type})` : ''}${pt.assigned ? ` → ${pt.assigned}` : ''}${pt.plates ? ' + swivel plates' : ''}`, async () => {
      scene.points[pt.label] = await addPoint(A, pt);
    }, [A]);
  }
  await step('scene: 8 cards on the board', async () => {
    const evs = await readLog(A, ctx.deptId);
    for (const e of evs.filter((x) => x.type === 'ShorePointAdded')) {
      (ctx.sp[e.shorePoint.label] ??= []).push(e.shorePoint.id);
    }
    const stacked = await A.page.locator('.fs-spc').count();
    await expandGroups(A.page);
    const n = await A.page.locator('.fs-spc').count();
    log(`INFO cards on A: ${n} (${stacked} before fanning out the 3-Post stack); spIds by label: ${Object.entries(ctx.sp).map(([k, v]) => `${k}×${v.length}`).join(' ')}`);
    if (n !== 8) throw new Error(`expected 8 cards, saw ${n}`);
  }, [A]);

  for (const lbl of ['Alpha', 'Bravo', 'Charlie']) {
    await step(`scene: A deploys ${lbl} from stock`, async () => { scene.deploys[lbl] = await deployCard(A, lbl); }, [A]);
  }
  await step('scene: A deploys the Foxtrot 3-Post legs', async () => {
    scene.deploys.Foxtrot = [];
    for (let i = 0; i < 3; i++) {
      await expandGroups(A.page);
      const pending = card(A.page, 'Foxtrot').filter({ has: A.page.getByRole('button', { name: 'Assign Equipment', exact: true }) });
      if (!(await pending.count())) break;
      scene.deploys.Foxtrot.push(await deployCard(A, 'Foxtrot'));
    }
    const st = await cardStatus(A.page, 'Foxtrot');
    if (st.some((s) => s === 'pending')) throw new Error(`Foxtrot legs still pending: ${st.join(',')}`);
  }, [A]);
  await step('scene: A slides Charlie → Strut Set', () => slide(A, 'Charlie', 'Slide to set Strut Set'), [A]);
  await step('scene: A slides Foxtrot → Strut Set → Cutting Station', async () => {
    await slide(A, 'Foxtrot', 'Slide to set Strut Set');
    await slide(A, 'Foxtrot', 'Slide to send to Cutting Station');
    log(`INFO Foxtrot legs: ${(await cardStatus(A.page, 'Foxtrot')).join(',')}`);
  }, [A]);
  await step('scene: org chart — Engine 1 → Shoring Group, Safety Officer staffed', async () => {
    await openCommand(A);
    await openOrg(A);
    await openNode(A, 'Shoring Group Supervisor');
    await A.page.locator('.fs-node-grow', { hasText: 'Change or add apparatus' }).click();
    await A.page.waitForTimeout(300);
    await A.page.locator('.fs-assign-row', { hasText: 'Engine 1' }).first().click();
    await A.page.waitForTimeout(400);
    await A.page.keyboard.press('Escape');
    await A.page.waitForTimeout(400);
    await openNode(A, 'Safety Officer');
    await A.page.locator('.fs-node-grow', { hasText: 'Change or add apparatus' }).click();
    await A.page.waitForTimeout(300);
    await A.page.getByLabel('Add individual', { exact: true }).fill('Lt. M. Okafor');
    await A.page.getByRole('button', { name: 'Add', exact: true }).click();
    await A.page.waitForTimeout(400);
    await closeAll(A, 3);
  }, [A]);
  await step('scene: captures on all three', async () => {
    await sleep(2500);
    for (const D of ALL) { await go(D, '/operations', 1500); await shot(D, 'scene-board'); }
    for (const D of ALL) { await openCommand(D); await shot(D, 'scene-command'); }
    const st = {};
    for (const D of ALL) { await go(D, '/operations', 1200); st[D.name] = {}; for (const pt of POINTS) st[D.name][pt.label] = (await cardStatus(D.page, pt.label)).join(','); }
    scene.statuses = st;
    log(`INFO scene statuses: ${JSON.stringify(st)}`);
  }, ALL);
  await step('scene: evidence', async () => { scene.evidence = await evidence(ctx, 'scene', ALL, scene); }, []);
  record('scene', 'ran', scene);

  // ════════════════════════════════ PROBE 3 — span of control ═══════════
  // Early, while A is IC by account ("Manage position" is IC-gated).
  begin();
  const p3 = { added: [], nodeBadge: {}, sheetEyebrow: {} };
  await step('probe 3: Operations node → Add position under this ×2 (6 reports)', async () => {
    await openCommand(A);
    await openOrg(A);
    for (let i = 0; i < 2; i++) {
      await openNode(A, 'Operations Section Chief');
      await A.page.locator('.fs-node-grow', { hasText: 'Add position under this' }).click();
      await A.page.waitForTimeout(400);
      const row = topDialog(A.page).locator('.fs-assign-row').first();
      p3.added.push(await text(row.locator('.fs-assign-name')));
      await row.click();
      await A.page.waitForTimeout(600);
      if (i === 1) { p3.sheetEyebrow.six = await text(topDialog(A.page)); p3.subtitle_six = await text(A.page.locator('.fs-node-subtitle')); await scrollDialogTop(A.page); await shot(A, 'p3-span6-nodesheet'); }
      await A.page.keyboard.press('Escape');
      await A.page.waitForTimeout(400);
    }
    p3.nodeBadge.sixA = await texts(A.page.locator('.fs-org-node', { hasText: 'Operations Section Chief' }).first().locator('.fs-org-badge'));
    await shot(A, 'p3-span6-chart');
  }, [A]);
  await step('probe 3: ×2 more (8 reports)', async () => {
    for (let i = 0; i < 2; i++) {
      await openNode(A, 'Operations Section Chief');
      await A.page.locator('.fs-node-grow', { hasText: 'Add position under this' }).click();
      await A.page.waitForTimeout(400);
      const row = topDialog(A.page).locator('.fs-assign-row').first();
      p3.added.push(await text(row.locator('.fs-assign-name')));
      await row.click();
      await A.page.waitForTimeout(600);
      if (i === 1) { p3.sheetEyebrow.eight = await text(topDialog(A.page)); p3.subtitle_eight = await text(A.page.locator('.fs-node-subtitle')); await scrollDialogTop(A.page); await shot(A, 'p3-span8-nodesheet'); }
      await A.page.keyboard.press('Escape');
      await A.page.waitForTimeout(400);
    }
    p3.nodeBadge.eightA = await texts(A.page.locator('.fs-org-node', { hasText: 'Operations Section Chief' }).first().locator('.fs-org-badge'));
    await shot(A, 'p3-span8-chart');
    await closeAll(A);
  }, [A]);
  await step('probe 3: same badge on B and C', async () => {
    await sleep(2500);
    for (const D of [B, C]) {
      await openCommand(D);
      await openOrg(D);
      p3.nodeBadge[`eight${D.name}`] = await texts(D.page.locator('.fs-org-node', { hasText: 'Operations Section Chief' }).first().locator('.fs-org-badge'));
      await shot(D, 'p3-span8-chart');
      await closeAll(D);
    }
    p3.evidence = await evidence(ctx, '3', ALL, p3);
  }, [B, C]);
  record('3', 'ran', p3);

  // Probe 12 runs BEFORE any offline race, so A and B tap Deploy from the same stock view
  // (run 3 showed probe 4's divergence leaking into a later probe 12).
  // ════════════════════════════════ PROBE 12 — concurrent deploy (C-1) ═══
  begin();
  const p12 = { point: 'Delta', spId: ctx.sp.Delta?.[0] };
  await step('probe 12: convergence gate (did the race start from agreement?)', async () => { for (const D of ALL) await go(D, '/operations', 1200); p12.gate = await gate(); }, ALL);
  await step('probe 12: A and B open Assign Equipment on Delta', async () => {
    p12.restInventoryBefore = (await restInventory(ctx)).filter((r) => r.type === 'strut');
    for (const D of [A, B]) {
      await go(D, '/operations', 1500);
      const c = card(D.page, 'Delta').first();
      await c.getByRole('button', { name: 'Assign Equipment', exact: true }).click();
      await D.page.waitForTimeout(800);
      await shot(D, 'p12-assign-open');
    }
  }, [A, B]);
  await step('probe 12: synchronized Deploy taps (Promise.all)', async () => {
    const r = await Promise.allSettled([commitDeploy(A), commitDeploy(B)]);
    p12.deploys = r.map((x) => (x.status === 'fulfilled' ? x.value : `rejected: ${String(x.reason?.message ?? x.reason).slice(0, 120)}`));
  }, [A, B]);
  await step('probe 12: Delta + stock + BOM source on A, B, C after sync', async () => {
    await sleep(10000);
    p12.devices = {};
    for (const D of ALL) {
      await go(D, '/operations', 1500);
      const o = { status: await cardStatus(D.page, 'Delta'), card: await text(card(D.page, 'Delta').first()) };
      await shot(D, 'p12-after-sync');
      // The card never names the source rig — read it from Quick View's Bill of materials…
      const head = card(D.page, 'Delta').first().locator('.fs-spc-head--detail');
      if (await head.count()) {
        await head.click();
        await D.page.waitForTimeout(900);
        o.quickViewBom = await text(D.page.locator('.fs-spd-section').filter({ has: D.page.locator('.fs-spd-h', { hasText: /Bill of materials/i }) }));
        await shot(D, 'p12-delta-quickview');
        await closeAll(D, 1);
      } else o.quickViewBom = 'no Quick View entry (card not deployed on this device)';
      // …and from the device's own log: which deploy events it holds, and each BOM's sources.
      const deploys = (await readLog(D, ctx.deptId)).filter((e) => e.spId === p12.spId && e.type === 'EquipmentDeployed');
      o.deployEventsHeld = deploys.map((e) => ({ id: e.id, by: e.by, seq: e.seq, sources: (e.deployedBom ?? []).map((c) => `${c.role}:${c.model ?? c.plateId ?? c.length}@${c.source}`) }));
      p12.devices[D.name] = o;
    }
    const restDeployIds = (await opEvents(ctx)).filter((e) => e.spId === p12.spId && e.type === 'EquipmentDeployed').map((e) => e.id);
    p12.deployIdsByDevice = Object.fromEntries(ALL.map((D) => [D.name, p12.devices[D.name].deployEventsHeld.map((e) => e.id)]));
    p12.restDeployIds = restDeployIds;
    p12.eachDeviceHoldsAllRestDeploys = Object.fromEntries(ALL.map((D) => [D.name, restDeployIds.every((id) => p12.deployIdsByDevice[D.name].includes(id))]));
    p12.restDeltaEvents = (await opEvents(ctx)).filter((e) => e.spId === p12.spId).map(liteEvent);
    p12.restInventoryAfter = (await restInventory(ctx)).filter((r) => r.type === 'strut');
    p12.localInventory = {};
    for (const D of ALL) p12.localInventory[D.name] = (await readInventory(D, ctx.deptId)).filter((r) => r.type === 'strut');
    p12.evidence = await evidence(ctx, '12', ALL, p12);
  }, ALL);
  record('12', 'ran', p12);

  // ════════════════════════════════ PROBE 1a — transfer to a named member, B offline ═
  begin();
  const p1a = {};
  await step('probe 1a: B goes offline', async () => {
    await openCommand(B);
    p1a.bOffline = await setNet(B, false);
    await B.page.waitForTimeout(800);
    await shot(B, 'p1a-B-offline');
  }, [B]);
  await step('probe 1a: A hands over command → member B', async () => {
    await openCommand(A);
    const x = await openTransfer(A);
    p1a.transferListA = await texts(x.locator('.fs-assign-row'));
    await x.locator('.fs-assign-row', { hasText: B.acct.displayName }).first().click();
    await shot(A, 'p1a-A-transfer-dialog');
    await x.getByRole('button', { name: 'Hand over command', exact: true }).click();
    await A.page.waitForTimeout(800);
    p1a.pendingA = await xferState(A);
    await shot(A, 'p1a-A-pending');
    const evs = await until(async () => { const e = await opEvents(ctx); return e.some((v) => v.type === 'CommandTransferInitiated') ? e : null; }, { timeout: 10000, label: 'Initiated in RTDB' });
    p1a.initiatedInRest = evs.filter((v) => v.type === 'CommandTransferInitiated').map(liteEvent);
  }, [A]);
  await step('probe 1a: C sees nothing targeted', async () => {
    await openCommand(C);
    await C.page.waitForTimeout(1500);
    p1a.stateC = await xferState(C);
    await shot(C, 'p1a-C-during-pending');
  }, [C]);
  await step('probe 1a: B (still offline) state', async () => {
    p1a.stateBOffline = await xferState(B);
    p1a.bConnectedWhileOffline = await connected(B);
  }, [B]);
  await step('probe 1a: B reconnects → "You are being given command" → Accept', async () => {
    p1a.bOnline = await setNet(B, true);
    await until(async () => (await B.page.getByText('You are being given command').count()) > 0, { timeout: 20000, label: 'incoming banner on B' });
    p1a.incomingB = await xferState(B);
    await shot(B, 'p1a-B-incoming');
    await B.page.getByRole('button', { name: 'Accept command', exact: true }).click();
    await B.page.waitForTimeout(1500);
  }, [B]);
  await step('probe 1a: IC leader on A, B, C', async () => {
    await sleep(4000);
    p1a.ic = {};
    p1a.icOrgNode = {};
    for (const D of ALL) {
      await openCommand(D);
      p1a.ic[D.name] = await icName(D);
      await shot(D, 'p1a-after-accept');
      await openOrg(D);
      p1a.icOrgNode[D.name] = await text(D.page.locator('.fs-org-node', { hasText: 'Incident Commander' }).first().locator('.fs-org-node-leader'));
      await closeAll(D);
    }
    p1a.restTransferEvents = (await opEvents(ctx)).filter((e) => /^CommandTransfer/.test(e.type)).map(liteEvent);
    await go(A, '/audit-log', 1500);
    p1a.auditLogA = (await texts(A.page.locator('main'))).join(' ').slice(0, 1500);
    await shot(A, 'p1a-audit-log');
    p1a.evidence = await evidence(ctx, '1a', ALL, p1a);
  }, ALL);
  record('1a', 'ran', p1a);

  // ════════════════════════════════ PROBE 1b — rig target + 4-digit code, then #401 ═══
  begin();
  const p1b = {};
  await step('probe 1b: B (IC) hands over → Engine 1 (code on B)', async () => {
    await openCommand(B);
    const x = await openTransfer(B);
    p1b.apparatusOnScene = await texts(x.locator('ul[aria-label="Apparatus on scene"] .fs-assign-row'));
    await x.locator('ul[aria-label="Apparatus on scene"] .fs-assign-row', { hasText: 'Engine 1' }).first().click();
    await x.getByRole('button', { name: 'Hand over command', exact: true }).click();
    await B.page.waitForTimeout(900);
    p1b.code = await text(B.page.locator('.fs-cmd-xfer-code-digits'));
    p1b.pendingB = await xferState(B);
    await shot(B, 'p1b-B-code');
    if (!/^\d{4}$/.test(p1b.code ?? '')) throw new Error(`no 4-digit code on B (${p1b.code})`);
  }, [B]);
  await step('probe 1b: C "Tap if this is you" → wrong code rejected → right code → Accept', async () => {
    await openCommand(C);
    await until(async () => (await C.page.locator('.fs-cmd-xfer-quiet--claim').count()) > 0, { timeout: 15000, label: 'claim line on C' });
    p1b.quietC = await xferState(C);
    await shot(C, 'p1b-C-quiet');
    await C.page.locator('.fs-cmd-xfer-quiet--claim').click();
    await C.page.waitForTimeout(400);
    const wrong = String((Number(p1b.code) + 1111) % 10000).padStart(4, '0');
    const field = C.page.getByLabel('Accept code', { exact: true });
    await field.fill(wrong);
    await C.page.waitForTimeout(400);
    p1b.wrongCode = {
      error: await text(C.page.locator('.fs-cmd-xfer--incoming .fs-field-msg--error')),
      acceptButtons: await C.page.getByRole('button', { name: 'Accept command', exact: true }).count(),
    };
    await shot(C, 'p1b-C-wrong-code');
    await field.fill(p1b.code);
    await C.page.waitForTimeout(400);
    await shot(C, 'p1b-C-right-code');
    await C.page.getByRole('button', { name: 'Accept command', exact: true }).click();
    await C.page.waitForTimeout(1500);
  }, [C]);
  await step('probe 1b: leader = Engine 1 on A, B, C', async () => {
    await sleep(3000);
    p1b.icAfterEngine1 = {};
    for (const D of ALL) { await openCommand(D); p1b.icAfterEngine1[D.name] = await icName(D); await shot(D, 'p1b-after-engine1'); }
  }, ALL);

  // ════════════════════════════════ PROBE 2 — brief at realistic elapsed ═══
  // While the IC is a rig, commandsIC is true on every device → the IC Command Checklist
  // (and its ICS-201 brief) and the Transfer dialog's brief are reachable on all three.
  const swapCaptures = (save) => { const c = currentCaptures; currentCaptures = save; return c; };
  const saved1b = swapCaptures([]);
  const savedMark = mark;
  mark = lines.length;
  const p2 = {};
  await step('probe 2: backdate OperationCreated by 2h41m (REST + every device IndexedDB)', async () => {
    const target = Date.now() - (2 * 3600 + 41 * 60) * 1000;
    p2.backdatedTo = target;
    // Backdating `at` must NOT change the canonical order: receivedAt wins (ADR-041). The
    // PATCH is an owner-bypass write of `at` only (no receivedAt in the body, by design);
    // the evidence sort (opEvents → compareCanonical) proves the event keeps its place.
    await rest('PATCH', `orgs/${ctx.deptId}/events/${ctx.opId}/${ctx.opCreatedId}`, { at: target });
    p2.localPatched = {};
    for (const D of ALL) p2.localPatched[D.name] = await patchLocalAt(D, ctx.deptId, ctx.opCreatedId, target);
    for (const D of ALL) await reload(D);
  }, ALL);
  const readBrief = async (D, tagName) => {
    const o = {};
    await go(D, '/operations', 1500);
    o.opsHeader = await text(D.page.locator('.fs-ops-metastrip'));
    await shot(D, `${tagName}-ops-header`);
    await openCommand(D);
    o.commandClock = await text(D.page.locator('.fs-cmd-clock'));
    o.opIndicator = await text(D.page.locator('.fs-cmd-op'));
    const tab = D.page.getByRole('button', { name: 'IC Command Checklist', exact: true });
    if (await tab.count()) {
      await tab.click();
      await D.page.waitForTimeout(700);
      o.checklistBrief = await brief(D);
      await shot(D, `${tagName}-checklist-brief`);
      await closeAll(D, 1);
    } else o.checklistBrief = 'IC Command Checklist tab not shown (not IC on this device)';
    const xferBtn = D.page.getByRole('button', { name: 'Transfer', exact: true });
    if (await xferBtn.count()) {
      await xferBtn.click();
      await D.page.waitForTimeout(700);
      o.transferBrief = await brief(D);
      await shot(D, `${tagName}-transfer-brief`);
      await D.page.locator('.fs-xfer-cancel').click().catch(() => D.page.keyboard.press('Escape'));
      await D.page.waitForTimeout(400);
    } else o.transferBrief = 'Transfer button not shown on this device';
    // Truncation check: does any brief value overflow its box?
    o.truncated = await D.page.evaluate(() => [...document.querySelectorAll('.fs-cmd-clock, .fs-201-value')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
    return o;
  };
  for (const D of ALL) await step(`probe 2: read brief + clocks on ${D.name}`, async () => { p2[D.name] = await readBrief(D, 'p2'); }, [D]);
  await step('probe 2: C-only >24h read (local patch 27h12m, then restore)', async () => {
    const target = Date.now() - (27 * 3600 + 12 * 60) * 1000;
    p2.cOver24h = { backdatedTo: target, patched: await patchLocalAt(C, ctx.deptId, ctx.opCreatedId, target) };
    await reload(C);
    Object.assign(p2.cOver24h, await readBrief(C, 'p2-over24h'));
    p2.cOver24h.restored = await patchLocalAt(C, ctx.deptId, ctx.opCreatedId, p2.backdatedTo);
    await reload(C);
    p2.cOver24h.afterRestoreClock = await (async () => { await openCommand(C); return text(C.page.locator('.fs-cmd-clock')); })();
  }, [C]);
  await step('probe 2: evidence', async () => { p2.evidence = await evidence(ctx, '2', ALL, p2); });
  record('2', 'ran', p2);
  currentCaptures = saved1b;
  mark = savedMark;

  await step('probe 1b (#401): C hands over to its own name and accepts on the same device', async () => {
    await openCommand(C);
    const x = await openTransfer(C);
    p1b.memberListC = await texts(x.locator('.fs-assign-row'));
    await C.page.getByLabel('Transfer to someone new', { exact: true }).fill(C.acct.displayName);
    await x.getByRole('button', { name: 'Hand over command', exact: true }).click();
    await C.page.waitForTimeout(900);
    p1b.selfPendingC = await xferState(C);
    await shot(C, 'p1b-C-self-pending');
    await C.page.getByRole('button', { name: `${C.acct.displayName}: Accept command`, exact: true }).click();
    await C.page.waitForTimeout(1500);
  }, [C]);
  await step('probe 1b: leader = C holder on A, B, C', async () => {
    await sleep(3000);
    p1b.icAfterSelf = {};
    for (const D of ALL) { await openCommand(D); p1b.icAfterSelf[D.name] = await icName(D); await shot(D, 'p1b-after-self'); }
    p1b.restTransferEvents = (await opEvents(ctx)).filter((e) => /^CommandTransfer/.test(e.type)).map(liteEvent);
    p1b.evidence = await evidence(ctx, '1b', ALL, p1b);
  }, ALL);
  record('1b', 'ran', p1b);

  // ════════════════════════════════ PROBE 1c — cancel (offline) vs accept (online) ═══
  begin();
  const p1c = {};
  await step('probe 1c: convergence gate (did the race start from agreement?)', async () => { for (const D of ALL) await go(D, '/operations', 1200); p1c.gate = await gate(); }, ALL);
  await step('probe 1c: A initiates → member B (online)', async () => {
    const countOf = async (t) => (await opEvents(ctx)).filter((e) => e.type === t).length;
    p1c.initiatedBefore = await countOf('CommandTransferInitiated');
    p1c.acceptedBefore = await countOf('CommandTransferAccepted');
    await openCommand(A);
    const x = await openTransfer(A);
    await x.locator('.fs-assign-row', { hasText: B.acct.displayName }).first().click();
    await x.getByRole('button', { name: 'Hand over command', exact: true }).click();
    await A.page.waitForTimeout(900);
    await until(async () => (await countOf('CommandTransferInitiated')) > p1c.initiatedBefore, { timeout: 10000, label: 'A Initiated in RTDB' });
    await openCommand(B);
    await until(async () => (await B.page.getByText('You are being given command').count()) > 0, { timeout: 15000, label: 'incoming on B' });
    await shot(A, 'p1c-A-pending');
    await shot(B, 'p1c-B-incoming');
  }, [A, B]);
  await step('probe 1c: A offline → Cancel transfer', async () => {
    p1c.aOffline = await setNet(A, false);
    await A.page.getByRole('button', { name: 'Cancel transfer', exact: true }).click();
    await A.page.waitForTimeout(800);
    p1c.stateAOfflineAfterCancel = await xferState(A);
    p1c.icAOffline = await icName(A);
    await shot(A, 'p1c-A-cancelled-offline');
    const evs = await opEvents(ctx);
    p1c.cancelInRestWhileOffline = evs.some((e) => e.type === 'CommandTransferCancelled');
  }, [A]);
  await step('probe 1c: B accepts online', async () => {
    await B.page.getByRole('button', { name: 'Accept command', exact: true }).click();
    await B.page.waitForTimeout(1200);
    await until(async () => (await opEvents(ctx)).filter((e) => e.type === 'CommandTransferAccepted').length > (p1c.acceptedBefore ?? 0), { timeout: 10000, label: 'B Accepted in RTDB' });
    p1c.icBAfterAccept = await icName(B);
    await shot(B, 'p1c-B-accepted');
  }, [B]);
  await step('probe 1c: A reconnects; one IC on all three?', async () => {
    p1c.aOnline = await setNet(A, true);
    await sleep(10000);
    p1c.ic = {};
    p1c.xfer = {};
    for (const D of ALL) { await openCommand(D); p1c.ic[D.name] = await icName(D); p1c.xfer[D.name] = await xferState(D); await shot(D, 'p1c-after-sync'); }
    p1c.restTransferEvents = (await opEvents(ctx)).filter((e) => /^CommandTransfer/.test(e.type)).map(liteEvent);
    p1c.localOrder = {};
    for (const D of ALL) p1c.localOrder[D.name] = (await readLog(D, ctx.deptId)).filter((e) => /^CommandTransfer/.test(e.type)).map((e) => `${e.seq}:${e.type.replace('CommandTransfer', '')}@${e.at}`);
    p1c.evidence = await evidence(ctx, '1c', ALL, p1c);
  }, ALL);
  record('1c', 'ran', p1c);

  // ════════════════════════════════ PROBE 4 — opposite status moves ═══
  begin();
  const p4 = { point: 'Alpha', spId: ctx.sp.Alpha?.[0] };
  await step('probe 4: convergence gate (did the race start from agreement?)', async () => { for (const D of ALL) await go(D, '/operations', 1200); p4.gate = await gate(); }, ALL);
  await step('probe 4: Alpha at Equipment Assigned on A and B', async () => {
    for (const D of [A, B]) await go(D, '/operations', 1500);
    p4.before = { A: await cardStatus(A.page, 'Alpha'), B: await cardStatus(B.page, 'Alpha') };
    if (p4.before.A[0] !== 'process' || p4.before.B[0] !== 'process') throw new Error(`Alpha not at process: ${JSON.stringify(p4.before)}`);
  }, [A, B]);
  await step('probe 4: A offline slides Alpha → Strut Set', async () => {
    p4.aOffline = await setNet(A, false);
    p4.slideA = await slide(A, 'Alpha', 'Slide to set Strut Set');
    p4.aLocal = await cardStatus(A.page, 'Alpha');
    await shot(A, 'p4-A-offline-strutset');
    const localEv = (await readLog(A, ctx.deptId)).filter((e) => e.spId === p4.spId && e.type === 'ShorePointStatusChanged').pop();
    p4.aEventId = localEv?.id ?? null;
    p4.aEventInRestWhileOffline = (await opEvents(ctx)).some((e) => e.id === p4.aEventId);
  }, [A]);
  await step('probe 4: B online moves Alpha back to Pending (Return & Step Back)', async () => {
    p4.slideB = await slide(B, 'Alpha', 'Slide back to Pending Equipment');
    await B.page.waitForTimeout(600);
    p4.confirmTitle = await text(topDialog(B.page).locator('h2').first()).catch(() => null);
    await shot(B, 'p4-B-confirm');
    await clickFirst(B.page, [
      ['Return & Step Back', B.page.getByRole('button', { name: 'Return & Step Back', exact: true })],
      ['Return All & Step Back', B.page.getByRole('button', { name: 'Return All & Step Back', exact: true })],
    ], 'step-back confirm');
    await B.page.waitForTimeout(1200);
    p4.bLocal = await cardStatus(B.page, 'Alpha');
    await shot(B, 'p4-B-pending');
  }, [B]);
  await step('probe 4: A reconnects; Alpha status on A, B, C', async () => {
    p4.aOnline = await setNet(A, true);
    await sleep(10000);
    p4.after = {};
    for (const D of ALL) { await go(D, '/operations', 1500); p4.after[D.name] = await cardStatus(D.page, 'Alpha'); await shot(D, 'p4-after-sync'); }
    p4.restAlphaEvents = (await opEvents(ctx)).filter((e) => e.spId === p4.spId).map(liteEvent);
    p4.localAlphaEvents = {};
    for (const D of ALL) p4.localAlphaEvents[D.name] = (await readLog(D, ctx.deptId)).filter((e) => e.spId === p4.spId).map((e) => `${e.seq}:${e.type}${e.to ? `→${e.to}` : ''}@${e.at}`);
    p4.evidence = await evidence(ctx, '4', ALL, p4);
  }, ALL);
  record('4', 'ran', p4);

  // ════════════════════════════════ PROBE 6 — concurrent hazards offline ═══
  begin();
  const p6 = {};
  await step('probe 6: convergence gate (did the race start from agreement?)', async () => { for (const D of ALL) await go(D, '/operations', 1200); p6.gate = await gate(); }, ALL);
  await step('probe 6: A and B offline; each adds a HIGH hazard', async () => {
    for (const D of [A, B]) await openCommand(D);
    p6.aOffline = await setNet(A, false);
    p6.bOffline = await setNet(B, false);
    await openHazards(A);
    await addHazard(A, '1'); // bare Division number → should also flag Division 1's cards
    await shot(A, 'p6-A-offline-hazard');
    await closeAll(A);
    await openHazards(B);
    await addHazard(B, 'Div 1 rear wall lean');
    await shot(B, 'p6-B-offline-hazard');
    await closeAll(B);
    p6.inRestWhileOffline = (await opEvents(ctx)).filter((e) => e.type === 'HazardLogged').length;
  }, [A, B]);
  await step('probe 6: both reconnect; chips, rows and card badges on A, B, C', async () => {
    p6.aOnline = await setNet(A, true);
    p6.bOnline = await setNet(B, true);
    await sleep(10000);
    p6.devices = {};
    for (const D of ALL) {
      const o = {};
      await openCommand(D);
      o.commandChip = await text(D.page.locator('.fs-ichip--hazard'));
      o.entryChip = await text(D.page.locator('.fs-cmd-entry-chip'));
      await shot(D, 'p6-command');
      await openHazards(D);
      o.openRows = await D.page.locator('section[aria-label="Open hazards"] .fs-haz-row').count();
      o.rows = await texts(D.page.locator('.fs-haz-row'));
      await shot(D, 'p6-hazard-log');
      await closeAll(D);
      await go(D, '/operations', 1500);
      o.opsChip = await text(D.page.locator('.fs-ichip--hazard'));
      o.cardHazardBadges = await D.page.locator('.fs-spc-hazard').count();
      await shot(D, 'p6-board');
      p6.devices[D.name] = o;
    }
    p6.restHazards = (await opEvents(ctx)).filter((e) => /^Hazard/.test(e.type)).map(liteEvent);
    p6.evidence = await evidence(ctx, '6', ALL, p6);
  }, ALL);
  record('6', 'ran', p6);

  // ════════════════════════════════ PROBE 5/11 — Quick View cold read on C ═══
  begin();
  const p5 = {};
  const quickView = async (label, tagName) => {
    const c = card(C.page, label).first();
    await c.locator('.fs-spc-head--detail').click();
    await C.page.waitForTimeout(900);
    const root = C.page.locator('.fs-spd').first();
    const o = {
      slotLabels: await texts(root.locator('.fs-rec-slot-label')),
      slotNames: await texts(root.locator('.fs-rec-slot-name')),
      notRecorded: await root.locator('.fs-rec-ns').count(),
      sections: await texts(root.locator('.fs-spd-h')),
      text: (await text(root))?.slice(0, 1600),
    };
    await shot(C, tagName);
    await closeAll(C, 1);
    return o;
  };
  await step('probe 5/11: C cold-reads Quick View (Charlie: no connectors; Bravo: swivel plates; a Foxtrot leg)', async () => {
    await go(C, '/operations', 1500);
    p5.icPill = await texts(C.page.locator('.fs-ops-pill'));
    await shot(C, 'p5-board');
    p5.Charlie = await quickView('Charlie', 'p5-quickview-charlie-noconnectors');
    p5.Bravo = await quickView('Bravo', 'p5-quickview-bravo-connectors');
    p5.Foxtrot = await quickView('Foxtrot', 'p5-quickview-foxtrot-leg');
    await openCommand(C);
    p5.icCommand = await icName(C);
    p5.evidence = await evidence(ctx, '5-11', ALL, p5);
  }, [C]);
  record('5/11', 'ran', p5);

  // ════════════════════════════════ PROBE 9 — feedback (emulator half) ═══
  begin();
  const p9 = {};
  await step('probe 9: B → Settings → Help & Reference → Send feedback', async () => {
    await go(B, '/settings/help', 1200);
    await B.page.getByRole('button', { name: /Send feedback/ }).first().click();
    await B.page.waitForTimeout(500);
    const d = topDialog(B.page);
    await d.getByLabel("What's on your mind?", { exact: true }).fill('TTX #262 test — ignore (emulator run)');
    await d.getByRole('button', { name: 'Send feedback', exact: true }).click();
    await B.page.getByText('Thanks — your feedback was sent.').waitFor({ timeout: 10000 });
    p9.confirmation = 'Thanks — your feedback was sent.';
    await shot(B, 'p9-feedback-sent');
    const fb = await until(async () => { const v = await rest('GET', 'feedback'); return v && Object.keys(v).length ? v : null; }, { timeout: 10000, label: '/feedback entry' });
    p9.restFeedback = Object.values(fb).map((r) => ({ category: r.category, text: r.text, deptName: r.deptName, appVersion: r.appVersion, hasTimestamp: r.timestamp != null }));
    writeFileSync(join(EVID, '9.json'), JSON.stringify({ probe: '9', at: new Date().toISOString(), ...p9 }, null, 2));
    p9.evidence = 'evidence/9.json';
  }, [B]);
  record('9', 'ran', { ...p9, betaHalf: 'not run here — main loop runs it on the beta in Alex\'s signed-in pane' });

  // ════════════════════════════════ PROBES 7 / 8 (recorded, not run here) ═══
  currentCaptures = [];
  record('7', 'skipped', { reason: 'N/A — broadcast wall-board (C-13) never built; deferred past v4.0 (#496)' });
  // ════════════════════════════════ LATE RE-CHECK — slow vs permanent divergence ═══
  // Every race probe read its devices ~10 s after reconnect. Re-read all of them from a
  // fresh reload well after the last write, so a divergence that persists is not a timing artifact.
  begin();
  const late = { waitedMs: 30000 };
  await step('late re-check: reload A, B, C after 30 s idle; re-read IC, Alpha, Delta, hazards', async () => {
    await sleep(30000);
    late.devices = {};
    for (const D of ALL) {
      const o = {};
      await openCommand(D);
      o.ic = await icName(D);
      o.xfer = await xferState(D);
      o.hazardChip = await text(D.page.locator('.fs-cmd-entry-chip'));
      await shot(D, 'late-command');
      await go(D, '/operations', 1500);
      o.alpha = await cardStatus(D.page, 'Alpha');
      o.delta = await cardStatus(D.page, 'Delta');
      o.cardHazardBadges = await D.page.locator('.fs-spc-hazard').count();
      const lateEv = (await readLog(D, ctx.deptId)).filter((e) => e.opId === ctx.opId).sort(compareCanonical);
      o.strutStock = derivedAvailable(await readInventory(D, ctx.deptId), lateEv).filter((r) => r.type === 'strut').map((r) => `${r.apparatus}|${r.model}|${r.available}/${r.quantity}`);
      o.localEventCount = (await readLog(D, ctx.deptId)).filter((e) => e.opId === ctx.opId).length;
      await shot(D, 'late-board');
      late.devices[D.name] = o;
    }
    late.restEventCount = (await opEvents(ctx)).length;
    late.evidence = await evidence(ctx, 'late-recheck', ALL, late);
  }, ALL);
  record('late-recheck', 'ran', late);

  record('8', 'skipped', { reason: 'beta half runs in the main loop (Places on the beta, Alex\'s signed-in pane)', localAddressField: scene.addressField, consoleErrorsA: consoleErrors.A.filter((m) => /places|maps|google/i.test(m)) });

  await browser.close();
  return { ctx };
};

let fatal = null;
try { await run(); } catch (e) { fatal = e; log(`FATAL ${e?.stack ?? e}`); }

const skipLines = lines.filter((l) => l.startsWith('SKIP '));
const summary = {
  finishedAt: new Date().toISOString(),
  base: BASE,
  namespace: NS,
  steps: { ok: lines.filter((l) => l.startsWith('OK ')).length, skip: skipLines.length },
  skips: skipLines,
  prodFence: { hits: prodHits.length, detail: prodHits },
  externalDependencies: extResponses,
  otherGoogleApis: otherGoogle,
  websockets: wsLog,
  navigations: navLog,
  consoleErrors,
  notes,
  fatal: fatal ? String(fatal.message ?? fatal) : null,
};
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ summary, probes: results }, null, 2));
writeFileSync(join(OUT, 'run-log.txt'), `${lines.join('\n')}\n`);
console.log(`\n== ${summary.steps.ok} OK, ${summary.steps.skip} SKIP, prod-fence hits ${prodHits.length}, probes recorded ${results.length}`);
process.exit(fatal ? 1 : 0);
