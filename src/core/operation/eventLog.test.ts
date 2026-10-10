import { describe, it, expect } from 'vitest';
import {
  NO_DEDUCTIONS,
  type DeployedComponent,
  type FieldShoreEvent,
  type OrgResourceRef,
  type ShorePoint,
  type ShorePointStatus,
} from '../schema';
import { currentIC } from '../org';
import {
  canonicalKey,
  compareCanonical,
  sortCanonical,
  createEventLog,
  foldWithOutcomes,
  resolveLifecycle,
  type EventLog,
} from './eventLog';
import { EMPTY_OPERATION_STATE } from './reducer';

// ── Local factories (fixture style of reducer.test.ts / transfer.test.ts) ──────────────
const OP = 'op1';
const IC_DEV = 'dev-a';
let n = 0;
const mk = (over: { opId?: string; at?: number; by?: string; receivedAt?: number; batchId?: string; id?: string } = {}) => ({
  id: over.id ?? `e${String(n++).padStart(4, '0')}`,
  opId: over.opId ?? OP,
  at: over.at ?? 1,
  by: over.by ?? IC_DEV,
  ...(over.receivedAt === undefined ? {} : { receivedAt: over.receivedAt }),
  ...(over.batchId === undefined ? {} : { batchId: over.batchId }),
});
type Meta = Parameters<typeof mk>[0];

const created = (m: Meta = {}): FieldShoreEvent => ({ type: 'OperationCreated', ...mk(m), name: `Op ${m.opId ?? OP}`, multiBuilding: false });
const ended = (m: Meta = {}): FieldShoreEvent => ({ type: 'OperationEnded', ...mk(m) });
const reopened = (m: Meta = {}): FieldShoreEvent => ({ type: 'OperationReopened', ...mk(m) });
const edited = (name: string, m: Meta = {}): FieldShoreEvent => ({ type: 'OperationEdited', ...mk(m), name });
const division = (d: number, m: Meta = {}): FieldShoreEvent => ({ type: 'DivisionAdded', ...mk(m), division: d });
function added(spId: string, m: Meta = {}): FieldShoreEvent {
  const shorePoint: ShorePoint = {
    id: spId,
    opId: m.opId ?? OP,
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 40 * 8,
    deductions: NO_DEDUCTIONS,
    status: 'pending',
  };
  return { type: 'ShorePointAdded', ...mk(m), shorePoint };
}
const strut = (inventoryId: string): DeployedComponent => ({ role: 'strut', model: 'LS 203', source: 'Rescue 1', inventoryId });
const deploy = (spId: string, inv: string, m: Meta = {}): FieldShoreEvent => ({
  type: 'EquipmentDeployed',
  ...mk(m),
  spId,
  deployedBom: [strut(inv)],
});
const returned = (spId: string, m: Meta = {}): FieldShoreEvent => ({ type: 'EquipmentReturned', ...mk(m), spId });
const status = (spId: string, from: ShorePointStatus, to: ShorePointStatus, m: Meta = {}): FieldShoreEvent => ({
  type: 'ShorePointStatusChanged',
  ...mk(m),
  spId,
  from,
  to,
});
const hardDelete = (spId: string, m: Meta = {}): FieldShoreEvent => ({ type: 'ShorePointDeleted', ...mk(m), spId, hard: true });

const INCOMING: OrgResourceRef = { ref: 'device', value: 'dev-b', label: 'Tablet B' };
const initiate = (m: Meta = {}): FieldShoreEvent => ({ type: 'CommandTransferInitiated', ...mk(m), toResource: INCOMING });
const accept = (transferId: string, m: Meta = {}): FieldShoreEvent => ({
  type: 'CommandTransferAccepted',
  ...mk({ by: 'dev-b', ...m }),
  transferId,
});
const cancel = (transferId: string, m: Meta = {}): FieldShoreEvent => ({ type: 'CommandTransferCancelled', ...mk(m), transferId });

const stamp = (e: FieldShoreEvent, receivedAt: number): FieldShoreEvent => ({ ...e, receivedAt });
const unstamp = (e: FieldShoreEvent): FieldShoreEvent => {
  const copy = { ...e };
  delete copy.receivedAt;
  return copy;
};

function logOf(events: FieldShoreEvent[]): EventLog {
  const log = createEventLog();
  log.rebuild(events);
  return log;
}

// Deterministic PRNG for the order-independence sweep.
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0x100000000;
  };
}
function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Canonical order ──────────────────────────────────────────────────────────────────
describe('canonical order', () => {
  it('canonicalKey is [receivedAt ?? +Infinity, at, id]', () => {
    expect(canonicalKey(division(2, { id: 'x', at: 5, receivedAt: 9 }))).toEqual([9, 5, 'x']);
    expect(canonicalKey(division(2, { id: 'y', at: 5 }))).toEqual([Number.POSITIVE_INFINITY, 5, 'y']);
  });

  it('is a total order: receivedAt, then at, then id; provisional after every received event', () => {
    const r1 = division(2, { id: 'b', at: 50, receivedAt: 10 });
    const r2 = division(2, { id: 'a', at: 40, receivedAt: 20 }); // smaller at, later receipt
    const r3a = division(2, { id: 'a', at: 30, receivedAt: 30 });
    const r3b = division(2, { id: 'b', at: 30, receivedAt: 30 }); // equal receivedAt+at → id
    const r4 = division(2, { id: 'z', at: 10, receivedAt: 30 }); // equal receivedAt → smaller at first
    const p1 = division(2, { id: 'p', at: 1 }); // provisional with the smallest at
    const p2a = division(2, { id: 'q', at: 2 });
    const p2b = division(2, { id: 'r', at: 2 }); // two provisional, equal at → id
    const want = [r1, r2, r4, r3a, r3b, p1, p2a, p2b];
    for (let seed = 1; seed <= 20; seed++) expect(sortCanonical(shuffle(want, rng(seed)))).toEqual(want);
  });

  it('two provisional events never compare as NaN/0 and never equal distinct ids', () => {
    const a = division(2, { id: 'a', at: 7 });
    const b = division(2, { id: 'b', at: 7 });
    expect(compareCanonical(a, b)).toBe(-1);
    expect(compareCanonical(b, a)).toBe(1);
    expect(compareCanonical(a, a)).toBe(0);
  });

  it('ids compare by code unit, not locale (uppercase before lowercase)', () => {
    expect(compareCanonical(division(2, { id: 'Z', at: 1, receivedAt: 1 }), division(2, { id: 'a', at: 1, receivedAt: 1 }))).toBe(-1);
  });

  it('sortCanonical does not mutate its input', () => {
    const input = [division(2, { at: 2 }), division(3, { at: 1 })];
    const copy = [...input];
    sortCanonical(input);
    expect(input).toEqual(copy);
  });
});

// ── Basic log behaviour ──────────────────────────────────────────────────────────────
describe('createEventLog — basics', () => {
  it('insert dedupes by id against the log and within the call', () => {
    const log = createEventLog();
    const c = created({ receivedAt: 1 });
    const d = division(2, { receivedAt: 2 });
    expect(log.insert([c, d, d]).inserted).toEqual([c, d]);
    expect(log.insert([d, stamp(d, 99)]).inserted).toEqual([]); // known id — never replaced by insert
    expect(log.get(d.id)!.receivedAt).toBe(2);
    expect(log.sortedEvents()).toEqual([c, d]);
    expect(log.has(c.id)).toBe(true);
  });

  it('active() is EMPTY_OPERATION_STATE on an empty log', () => {
    expect(createEventLog().active()).toBe(EMPTY_OPERATION_STATE);
    expect(createEventLog().activeOpId()).toBeNull();
  });

  it('snapshots are replaced, never mutated, on change', () => {
    const log = logOf([created({ receivedAt: 1 })]);
    const o1 = log.outcomes();
    const s1 = log.opStates();
    expect(log.outcomes()).toBe(o1); // cached while unchanged
    const h1 = log.held();
    expect(log.insert([log.get(log.sortedEvents()[0]!.id)!]).inserted).toEqual([]); // re-delivery
    expect(log.outcomes()).toBe(o1); // a duplicate-only insert changes no reference
    expect(log.opStates()).toBe(s1);
    expect(log.held()).toBe(h1);
    log.insert([division(2, { receivedAt: 2 })]);
    expect(log.outcomes()).not.toBe(o1);
    expect(o1.size).toBe(1);
    expect(log.opStates()).not.toBe(s1);
  });

  it('provisional events fold after every received one, whatever their at', () => {
    const log = createEventLog();
    log.insert([created({ at: 1, receivedAt: 1 })]);
    log.insert([edited('Mine', { at: 2 })]); // provisional
    log.insert([edited('Peer', { at: 100, receivedAt: 5 })]); // received, later at
    expect(log.active().operation?.name).toBe('Mine'); // the provisional tail is last
  });
});

// ── Two-tier fold ────────────────────────────────────────────────────────────────────
describe('two-tier fold', () => {
  it('a received insert past the last received key folds incrementally (no re-fold)', () => {
    const log = logOf([created({ receivedAt: 1 }), edited('A', { at: 2, receivedAt: 2 })]);
    const r = log.insert([edited('B', { at: 3, receivedAt: 3 })]);
    expect(r.refoldedOps).toEqual([]);
    expect(r.touchedOps).toEqual([OP]);
    expect(log.active().operation?.name).toBe('B');
  });

  it('a late arrival (key < last received key) re-folds the received tier', () => {
    const c = created({ receivedAt: 1 });
    const a = edited('A', { at: 1, receivedAt: 10 });
    const late = edited('B', { at: 2, receivedAt: 5 }); // reached the cloud before A
    const log = logOf([c, a]);
    const r = log.insert([late]);
    expect(r.refoldedOps).toEqual([OP]);
    expect(log.active().operation?.name).toBe('A'); // canonical last-write-wins, not arrival order
    expect(log.active()).toEqual(logOf([c, late, a]).active());
  });

  it('setReceivedAt moving a provisional event BEFORE a folded received one re-folds and flips outcomes', () => {
    const c = created({ receivedAt: 1 });
    const mine = division(2, { at: 2 }); // provisional
    const peer = division(2, { at: 3, receivedAt: 5 });
    const log = logOf([c, mine, peer]);
    // Canonical now: c, peer(5), mine(∞) → the peer's add applies, mine is redundant.
    expect(log.outcomes().get(peer.id)).toBe('applied');
    expect(log.outcomes().get(mine.id)).toBe('no-effect');

    expect(log.setReceivedAt(mine.id, 3)).toBe(true); // lands before peer(5) → re-fold
    expect(log.outcomes().get(mine.id)).toBe('applied');
    expect(log.outcomes().get(peer.id)).toBe('no-effect');
    expect([...log.lastFlipped()].sort()).toEqual([mine.id, peer.id].sort());
    expect(log.get(mine.id)!.receivedAt).toBe(3);
    expect(log.sortedEvents().map((e) => e.id)).toEqual([c.id, mine.id, peer.id]);
    expect(log.active()).toEqual(logOf([c, stamp(mine, 3), peer]).active());
  });

  it('setReceivedAt past the last received key moves tail → received incrementally', () => {
    const c = created({ receivedAt: 1 });
    const mine = division(2, { at: 2 });
    const log = logOf([c, mine]);
    expect(log.setReceivedAt(mine.id, 7)).toBe(false);
    expect(log.get(mine.id)!.receivedAt).toBe(7);
    expect(log.outcomes().get(mine.id)).toBe('applied');
    expect(log.active().operation?.divisions).toEqual([1, 2]);
    expect(log.setReceivedAt(mine.id, 7)).toBe(false); // unchanged stamp — no-op
    expect(log.setReceivedAt('nope', 7)).toBe(false); // unknown id
  });

  it('a corrected stamp on an already-received event re-sorts and re-folds', () => {
    const c = created({ receivedAt: 1 });
    const a = edited('A', { at: 2, receivedAt: 2 });
    const b = edited('B', { at: 3, receivedAt: 3 });
    const log = logOf([c, a, b]);
    expect(log.setReceivedAt(a.id, 4)).toBe(true);
    expect(log.active().operation?.name).toBe('A');
  });

  it('the fold is op-scoped: a peer event of another op never touches the active state', () => {
    const log = logOf([created({ receivedAt: 1 }), added('a', { receivedAt: 2 })]);
    const before = log.active();
    log.insert([added('x', { opId: 'other', receivedAt: 3 })]);
    expect(log.active()).toBe(before);
    expect(log.opState('other')?.shorePoints.map((s) => s.id)).toEqual(['x']);
  });
});

// ── TTX probes (#262 report F1/F2) ───────────────────────────────────────────────────
describe('probe 1c — transfer cancel (offline) vs accept (online)', () => {
  const setup = () => {
    const c = created({ at: 1, receivedAt: 1 });
    const init = initiate({ at: 2, receivedAt: 2 });
    const cxl = cancel(init.id, { at: 3 }); // A, offline: provisional
    const acc = accept(init.id, { at: 4, receivedAt: 4 }); // B, online: reached the cloud first
    return { c, init, cxl, acc };
  };

  it('the received Accept wins; IC = incoming', () => {
    const { c, init, cxl, acc } = setup();
    const log = createEventLog();
    log.insert([c, init]);
    log.insert([cxl]);
    expect(log.active().commandTransfer).toBeNull(); // locally cancelled for now
    log.insert([acc]);
    expect(currentIC(log.active().positions)).toEqual(INCOMING);
    expect(log.active().commandTransfer).toBeNull();
    expect(log.outcomes().get(acc.id)).toBe('applied');
  });

  // Relies on the ADR-041 reducer contract (same reference on a no-effect fold).
  it('the provisional Cancel reads no-effect and is reported as flipped', () => {
    const { c, init, cxl, acc } = setup();
    const log = createEventLog();
    log.insert([c, init]);
    log.insert([cxl]);
    expect(log.outcomes().get(cxl.id)).toBe('applied');
    const r = log.insert([acc]);
    expect(log.outcomes().get(cxl.id)).toBe('no-effect');
    expect(r.flipped).toContain(cxl.id);
  });

  it('identical final state to inserting [Init, Accept, Cancel] in one call, and to every arrival order', () => {
    const { c, init, cxl, acc } = setup();
    const ref = createEventLog();
    ref.insert([c, init, acc, cxl]);
    const orders = [
      [[c, init], [cxl], [acc]],
      [[c, init], [acc], [cxl]],
      [[c], [cxl], [init], [acc]],
      [[acc, cxl, init, c]],
    ];
    for (const chunks of orders) {
      const log = createEventLog();
      for (const ch of chunks) log.insert(ch);
      expect(log.active()).toEqual(ref.active());
      expect(log.outcomes()).toEqual(ref.outcomes());
    }
  });
});

describe('probe 4 — opposite status moves (offline Strut Set vs online return)', () => {
  const setup = () => {
    const c = created({ at: 1, receivedAt: 1 });
    const add = added('alpha', { at: 2, receivedAt: 2 });
    const dep = deploy('alpha', 'inv-1', { at: 3, receivedAt: 3 });
    const set = status('alpha', 'process', 'strutset', { at: 5 }); // A offline: provisional
    const ret = returned('alpha', { at: 4, receivedAt: 6 }); // B online: received
    return { c, add, dep, set, ret };
  };

  it('the received return wins: point pending, nothing held', () => {
    const { c, add, dep, set, ret } = setup();
    const log = createEventLog();
    log.insert([c, add, dep]);
    log.insert([set]);
    expect(log.active().shorePoints[0]!.status).toBe('strutset');
    expect(log.held()).toEqual({ 'inv-1': 1 });
    log.insert([ret]);
    expect(log.active().shorePoints[0]!.status).toBe('pending');
    expect(log.active().shorePoints[0]!.deployedBom).toBeUndefined();
    expect(log.held()).toEqual({});
  });

  // Relies on the ADR-041 reducer contract (same reference on a no-effect fold).
  it('the provisional Strut Set reads no-effect', () => {
    const { c, add, dep, set, ret } = setup();
    const log = logOf([c, add, dep, set, ret]);
    expect(log.outcomes().get(set.id)).toBe('no-effect');
    expect(log.outcomes().get(ret.id)).toBe('applied');
  });

  it('both insertion orders agree', () => {
    const { c, add, dep, set, ret } = setup();
    const a = createEventLog();
    a.insert([c, add, dep]);
    a.insert([set]);
    a.insert([ret]);
    const b = createEventLog();
    b.insert([c, add, dep]);
    b.insert([ret]);
    b.insert([set]);
    expect(a.active()).toEqual(b.active());
    expect(a.outcomes()).toEqual(b.outcomes());
    expect(a.held()).toEqual(b.held());
  });
});

// ── Batch-atomic fold ────────────────────────────────────────────────────────────────
describe('batch-atomic fold', () => {
  it('a batch with one no-effect member is no-effect as a whole (state untouched)', () => {
    const c = created({ receivedAt: 1 });
    const x = added('x', { at: 2, receivedAt: 2, batchId: 'B' });
    const dup = division(1, { at: 3, receivedAt: 2, batchId: 'B' }); // division 1 already exists
    const log = logOf([c, x, dup]);
    expect(log.active().shorePoints).toEqual([]);
    expect(log.outcomes().get(x.id)).toBe('no-effect');
    expect(log.outcomes().get(dup.id)).toBe('no-effect');
  });

  it('a batch whose every member applies applies all', () => {
    const c = created({ receivedAt: 1 });
    const x = added('x', { at: 2, receivedAt: 2, batchId: 'B' });
    const y = added('y', { at: 3, receivedAt: 2, batchId: 'B' });
    const log = logOf([c, x, y]);
    expect(log.active().shorePoints.map((s) => s.id)).toEqual(['x', 'y']);
    expect(log.outcomes().get(x.id)).toBe('applied');
  });

  it('a batch folds at its LAST present member (an interleaved event folds first)', () => {
    const c = created({ receivedAt: 1 });
    const m1 = edited('Batch', { at: 2, receivedAt: 2, batchId: 'B' });
    const mid = edited('Mid', { at: 3, receivedAt: 3 });
    const m2 = division(2, { at: 4, receivedAt: 4, batchId: 'B' });
    const log = logOf([c, m1, mid, m2]);
    expect(log.active().operation?.name).toBe('Batch'); // the batch landed after Mid
    expect(log.active().operation?.divisions).toEqual([1, 2]);
  });

  it('a half-stamped batch stays in the provisional tier until its last member is stamped', () => {
    const c = created({ receivedAt: 1 });
    const x = added('x', { at: 2, batchId: 'B' });
    const y = added('y', { at: 3, batchId: 'B' });
    const log = logOf([c, x, y]);
    expect(log.active().shorePoints.map((s) => s.id)).toEqual(['x', 'y']);
    log.setReceivedAt(x.id, 5);
    expect(log.active().shorePoints.map((s) => s.id)).toEqual(['x', 'y']);
    expect(log.setReceivedAt(y.id, 5)).toBe(false); // group folds incrementally at its last member
    expect(log.active()).toEqual(logOf([c, stamp(x, 5), stamp(y, 5)]).active());
    expect(log.outcomes().get(y.id)).toBe('applied');
  });

  it('a late member of an already-folded batch re-folds the op', () => {
    const c = created({ receivedAt: 1 });
    const x = added('x', { at: 2, receivedAt: 2, batchId: 'B' });
    const y = added('y', { at: 3, receivedAt: 2, batchId: 'B' });
    const log = logOf([c, x]);
    const r = log.insert([y]);
    expect(r.refoldedOps).toEqual([OP]);
    expect(log.active()).toEqual(logOf([c, x, y]).active());
  });

  // Relies on the reducer's delete-holder guard (a hard delete of a holder is a same-reference no-op).
  it('restructure-shaped batch — one deleted point holds equipment → everything no-effect, no phantom legs', () => {
    const c = created({ at: 1, receivedAt: 1 });
    const pre = [added('a', { at: 2, receivedAt: 2 }), added('b', { at: 3, receivedAt: 3 }), added('c', { at: 4, receivedAt: 4 })];
    const dep = deploy('b', 'inv-1', { at: 5, receivedAt: 5 });
    const batch = [
      hardDelete('a', { at: 10, receivedAt: 20, batchId: 'R' }),
      hardDelete('b', { at: 11, receivedAt: 20, batchId: 'R' }),
      hardDelete('c', { at: 12, receivedAt: 20, batchId: 'R' }),
      added('d', { at: 13, receivedAt: 20, batchId: 'R' }),
      added('e', { at: 14, receivedAt: 20, batchId: 'R' }),
    ];
    const log = logOf([c, ...pre, dep, ...batch]);
    expect(log.active().shorePoints.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    for (const e of batch) expect(log.outcomes().get(e.id)).toBe('no-effect');
    expect(log.held()).toEqual({ 'inv-1': 1 });
  });

  it('restructure-shaped batch with no holder applies whole', () => {
    const c = created({ at: 1, receivedAt: 1 });
    const pre = [added('a', { at: 2, receivedAt: 2 }), added('b', { at: 3, receivedAt: 3 })];
    const batch = [
      hardDelete('a', { at: 10, receivedAt: 20, batchId: 'R' }),
      hardDelete('b', { at: 11, receivedAt: 20, batchId: 'R' }),
      added('d', { at: 13, receivedAt: 20, batchId: 'R' }),
    ];
    const log = logOf([c, ...pre, ...batch]);
    expect(log.active().shorePoints.map((s) => s.id)).toEqual(['d']);
    for (const e of batch) expect(log.outcomes().get(e.id)).toBe('applied');
  });
});

// ── Active-op rule ───────────────────────────────────────────────────────────────────
describe('active op', () => {
  it('the EARLIEST un-ended create wins; a later create is no-effect and keeps its own state', () => {
    const c1 = created({ opId: 'op1', at: 5, receivedAt: 1 });
    const c2 = created({ opId: 'op2', at: 1, receivedAt: 2 });
    const p2 = added('z', { opId: 'op2', receivedAt: 3 });
    const log = logOf([c2, p2, c1]);
    expect(log.activeOpId()).toBe('op1');
    expect(log.outcomes().get(c2.id)).toBe('no-effect');
    expect(log.outcomes().get(c1.id)).toBe('applied');
    expect(log.opState('op2')?.shorePoints.map((s) => s.id)).toEqual(['z']); // drill-in state exists
  });

  it('a late-arriving earlier create flips the race and both ops’ outcomes', () => {
    const c1 = created({ opId: 'op1', receivedAt: 5 });
    const c2 = created({ opId: 'op2', receivedAt: 3 });
    const log = logOf([c1]);
    expect(log.activeOpId()).toBe('op1');
    const r = log.insert([c2]);
    expect(log.activeOpId()).toBe('op2');
    expect(log.outcomes().get(c1.id)).toBe('no-effect');
    expect(r.flipped).toEqual([c1.id]);
    expect(r.refoldedOps).toContain('op1');
  });

  it('stamping a provisional create ahead of the winner flips the race through setReceivedAt', () => {
    const c1 = created({ opId: 'op1', receivedAt: 5 });
    const c2 = created({ opId: 'op2', at: 1 }); // provisional: loses for now
    const p1 = added('a', { opId: 'op1', receivedAt: 6 });
    const log = logOf([c1, p1, c2]);
    expect(log.activeOpId()).toBe('op1');
    expect(log.outcomes().get(c2.id)).toBe('no-effect');
    log.setReceivedAt(c2.id, 3); // the cloud says op2 was created first
    expect(log.activeOpId()).toBe('op2');
    expect(log.outcomes().get(c1.id)).toBe('no-effect');
    expect(log.outcomes().get(c2.id)).toBe('applied');
    expect([...log.lastFlipped()].sort()).toEqual([c1.id, c2.id].sort());
    expect(log.opState('op1')?.shorePoints.map((s) => s.id)).toEqual(['a']); // loser keeps its state
    expect(log.active()).toEqual(logOf([c1, p1, stamp(c2, 3)]).active());
  });

  it('the loser is not resurrected when the winner ends', () => {
    const log = logOf([
      created({ opId: 'op1', receivedAt: 1 }),
      created({ opId: 'op2', receivedAt: 2 }),
      ended({ opId: 'op1', receivedAt: 3 }),
    ]);
    expect(log.activeOpId()).toBeNull();
    expect(log.active()).toBe(EMPTY_OPERATION_STATE);
  });

  it('a reopen that lost the race is skipped: no-effect and the op stays ended', () => {
    const r1 = reopened({ opId: 'op1', receivedAt: 5 });
    const log = logOf([
      created({ opId: 'op1', receivedAt: 1 }),
      ended({ opId: 'op1', receivedAt: 2 }),
      created({ opId: 'op2', receivedAt: 3 }),
      r1,
    ]);
    expect(log.activeOpId()).toBe('op2');
    expect(log.outcomes().get(r1.id)).toBe('no-effect');
    expect(log.opState('op1')?.operation?.status).toBe('ended');
  });

  it('an ended-then-reopened op becomes active again when nothing else is', () => {
    const log = logOf([
      created({ opId: 'op1', receivedAt: 1 }),
      ended({ opId: 'op1', receivedAt: 2 }),
      reopened({ opId: 'op1', receivedAt: 3 }),
    ]);
    expect(log.activeOpId()).toBe('op1');
    expect(log.active().operation?.status).toBe('active');
  });

  it('resolveLifecycle matches the log', () => {
    const evs = sortCanonical([
      created({ opId: 'op1', receivedAt: 1 }),
      created({ opId: 'op2', receivedAt: 2 }),
    ]);
    const life = resolveLifecycle(evs);
    expect(life.activeOpId).toBe('op1');
    expect([...life.lostCreated]).toEqual([evs[1]!.id]);
  });
});

// ── foldWithOutcomes (cold reads) ────────────────────────────────────────────────────
describe('foldWithOutcomes', () => {
  it('equals the live log’s per-op state and outcomes', () => {
    const evs = sortCanonical([
      created({ opId: 'op1', receivedAt: 1 }),
      division(2, { opId: 'op1', receivedAt: 2 }),
      division(2, { opId: 'op1', receivedAt: 3 }),
      created({ opId: 'op2', receivedAt: 4 }),
      added('x', { opId: 'op2', receivedAt: 5, batchId: 'B' }),
      division(1, { opId: 'op2', receivedAt: 5, batchId: 'B' }),
    ]);
    const log = logOf(evs);
    for (const opId of ['op1', 'op2']) {
      const cold = foldWithOutcomes(evs, opId);
      expect(cold.state).toEqual(log.opState(opId));
      for (const [id, o] of cold.outcomes) expect(log.outcomes().get(id)).toBe(o);
      expect(cold.outcomes.size).toBe(evs.filter((e) => e.opId === opId).length);
    }
  });
});

// ── Order independence sweep ─────────────────────────────────────────────────────────
describe('order independence', () => {
  it('any arrival order / chunking / stamping sequence converges to the rebuild of the final set', () => {
    const races = new Set<string | null>();
    for (let seed = 1; seed <= 200; seed++) {
      const r = rng(seed);
      n = 1000 * seed; // fresh ids per seed
      const evs: FieldShoreEvent[] = [
        created({ at: 1, receivedAt: 1 }),
        added('a', { at: 2, receivedAt: 2 }),
        added('b', { at: 3, receivedAt: 4 }),
        deploy('a', 'inv-1', { at: 4, receivedAt: 6 }),
        deploy('b', 'inv-1', { at: 5, receivedAt: 5 }),
        status('a', 'process', 'strutset', { at: 6, receivedAt: 9 }),
        returned('a', { at: 7, receivedAt: 8 }),
        edited('One', { at: 8, receivedAt: 7 }),
        edited('Two', { at: 9 }), // provisional
        division(2, { at: 10, receivedAt: 10, batchId: 'B' }),
        added('c', { at: 11, receivedAt: 10, batchId: 'B' }),
        division(3, { at: 12, batchId: 'P' }), // provisional batch
        added('d', { at: 13, batchId: 'P' }),
        // A second op racing the first for "active" — stamping order can flip the race
        // through setReceivedAt as well as insert.
        created({ opId: 'op2', at: 1, receivedAt: 1 + Math.floor(r() * 3) }),
        added('x', { opId: 'op2', at: 2, receivedAt: 3 }),
        deploy('x', 'inv-1', { opId: 'op2', at: 3, receivedAt: 4 }),
        ended({ opId: 'op2', at: 4, receivedAt: 2 + Math.floor(r() * 10) }),
        reopened({ opId: 'op2', at: 5, receivedAt: 3 + Math.floor(r() * 10) }),
        ended({ at: 20, receivedAt: 4 + Math.floor(r() * 10) }),
      ];
      // Some events arrive provisional and are stamped later (the own-echo path).
      const late = new Set(evs.filter((e) => e.receivedAt !== undefined && r() < 0.3).map((e) => e.id));
      const arrivals = shuffle(evs, r).map((e) => (late.has(e.id) ? unstamp(e) : e));
      const log = createEventLog();
      let i = 0;
      while (i < arrivals.length) {
        const size = 1 + Math.floor(r() * 3);
        log.insert(arrivals.slice(i, i + size));
        i += size;
      }
      for (const id of shuffle([...late], r)) log.setReceivedAt(id, evs.find((e) => e.id === id)!.receivedAt!);

      const ref = logOf(evs);
      expect(log.sortedEvents()).toEqual(ref.sortedEvents());
      expect(log.active()).toEqual(ref.active());
      expect(log.outcomes()).toEqual(ref.outcomes());
      expect(log.held()).toEqual(ref.held());
      expect(log.activeOpId()).toBe(ref.activeOpId());
      for (const opId of ['op1', 'op2']) expect(log.opState(opId)).toEqual(ref.opState(opId));
      races.add(ref.activeOpId());
    }
    expect(races.size).toBeGreaterThan(1); // the sweep really exercised different race winners
  });
});
