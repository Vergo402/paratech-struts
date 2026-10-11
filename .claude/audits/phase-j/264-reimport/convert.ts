// Phase J gate #264 - v3 -> v4 inventory converter (fresh-start re-import).
//
// Turns a v3 FieldShore Firebase export (project paratech-c3ab4) into v4's OWN 10-column
// inventory CSV, serialised by the REAL toCsv() and self-checked with the REAL parseCsv()
// (src/data/inventory/excel.ts) - so the file is proven loadable by the importer's own code
// before Alex ever opens the app. The importer itself is untouched.
//
// Run from the repo root (cwd matters for vite-node's config + alias pickup):
//   npx vite-node .claude/audits/phase-j/264-reimport/convert.ts <input.json> \
//       [--dept hfd217] [--apparatus <file>] [--out <csv>] [--summary <json>]
//
// Input shapes (detected by keys):
//   (a) full dump          root.departments[dept] = { inventory, apparatus, ... }
//   (b) a department node  { inventory, apparatus, ... }
//   (c) a bare inventory map { pushKey: record, ... }  -> needs --apparatus <file> (a bare
//       apparatus map, a department node, or a full dump); for (a)/(b) --apparatus overrides.
//
// Defaults: --dept hfd217 · --out <this folder>/<dept>-inventory.csv ·
//           --summary <this folder>/evidence/convert.json
//
// Exit codes: 0 = CSV written (self-check passed) · 1 = REFUSED (self-check failed; NO CSV
// written, any older CSV already at --out is moved to <out>.refused so it cannot be mistaken for
// this run's output, and an ok:false summary is written to --summary) · 2 = usage / unreadable
// input (nothing written or moved).
//
// Summary `lossless` = true only when nothing was skipped except zero-quantity lines. Any other
// skip (unknown-type, bad-quantity, unknown-apparatus, bad-record) is a LOSS: the run still exits
// 0 with a loud WARNING and `lossless: false` - compare.py is the gate that turns that into a diff.
//
// The v3 -> v4 mapping (v3 record = { type, model, quantity, available, apparatus, system?,
// length?, plateId?, _meta? }, apparatus = PUSH-ID of apparatus[id].name):
//   - id and apparatusId are ALWAYS blank in the CSV. v3 push-ids start with '-', a
//     spreadsheet formula trigger; the importer mints fresh ids and resolves rigs by name.
//   - type is lower-cased; anything but strut|extension|plate is SKIPPED ('unknown-type').
//   - quantity must be a non-negative integer (number or digit-string) else SKIPPED
//     ('bad-quantity'); 0 is SKIPPED ('zero-quantity'). v3 `available` is NEVER exported
//     (v4 derives it, ADR-041); when available < quantity a NOTE records the units out.
//   - rig name = apparatus[v3.apparatus].name trimmed; unresolvable -> SKIPPED
//     ('unknown-apparatus').
//   - strut: model trimmed; system comes from the STRUTS catalog (catalog wins). A differing
//     v3 `system` is a NOTE. A model the catalog doesn't know is still emitted with no system
//     so the REAL importer flags it -> REFUSED.
//   - extension: length = integer v3 length; system = v3 system normalised
//     (AcmeThread|Grey|Gray -> AcmeThread, LongShore|Gold -> LongShore, LockStroke), else
//     left blank so the importer flags it -> REFUSED. v3 model is dropped.
//   - plate: plateId (trimmed) only; v3 length/system/model are dropped.
// Skips and notes never refuse; any importer-flagged row (or other self-check failure) does.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { toCsv, parseCsv, parseRecords, CSV_HEADERS } from '../../../../src/data/inventory/excel';
import { STRUTS, BASE_PLATES } from '../../../../src/core/load';
import type { InventoryItem } from '../../../../src/core/schema';

type System = NonNullable<InventoryItem['system']>;
type Kind = InventoryItem['type'];
type Json = Record<string, unknown>;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEP = '\u0001'; // cell-join separator for signatures (never appears in the data)

// ---- small helpers ----------------------------------------------------------------------

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const sha256 = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

function usage(msg?: string): never {
  if (msg) console.error(`convert: ${msg}`);
  console.error(
    'usage: npx vite-node .claude/audits/phase-j/264-reimport/convert.ts <input.json> ' +
      '[--dept hfd217] [--apparatus <file>] [--out <csv>] [--summary <json>]',
  );
  process.exit(2);
}

/** Repo-relative when under cwd, else ~-relative when under $HOME, else absolute. */
function display(p: string): string {
  const abs = path.resolve(p);
  const rel = path.relative(process.cwd(), abs);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel;
  const home = homedir();
  return abs === home || abs.startsWith(home + path.sep) ? '~' + abs.slice(home.length) : abs;
}

function readJson(file: string, label: string): { json: unknown; buf: Buffer } {
  let buf: Buffer;
  try {
    buf = readFileSync(file);
  } catch (e) {
    return usage(`cannot read ${label} ${display(file)}: ${(e as Error).message}`);
  }
  try {
    return { json: JSON.parse(buf.toString('utf8')), buf };
  } catch (e) {
    return usage(`${label} ${display(file)} is not valid JSON: ${(e as Error).message}`);
  }
}

/** Non-negative integer from a number or a digit-only string; else null. */
function parseCount(v: unknown): number | null {
  if (typeof v === 'number') return Number.isSafeInteger(v) && v >= 0 ? v : null;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
    const n = Number(v.trim());
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

/** v3 system spelling -> v4 System; undefined when blank or unrecognised. */
function normSystem(raw: unknown): System | undefined {
  const t = str(raw).trim().toLowerCase();
  if (t === 'acmethread' || t === 'grey' || t === 'gray') return 'AcmeThread';
  if (t === 'longshore' || t === 'gold') return 'LongShore';
  if (t === 'lockstroke') return 'LockStroke';
  return undefined;
}

/** Quoted JSON string with every non-printable / non-ASCII char shown as \uXXXX (NBSP etc. stay visible). */
const visible = (s: string): string =>
  JSON.stringify(s).replace(/[^\x20-\x7E]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

const SYSTEM_LABEL: Record<System, string> = { AcmeThread: 'Grey', LongShore: 'Gold', LockStroke: 'LockStroke' };

// Total order on the pre-sort: by code point (never localeCompare), length as a number.
const cmp = <T extends string | number>(a: T, b: T) => (a < b ? -1 : a > b ? 1 : 0);

// ---- arguments --------------------------------------------------------------------------

let values: { dept?: string; apparatus?: string; out?: string; summary?: string; help?: boolean };
let positionals: string[];
try {
  ({ values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    strict: true,
    options: {
      dept: { type: 'string' },
      apparatus: { type: 'string' },
      out: { type: 'string' },
      summary: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  }));
} catch (e) {
  usage((e as Error).message);
}
if (values.help) usage();
if (positionals.length !== 1) usage(positionals.length === 0 ? 'missing <input.json>' : 'expected exactly one <input.json>');

const inputPath = path.resolve(positionals[0]);
const dept = values.dept ?? 'hfd217';
if (!/^[A-Za-z0-9_-]+$/.test(dept)) usage(`--dept "${dept}" is not a plain department id`);
const outPath = path.resolve(values.out ?? path.join(HERE, `${dept}-inventory.csv`));
const summaryPath = path.resolve(values.summary ?? path.join(HERE, 'evidence', 'convert.json'));

// ---- locate inventory + apparatus -------------------------------------------------------

const { json: root, buf: inputBuf } = readJson(inputPath, 'input');
if (!isObj(root)) usage('input root is not a JSON object');

let shape: string;
let inventory: Json;
let apparatus: Json | undefined;

if (isObj(root.departments)) {
  const node = root.departments[dept];
  if (!isObj(node)) usage(`department "${dept}" not found under .departments (has: ${Object.keys(root.departments).join(', ') || 'none'})`);
  if (!isObj(node.inventory)) usage(`.departments.${dept}.inventory is missing or not an object`);
  shape = `full dump (.departments.${dept})`;
  inventory = node.inventory;
  apparatus = isObj(node.apparatus) ? node.apparatus : undefined;
} else if (isObj(root.inventory)) {
  shape = 'department node';
  inventory = root.inventory;
  apparatus = isObj(root.apparatus) ? root.apparatus : undefined;
} else {
  shape = 'bare inventory map';
  inventory = root;
}

if (values.apparatus) {
  const { json: a } = readJson(path.resolve(values.apparatus), '--apparatus file');
  if (!isObj(a)) usage('--apparatus file root is not a JSON object');
  const fromDump = isObj(a.departments) && isObj(a.departments[dept]) ? (a.departments[dept] as Json).apparatus : undefined;
  apparatus = isObj(fromDump) ? fromDump : isObj(a.apparatus) ? a.apparatus : a;
}
if (!apparatus) usage(`no apparatus map in a ${shape} - pass --apparatus <file>`);
if (shape === 'bare inventory map' && Object.keys(inventory).length > 0 && !Object.values(inventory).every(isObj)) {
  usage('input is neither a full dump, a department node, nor a bare inventory map of records');
}

// ---- map v3 records -> InventoryItem ----------------------------------------------------

interface Mapped {
  key: string; // v3 push-key (terminal diagnostics + sort tiebreak only - never exported)
  item: InventoryItem;
  appId: string;
  kind: string; // human label for notes
  notes: string[];
  deployed: number;
}

const mapped: Mapped[] = [];
const skipped: { key: string; reason: string }[] = [];
const hygieneSeen = new Set<string>(); // raw rig names already flagged (one note per distinct name)

for (const key of Object.keys(inventory)) {
  const r = inventory[key];
  if (!isObj(r)) {
    skipped.push({ key, reason: 'bad-record' });
    continue;
  }
  const type = str(r.type).trim().toLowerCase();
  if (type !== 'strut' && type !== 'extension' && type !== 'plate') {
    skipped.push({ key, reason: 'unknown-type' });
    continue;
  }
  const quantity = parseCount(r.quantity);
  if (quantity === null) {
    skipped.push({ key, reason: 'bad-quantity' });
    continue;
  }
  if (quantity === 0) {
    skipped.push({ key, reason: 'zero-quantity' });
    continue;
  }
  const appId = str(r.apparatus);
  const appRec = appId && has(apparatus, appId) ? apparatus[appId] : undefined;
  const rigRaw = isObj(appRec) ? str(appRec.name) : '';
  const rig = rigRaw.trim();
  if (!rig) {
    skipped.push({ key, reason: 'unknown-apparatus' });
    continue;
  }

  const notes: string[] = [];
  if (rig !== rigRaw) notes.push(`rig name "${rigRaw}" trimmed to "${rig}"`);
  // The importer resolves rigs by NAME against the live v4 roster: anything but plain single-spaced
  // printable ASCII (checked on the raw name, before trim) is a byte-for-byte mismatch waiting to happen.
  if ((!/^[\x20-\x7E]*$/.test(rigRaw) || rigRaw.includes('  ') || rigRaw !== rigRaw.trim()) && !hygieneSeen.has(rigRaw)) {
    hygieneSeen.add(rigRaw);
    notes.push(`rig name ${visible(rigRaw)} is not plain single-spaced ASCII \u2014 must match the v4 roster byte-for-byte`);
  }
  const item: InventoryItem = { id: '', type, apparatus: rig, apparatusId: '', quantity };
  let kind: string;

  if (type === 'strut') {
    const rawModel = str(r.model);
    const model = rawModel.trim();
    const strut = STRUTS.find((s) => s.model === model);
    item.model = model;
    if (strut) item.system = strut.system; // catalog wins; unknown model -> no system, importer flags it
    kind = model || '(no model)';
    if (model !== rawModel) notes.push(`${rig} ${kind}: model "${rawModel}" trimmed`);
    const v3sys = str(r.system).trim();
    if (strut && v3sys && normSystem(v3sys) !== strut.system) {
      notes.push(`${rig} ${kind}: v3 system "${v3sys}" differs from catalog ${strut.system} (catalog wins)`);
    }
  } else if (type === 'extension') {
    const len = parseCount(r.length);
    if (len !== null) item.length = len; // 0 passes through on purpose - the importer flags it
    const sys = normSystem(r.system);
    if (sys) item.system = sys;
    kind = `${sys ? SYSTEM_LABEL[sys] : 'unknown-system'} extension ${len ?? '?'}"`;
  } else {
    const plateId = str(r.plateId).trim();
    if (plateId) item.plateId = plateId;
    kind = `plate ${BASE_PLATES.find((p) => p.id === plateId)?.name ?? (plateId || '(no plateId)')}`;
  }

  let deployed = 0;
  if (r.available !== undefined) {
    const avail = parseCount(r.available);
    if (avail === null) notes.push(`${rig} ${kind}: v3 available ${JSON.stringify(r.available)} is not a usable count (not exported)`);
    else if (avail < quantity) {
      deployed = quantity - avail;
      notes.push(`${deployed} unit${deployed === 1 ? '' : 's'} deployed on ${rig} ${kind}`);
    } else if (avail > quantity) notes.push(`${rig} ${kind}: v3 available ${avail} exceeds quantity ${quantity} (not exported)`);
  }
  mapped.push({ key, item, appId, kind, notes, deployed });
}

// Deterministic pre-sort -> toCsv's stable sort then yields a byte-identical file on re-run.
mapped.sort(
  (a, b) =>
    cmp(a.item.apparatus, b.item.apparatus) ||
    cmp(a.item.type, b.item.type) ||
    cmp(a.item.model ?? '', b.item.model ?? '') ||
    cmp(a.item.system ?? '', b.item.system ?? '') ||
    cmp(a.item.length ?? -1, b.item.length ?? -1) ||
    cmp(a.item.plateId ?? '', b.item.plateId ?? '') ||
    cmp(a.key, b.key),
);

const items = mapped.map((m) => m.item);
const notes = mapped.flatMap((m) => m.notes);
const deployedUnits = mapped.reduce((n, m) => n + m.deployed, 0);

// Informational integrity notes (never refuse): duplicate (rig, kind) lines, same-name rigs.
const kindSig = (i: InventoryItem) => [i.apparatus, i.type, i.model ?? '', i.system ?? '', i.length ?? '', i.plateId ?? ''].join(SEP);
const kindCount = new Map<string, Mapped[]>();
for (const m of mapped) kindCount.set(kindSig(m.item), [...(kindCount.get(kindSig(m.item)) ?? []), m]);
for (const group of kindCount.values()) {
  if (group.length > 1) {
    notes.push(`${group.length} v3 lines for the same ${group[0].item.apparatus} ${group[0].kind} - exported as separate lines, NOT merged`);
  }
}
const idsByName = new Map<string, Set<string>>();
for (const m of mapped) idsByName.set(m.item.apparatus, (idsByName.get(m.item.apparatus) ?? new Set()).add(m.appId));
for (const [name, ids] of idsByName) {
  if (ids.size > 1) notes.push(`${ids.size} distinct v3 apparatus share the name "${name}" - the importer resolves rigs by name, so they will merge`);
}

// ---- serialise with the REAL toCsv, self-check with the REAL parseCsv --------------------

const csv = toCsv(items);
const parsed = parseCsv(csv);
const { records } = parseRecords(csv);
const failures: string[] = [];

if (items.length === 0) failures.push('no mappable inventory lines - nothing to export');
if (parsed.warnings.length !== 0) failures.push(`the importer flagged ${parsed.warnings.length} row(s)`);
if (parsed.rows.length !== items.length) failures.push(`importer accepted ${parsed.rows.length} row(s), expected ${items.length}`);
const sumItems = items.reduce((n, i) => n + i.quantity, 0);
const sumRows = parsed.rows.reduce((n, r) => n + r.quantity, 0);
if (sumRows !== sumItems) failures.push(`importer quantity total ${sumRows} != mapped quantity total ${sumItems}`);
if (parsed.rows.some((r) => r.id !== '' || r.apparatusId !== '')) failures.push('a row carries a non-blank ID or Apparatus ID');
if (JSON.stringify(records[0]) !== JSON.stringify([...CSV_HEADERS])) failures.push(`header row is not the 10 CSV_HEADERS: ${JSON.stringify(records[0])}`);
const badWidth = records.slice(1).filter((r) => r.length !== CSV_HEADERS.length).length;
if (badWidth) failures.push(`${badWidth} data row(s) do not have ${CSV_HEADERS.length} cells`);
// Formula-trigger hygiene: no raw data cell may start with - (v3 push-ids) or any other trigger.
const triggerCells = records.slice(1).flatMap((r) => r.filter((c) => /^[=+\-@\t\r]/.test(c)));
if (triggerCells.length) failures.push(`${triggerCells.length} data cell(s) start with a spreadsheet formula trigger (= + - @)`);
// Content round trip: what the importer would load == what we meant to export, row for row.
const contentSig = (x: { apparatus: string; type: Kind; model?: string; system?: System; length?: number; plateId?: string; quantity: number }) =>
  [x.apparatus, x.type, x.model ?? '', x.system ?? '', x.length ?? '', x.plateId ?? '', x.quantity].join(SEP);
const tally = new Map<string, number>();
for (const i of items) tally.set(contentSig(i), (tally.get(contentSig(i)) ?? 0) + 1);
for (const r of parsed.rows) tally.set(contentSig(r), (tally.get(contentSig(r)) ?? 0) - 1);
const drift = [...tally.entries()].filter(([, n]) => n !== 0);
if (drift.length) failures.push(`${drift.length} line(s) differ between what was mapped and what the importer reads back`);

const inputInfo = {
  path: display(inputPath),
  bytes: inputBuf.length,
  mtime: statSync(inputPath).mtime.toISOString(),
  sha256: sha256(inputBuf),
};

if (failures.length) {
  console.log(`convert: ${display(inputPath)} (${shape}, dept ${dept})`);
  console.log(`  mapped ${items.length} line(s), skipped ${skipped.length}`);
  console.log('');
  console.log('Self-check FAILED:');
  for (const f of failures) console.log(`  - ${f}`);
  if (parsed.warnings.length) {
    console.log('');
    console.log('Importer warnings (verbatim):');
    for (const w of parsed.warnings) console.log(`  ${w}`);
    // Trace each flagged row back to its v3 key(s): the single-item CSV row has the same cells.
    const bySig = new Map<string, string[]>();
    for (const m of mapped) {
      const cells = parseRecords(toCsv([m.item])).records[1] ?? [];
      bySig.set(cells.join(SEP), [...(bySig.get(cells.join(SEP)) ?? []), m.key]);
    }
    console.log('');
    console.log('Flagged rows traced to v3 keys:');
    for (const o of parsed.outcomes.filter((x) => x.error)) {
      console.log(`  line ${o.line}: v3 key(s) ${(bySig.get(o.cells.join(SEP)) ?? ['?']).join(', ')} - cells ${JSON.stringify(o.cells)}`);
    }
  }
  if (skipped.length) {
    console.log('');
    console.log(`Skipped (${skipped.length}): ${skipped.map((s) => `${s.key}=${s.reason}`).join(', ')}`);
  }
  // A refusal must never leave a stale good CSV (or an ok:true summary) behind: move any older CSV
  // at --out aside (overwriting an older .refused) and overwrite the summary with ok:false.
  let movedAside: string | null = null;
  if (existsSync(outPath)) {
    movedAside = `${outPath}.refused`;
    rmSync(movedAside, { force: true });
    renameSync(outPath, movedAside);
  }
  const refusal = {
    ok: false,
    generatedAt: new Date().toISOString(),
    dept,
    input: inputInfo,
    failures: [...failures, ...parsed.warnings], // self-check failures, then the importer warnings verbatim
    skipped,
    notes,
    olderCsvMovedTo: movedAside ? display(movedAside) : null,
  };
  mkdirSync(path.dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, JSON.stringify(refusal, null, 2) + '\n');
  console.log('');
  console.log(
    movedAside
      ? `NOTE: an older ${display(outPath)} existed - moved to ${display(movedAside)} so it cannot be mistaken for this run.`
      : `NOTE: no older CSV existed at ${display(outPath)}.`,
  );
  console.log(`REFUSED - no CSV written; ok:false summary written to ${display(summaryPath)}.`);
  process.exit(1);
}

// ---- write + report ---------------------------------------------------------------------

const csvBuf = Buffer.from(csv, 'utf8');
const byType: Record<Kind, { lines: number; units: number }> = {
  strut: { lines: 0, units: 0 },
  extension: { lines: 0, units: 0 },
  plate: { lines: 0, units: 0 },
};
const rigTotals = new Map<string, { lines: number; units: number }>();
for (const i of items) {
  byType[i.type].lines++;
  byType[i.type].units += i.quantity;
  const t = rigTotals.get(i.apparatus) ?? { lines: 0, units: 0 };
  t.lines++;
  t.units += i.quantity;
  rigTotals.set(i.apparatus, t);
}
const byRig: Record<string, { lines: number; units: number }> = {};
for (const name of [...rigTotals.keys()].sort(cmp)) byRig[name] = rigTotals.get(name)!;

// Lossless = nothing skipped except zero-quantity lines (0 units - nothing to import). Any other
// skip drops real inventory from the CSV.
const lossySkips = skipped.filter((s) => s.reason !== 'zero-quantity');
const lossless = lossySkips.length === 0;

const summary = {
  ok: true,
  generatedAt: new Date().toISOString(),
  dept,
  input: inputInfo,
  lines: items.length,
  units: sumItems,
  byType,
  byRig,
  skipped,
  lossless,
  notes,
  deployedUnits,
  csv: { path: display(outPath), bytes: csvBuf.length, rows: parsed.rows.length, sha256: sha256(csvBuf) },
};

mkdirSync(path.dirname(outPath), { recursive: true });
mkdirSync(path.dirname(summaryPath), { recursive: true });
writeFileSync(outPath, csvBuf);
writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');

console.log(`convert: ${summary.input.path} (${shape}, dept ${dept})`);
console.log(`  input   ${summary.input.bytes} bytes  sha256 ${summary.input.sha256}`);
console.log(`  lines ${summary.lines}   units ${summary.units}   deployed in v3 (not exported) ${deployedUnits}`);
for (const k of ['strut', 'extension', 'plate'] as const) {
  console.log(`  ${k.padEnd(10)} ${String(byType[k].lines).padStart(3)} lines  ${String(byType[k].units).padStart(4)} units`);
}
console.log('  by rig:');
for (const [name, t] of Object.entries(byRig)) {
  console.log(`    ${JSON.stringify(name).padEnd(14)} ${String(t.lines).padStart(3)} lines  ${String(t.units).padStart(4)} units`);
}
console.log(`  skipped ${skipped.length}${skipped.length ? ': ' + skipped.map((s) => `${s.key}=${s.reason}`).join(', ') : ''}`);
console.log(`  notes ${notes.length}${notes.length ? ':' : ''}`);
for (const n of notes) console.log(`    - ${n}`);
console.log(`  csv     ${summary.csv.path}  ${summary.csv.bytes} bytes  ${summary.csv.rows} rows`);
console.log(`          sha256 ${summary.csv.sha256}`);
console.log(`  summary ${display(summaryPath)}`);
if (!lossless) {
  const byReason = new Map<string, number>();
  for (const s of lossySkips) byReason.set(s.reason, (byReason.get(s.reason) ?? 0) + 1);
  console.log(
    `WARNING - ${lossySkips.length} source rows SKIPPED (not lossless): ${[...byReason].map(([r, n]) => `${r} x${n}`).join(', ')}`,
  );
  console.log('OK with skips - self-check passed on the rows that were written');
} else {
  console.log('OK - self-check passed: importer read back every row, 0 warnings.');
}
