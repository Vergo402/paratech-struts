#!/usr/bin/env node
// FieldShore — Strut Algorithm Smoke Deck (Node.js)
//
// Locks in v3.5.2 (ACME load-table corrections) and v3.7.2 (conservative-floor
// interpolation) wins. Five fixed cases. Exits 0 on all pass, non-zero on any
// fail. Wire into the release checklist:
//
//   node scripts/smoke-deck.js && echo "smoke deck OK"
//
// See v3-release-v3.11.2-blocker-hotfix.md for derivation rationale and the
// matching browser surface at smoke-deck.html.

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Five fixed cases. Keep in sync with smoke-deck.html.
const CASES = [
  { id: 1, name: 'ACME 11 ft @ 4:1',          system: 'AcmeThread', length: 132, sfIndex: 2, expected: 3932,  locks: 'v3.5.2 fix to 11-ft over-reporting' },
  { id: 2, name: 'ACME 2 ft @ 2:1',           system: 'AcmeThread', length: 24,  sfIndex: 0, expected: 40000, locks: 'v3.5.2 fix to 2-ft over-reporting' },
  { id: 3, name: 'LongShore 13 ft @ 4:1',     system: 'LongShore',  length: 156, sfIndex: 2, expected: 7000,  locks: 'LongShore 13-ft explicit row' },
  { id: 4, name: 'LongShore 16 ft @ 3:1',     system: 'LongShore',  length: 192, sfIndex: 1, expected: 4000,  locks: 'LongShore rated-maximum boundary' },
  { id: 5, name: 'ACME 100" (8.33 ft) @ 4:1', system: 'AcmeThread', length: 100, sfIndex: 2, expected: 9138,  locks: 'v3.7.2 conservative-floor interpolation (108" row, not interp)' },
];

// Minimal browser-shim. app.js touches `document`, `localStorage`,
// `navigator`, `firebase`, `window`. We stub just enough that the file
// loads without throwing; the smoke deck only needs pure functions
// (getLoadCapacity) afterward.
function makeShim() {
  const stubEl = {
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    style: {},
    appendChild() {}, removeChild() {}, addEventListener() {}, removeEventListener() {},
    querySelector() { return stubEl; }, querySelectorAll() { return []; },
    getElementsByTagName() { return []; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    focus() {}, blur() {}, click() {},
    innerHTML: '', textContent: '', value: '',
    children: [], childNodes: [], dataset: {},
  };
  const doc = {
    getElementById: () => stubEl,
    querySelector: () => stubEl,
    querySelectorAll: () => [],
    createElement: () => Object.assign({}, stubEl, { innerHTML: '', children: [] }),
    documentElement: stubEl,
    body: stubEl,
    head: stubEl,
    addEventListener() {}, removeEventListener() {},
    visibilityState: 'visible',
  };
  const storage = (() => {
    const store = new Map();
    return {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      get length() { return store.size; },
      key: (i) => Array.from(store.keys())[i] || null,
    };
  })();
  const firebaseStub = {
    initializeApp: () => ({}),
    database: () => ({ ref: () => ({ on() {}, off() {}, once: () => Promise.resolve({ val: () => null, exists: () => false }), child: function () { return this; }, push: () => ({ key: 'k', set: () => Promise.resolve() }), set: () => Promise.resolve(), update: () => Promise.resolve(), remove: () => Promise.resolve(), transaction: () => Promise.resolve({ committed: true, snapshot: { val: () => null } }), orderByChild: function () { return this; }, equalTo: function () { return this; }, toString: () => '' }) }),
    auth: () => ({ onAuthStateChanged: (cb) => cb(null), signInAnonymously: () => Promise.resolve({ user: { uid: 'smoke', getIdToken: () => Promise.resolve('') } }), currentUser: null }),
  };
  const sandbox = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    queueMicrotask,
    Promise, Date, Math, JSON, Number, String, Object, Array, Boolean, RegExp, Error, TypeError, Set, Map, Symbol,
    document: doc,
    window: null, // assigned below to be self-referential
    navigator: { onLine: true, userAgent: 'smoke-deck-node', serviceWorker: { register: () => Promise.resolve(), getRegistrations: () => Promise.resolve([]) } },
    location: { href: 'http://smoke/', pathname: '/', reload() {}, replace() {} },
    localStorage: storage,
    sessionStorage: storage,
    firebase: firebaseStub,
    XLSX: undefined,
    fetch: () => Promise.reject(new Error('fetch stubbed in smoke deck')),
    caches: { keys: () => Promise.resolve([]), delete: () => Promise.resolve(false), open: () => Promise.resolve({ put() {}, match() { return Promise.resolve(null); } }) },
    URL, URLSearchParams,
    btoa: (s) => Buffer.from(String(s), 'binary').toString('base64'),
    atob: (s) => Buffer.from(String(s), 'base64').toString('binary'),
  };
  sandbox.window = sandbox; // self-reference like a real browser global
  sandbox.globalThis = sandbox;
  return sandbox;
}

function loadAppJs(sandbox) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  vm.createContext(sandbox);
  try {
    vm.runInContext(src, sandbox, { filename: 'app.js' });
  } catch (e) {
    // Some non-critical runtime errors may fire during the load (e.g. listeners
    // that try to talk to the stub Firebase). The pure-function exports we need
    // are defined as `function` declarations and will be hoisted into the
    // sandbox before any of those run, so we tolerate a single throw and
    // proceed. If the throw was in the constants block, the cases will fail
    // and the script will exit non-zero — which is the right outcome.
    console.error('[smoke-deck] non-fatal during app.js load:', e.message);
  }
  return sandbox;
}

function run() {
  const sandbox = loadAppJs(makeShim());
  const getLoadCapacity = sandbox.getLoadCapacity;
  if (typeof getLoadCapacity !== 'function') {
    console.error('FAIL: getLoadCapacity not found in app.js — algorithm may have been renamed or moved');
    process.exit(2);
  }
  let passCount = 0;
  for (const c of CASES) {
    let actual;
    try {
      actual = getLoadCapacity(c.system, c.length, c.sfIndex);
    } catch (e) {
      console.error(`✗ Case ${c.id} (${c.name}) THREW: ${e.message}`);
      continue;
    }
    if (actual === c.expected) {
      console.log(`✓ Case ${c.id} (${c.name}): ${actual} lbs — ${c.locks}`);
      passCount++;
    } else {
      console.error(`✗ Case ${c.id} (${c.name}): expected ${c.expected}, got ${actual} — ${c.locks}`);
    }
  }
  const total = CASES.length;
  if (passCount === total) {
    console.log(`\n✓ ${passCount}/${total} cases passed — strut algorithm matches expected datasheet values.`);
    process.exit(0);
  }
  console.error(`\n✗ ${total - passCount} of ${total} cases FAILED — investigate before releasing.`);
  process.exit(1);
}

run();
