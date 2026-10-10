import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import { createOperationStore, type OperationStoreApi } from './operationStore';
import { createMonotonicClock } from '@core/clock';
import {
  projectOperation,
  sortCanonical,
  operationReducer,
  EMPTY_OPERATION_STATE,
  heldInShorePoints,
  withAvailability,
  heldOf,
  nextSeqBase,
  type OperationState,
  isTellWorthy,
} from '@core/operation';
import { canTransition } from '@core/shorepoint';
import { currentIC, defaultPositionId, DEFAULT_POSITION_KEYS } from '@core/org';
import {
  NO_DEDUCTIONS,
  type FieldShoreEvent,
  type InventoryItem,
  type ShorePoint,
  type ShorePointStatus,
} from '@core/schema';

// #499 regression — the TWO-DEVICE CONVERGENCE property (ADR-041, plan §A/§B/§D).
//
// Claim under test: two devices that end up holding the same event set show the same
// state — IC, statuses, stock — whatever order the events reached each of them. The
// claim is about ORDER, not garbage: every generated local event is one the device's UI
// could emit from its OWN current state (valid status edge with the right `from`, a
// pending transfer when resolving, a row with stock to spare when deploying, …), and the
// store's own local pre-flight (localCommitGuard) acts as the UI gate — a candidate it
// refuses is never uploaded.
//
// Model per seed (mulberry32 — never Math.random — so every run replays from its seed):
//   1. an online common prefix: every commit is stamped by the shared "server" at once
//      (markReceived on the author, ingestRemote on the peer);
//   2. an offline window: each device commits its own provisional events;
//   3. reconnect: the server stamps each device's upload units in a seeded interleaving
//      that keeps each device's commit order (flush is strictly in queue order; a
//      commitMany batch is ONE multi-path upload = one stamp, delivered as a unit), with
//      occasional equal stamps (RTDB ms ties). Each device then gets markReceived for its
//      own events and ingestRemote for the peer's, in a DIFFERENT seeded order per device,
//      in several calls, with occasional duplicate redelivery (full-snapshot listener).
//   4. assert convergence (see assertConverged), then optionally another offline round.
//
// Device-local fields excluded from the state comparison: NONE. OperationState is a pure
// fold of the event log (myRoles / createdAt / the founder's "This device" label all come
// from events), so it is compared whole.
//
// Replay a failure: CONVERGENCE_SEED=<n> npx vitest run src/data/store/convergence.test.ts
// More seeds:       CONVERGENCE_SEEDS=2000 npx vitest run src/data/store/convergence.test.ts

const OP = 'op-conv';
const A_UID = 'device-A';
const B_UID = 'device-B';
const MODEL = 'LS 203'; // with 240 eighths / t-shore / no deductions / no load it clears deployVerdict

// ─── seeded PRNG ────────────────────────────────────────────────────────────────

function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number): number => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next,
    int,
    chance: (p: number): boolean => next() < p,
    pick<T>(arr: readonly T[]): T {
      return arr[int(0, arr.length - 1)]!;
    },
    shuffle<T>(arr: readonly T[]): T[] {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
  };
}
type Rng = ReturnType<typeof makeRng>;

// ─── canonical JSON (sorted keys; Maps as sorted entry lists) ─────────────────────

function sortDeep(v: unknown): unknown {
  if (v instanceof Map) {
    return [...v.entries()]
      .sort(([x], [y]) => (String(x) < String(y) ? -1 : String(x) > String(y) ? 1 : 0))
      .map(([k, x]) => [k, sortDeep(x)]);
  }
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) out[k] = sortDeep((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
const canon = (v: unknown): string => JSON.stringify(sortDeep(v));

// ─── the simulated world ───────────────────────────────────────────────────────

interface RunStats {
  offlineNoEffect: number; //    offline events that ended no-effect (the losing branch exists)
  overriddenShown: number; //    non-empty overridden lists observed after a reconnect
  transferRaces: number; //      rounds where BOTH devices committed transfer events offline
  pointRaces: number; //         rounds where both devices touched the same shore point offline
  overAllocated: number; //      rounds that ended with a negative available
  batches: number; //            commitMany batches committed
  stampTies: number; //          equal server stamps across upload units
  redeliveries: number; //       duplicate peer deliveries
  arrivalDivergent: number; //   seeds where folding each device's ARRIVAL order (pre-ADR-041) diverges
  batchNoEffect: number; //      rounds where a whole offline commitMany batch ended no-effect
  rejected: Record<string, number>; // local pre-flight refusals by reason (the UI gate)
}

const emptyStats = (): RunStats => ({
  offlineNoEffect: 0,
  overriddenShown: 0,
  transferRaces: 0,
  pointRaces: 0,
  overAllocated: 0,
  batches: 0,
  stampTies: 0,
  redeliveries: 0,
  arrivalDivergent: 0,
  batchNoEffect: 0,
  rejected: {},
});

interface World {
  rng: Rng;
  wall: number; //   shared wall clock (each device adds its own skew)
  server: number; // last server receipt stamp
  ledger: FieldShoreEvent[]; // every event as the server holds it (with receivedAt)
  ids: number;
  trace: string[];
  stats: RunStats;
}

interface Device {
  name: 'A' | 'B';
  uid: string;
  other: string;
  db: FieldShoreDB;
  inv: InventoryStoreApi;
  ops: OperationStoreApi;
  sent: FieldShoreEvent[]; //        the enqueue capture (the store's stamped objects)
  outbox: FieldShoreEvent[][]; //    provisional upload units, commit order
  roundOwn: Set<string>; //          own events committed in the current offline window
  appliedAtCommit: Set<string>; //   …of which applied at commit time
  touched: Set<string>; //           shore points this device touched offline this round
  transferActs: number; //           transfer events committed offline this round
  delivery: string[]; //             delivery trace (for the failure dump)
  arrival: FieldShoreEvent[]; //      events in the order they entered this device (the negative control)
}

let dbCounter = 0;

function newWorld(seed: number): World {
  return {
    rng: makeRng(seed),
    wall: 1_760_000_000_000,
    server: 1_760_000_000_000,
    ledger: [],
    ids: 0,
    trace: [],
    stats: emptyStats(),
  };
}

/** Random-prefixed, counter-suffixed — random lexicographic order (exercises the id
 *  tiebreak), unique, and fully determined by the seed. */
function newId(w: World): string {
  const hex = Math.floor(w.rng.next() * 0x100000000)
    .toString(16)
    .padStart(8, '0');
  return `${hex}-${++w.ids}`;
}

const invRow = (id: string, apparatus: string, quantity: number): InventoryItem => ({
  id,
  type: 'strut',
  model: MODEL,
  system: 'LongShore',
  apparatus,
  apparatusId: `app-${id}`,
  quantity,
});

const RUN_ROWS: InventoryItem[] = [
  invRow('inv-a', 'Rescue 2', 1),
  invRow('inv-b', 'Engine 5', 2),
  invRow('inv-c', 'Squad 3', 1),
];

async function makeDevice(w: World, name: 'A' | 'B', rows: InventoryItem[], skew: number): Promise<Device> {
  const uid = name === 'A' ? A_UID : B_UID;
  const db = createDB(`test-convergence-${name}-${++dbCounter}`);
  if (rows.length) await db.inventory.bulkAdd(rows.map((r) => ({ ...r })));
  const inv = createInventoryStore(db);
  await inv.boot();
  const dev = {
    name,
    uid,
    other: name === 'A' ? B_UID : A_UID,
    db,
    inv,
    sent: [],
    outbox: [],
    roundOwn: new Set(),
    appliedAtCommit: new Set(),
    touched: new Set(),
    transferActs: 0,
    delivery: [],
    arrival: [],
  } as unknown as Device;
  dev.ops = createOperationStore({
    db,
    inventory: inv,
    enqueue: (e) => dev.sent.push(e),
    clock: createMonotonicClock(() => w.wall + skew),
    deviceUid: () => uid,
  });
  await dev.ops.boot();
  return dev;
}

// ─── event builders (at: 0 — the store re-stamps it from the device clock) ─────────

const base = (w: World, d: Device) => ({ id: newId(w), opId: OP, at: 0, by: d.uid });

const makeSp = (id: string, seq: number, over: Partial<ShorePoint> = {}): ShorePoint => ({
  id,
  opId: OP,
  seq,
  division: '1',
  shoreType: 't-shore',
  measurementEighths: 240,
  deductions: NO_DEDUCTIONS,
  status: 'pending',
  ...over,
});

const opCreated = (w: World, d: Device): FieldShoreEvent => ({
  type: 'OperationCreated',
  ...base(w, d),
  name: 'Convergence Op',
  multiBuilding: false,
});
const spAdded = (w: World, d: Device, sp: ShorePoint): FieldShoreEvent => ({ type: 'ShorePointAdded', ...base(w, d), shorePoint: sp });
const deployEvt = (w: World, d: Device, spId: string, row: InventoryItem): FieldShoreEvent => ({
  type: 'EquipmentDeployed',
  ...base(w, d),
  spId,
  deployedBom: [{ role: 'strut', model: MODEL, source: row.apparatus, inventoryId: row.id }],
});
const slideEvt = (w: World, d: Device, spId: string, from: ShorePointStatus, to: ShorePointStatus): FieldShoreEvent => ({
  type: 'ShorePointStatusChanged',
  ...base(w, d),
  spId,
  from,
  to,
});
const returnEvt = (w: World, d: Device, spId: string): FieldShoreEvent => ({ type: 'EquipmentReturned', ...base(w, d), spId });
const xferInit = (w: World, d: Device): FieldShoreEvent => ({
  type: 'CommandTransferInitiated',
  ...base(w, d),
  toResource: { ref: 'device', value: d.other, label: `Device ${d.other}` },
});
const xferResolve = (
  w: World,
  d: Device,
  type: 'CommandTransferAccepted' | 'CommandTransferDeclined' | 'CommandTransferCancelled',
  transferId: string,
): FieldShoreEvent => ({ type, ...base(w, d), transferId });

// ─── commit / stamp / deliver ──────────────────────────────────────────────────

/** A local commit through the store's real path. Returns the stamped events exactly as
 *  the store enqueued them (the upload unit), or null when the local pre-flight refused. */
async function commitLocal(w: World, d: Device, events: FieldShoreEvent[]): Promise<FieldShoreEvent[] | null> {
  d.sent = [];
  const res = events.length === 1 ? await d.ops.commit(events[0]!) : await d.ops.commitMany(events);
  if (!res.ok) {
    // Schema garbage is a generator bug, never a "UI refusal".
    if (res.reason.startsWith('invalid event')) throw new Error(`generator built an invalid event: ${res.reason}`);
    const key = res.reason.replace(/inv-[a-z0-9-]+|[0-9a-f]{8}-\d+/g, '<id>');
    w.stats.rejected[key] = (w.stats.rejected[key] ?? 0) + 1;
    return null;
  }
  const unit = d.sent;
  if (unit.length !== events.length) throw new Error(`expected ${events.length} enqueued events, got ${unit.length}`);
  if (events.length > 1) w.stats.batches++;
  const outcomes = d.ops.outcomes();
  for (const e of unit) {
    d.roundOwn.add(e.id);
    d.arrival.push(e);
    if (outcomes.get(e.id) === 'applied') d.appliedAtCommit.add(e.id);
  }
  return unit;
}

/** Commit online: the server stamps the unit at once, the author marks it received, and
 *  the peer (when given) ingests it. Returns the stamped copies. */
async function online(w: World, d: Device, peer: Device | null, events: FieldShoreEvent[]): Promise<FieldShoreEvent[] | null> {
  w.wall += w.rng.int(1, 3000);
  const unit = await commitLocal(w, d, events);
  if (!unit) return null;
  w.server += w.rng.int(1, 50);
  const t = w.server;
  const stamped = unit.map((e) => ({ ...e, receivedAt: t }));
  w.ledger.push(...stamped);
  w.trace.push(`online ${d.name}: ${stamped.map(fmtEvent).join(' | ')}`);
  for (const e of unit) await d.ops.markReceived(e.id, t);
  if (peer) peer.arrival.push(...(await peer.ops.ingestRemote(stamped)).inserted);
  return stamped;
}

/** Commit offline: provisional, queued for upload on reconnect. */
async function offline(w: World, d: Device, events: FieldShoreEvent[]): Promise<FieldShoreEvent[] | null> {
  w.wall += w.rng.int(1, 3000);
  const unit = await commitLocal(w, d, events);
  if (!unit) return null;
  d.outbox.push(unit);
  w.trace.push(`offline ${d.name}: ${unit.map(fmtEvent).join(' | ')}`);
  return unit;
}

interface StampedUnit {
  owner: Device;
  events: FieldShoreEvent[];
}

/** The server stamps both outboxes: a seeded interleaving that preserves each device's
 *  commit order; one stamp per unit (a batch = one multi-path update); occasional ties. */
function stampReconnect(w: World, a: Device, b: Device, order?: ('A' | 'B')[]): StampedUnit[] {
  const qa = [...a.outbox];
  const qb = [...b.outbox];
  a.outbox = [];
  b.outbox = [];
  const out: StampedUnit[] = [];
  let first = true;
  let k = 0;
  while (qa.length || qb.length) {
    let fromA: boolean;
    const forced = order?.[k++];
    if (forced) fromA = forced === 'A';
    else fromA = qb.length === 0 || (qa.length > 0 && w.rng.chance(qa.length / (qa.length + qb.length)));
    const owner = fromA ? a : b;
    const unit = (fromA ? qa : qb).shift()!;
    if (!first && !order && w.rng.chance(0.1)) w.stats.stampTies++;
    else w.server += w.rng.int(1, 50);
    first = false;
    const t = w.server;
    const events = unit.map((e) => ({ ...e, receivedAt: t }));
    w.ledger.push(...events);
    out.push({ owner, events });
  }
  w.trace.push(`reconnect stamps: ${out.map((u) => `${u.owner.name}[${u.events.map((e) => short(e.id)).join(',')}]@${u.events[0]!.receivedAt! - 1_760_000_000_000}`).join(' ')}`);
  return out;
}

/** Deliver a reconnect to one device: its own units as markReceived, the peer's as
 *  ingestRemote, in a seeded order of its own, coalesced into a few calls, with an
 *  occasional duplicate redelivery. `ownInOrder` = the realistic flush order. */
async function deliver(w: World, d: Device, units: StampedUnit[], ownInOrder: boolean): Promise<void> {
  const own = units.filter((u) => u.owner === d);
  const peer = w.rng.shuffle(units.filter((u) => u.owner !== d));
  const ownSeq = ownInOrder ? own : w.rng.shuffle(own);
  const items: { kind: 'mark' | 'ingest'; events: FieldShoreEvent[] }[] = [];
  let i = 0;
  let j = 0;
  while (i < ownSeq.length || j < peer.length) {
    const takeOwn = j >= peer.length || (i < ownSeq.length && w.rng.chance(0.5));
    items.push(takeOwn ? { kind: 'mark', events: ownSeq[i++]!.events } : { kind: 'ingest', events: peer[j++]!.events });
  }
  const delivered: FieldShoreEvent[] = [];
  let buf: FieldShoreEvent[] = [];
  let unitsInBuf = 0;
  let cap = w.rng.int(1, 3);
  const flush = async () => {
    if (!buf.length) return;
    let call = w.rng.shuffle(buf);
    if (delivered.length && w.rng.chance(0.2)) {
      call = [...call, ...w.rng.shuffle(delivered).slice(0, 2)];
      w.stats.redeliveries++;
    }
    d.delivery.push(`ingest[${call.map((e) => short(e.id)).join(',')}]`);
    d.arrival.push(...(await d.ops.ingestRemote(call)).inserted);
    delivered.push(...buf);
    buf = [];
    unitsInBuf = 0;
    cap = w.rng.int(1, 3);
  };
  for (const item of items) {
    if (item.kind === 'ingest') {
      buf.push(...item.events);
      if (++unitsInBuf >= cap) await flush();
    } else {
      await flush();
      for (const e of item.events) {
        d.delivery.push(`mark(${short(e.id)})`);
        await d.ops.markReceived(e.id, e.receivedAt!);
      }
    }
  }
  await flush();
}

// ─── the honest generator: candidates from the device's OWN current state ─────────

const SLIDE_ZONE: readonly ShorePointStatus[] = ['process', 'strutset', 'cutting', 'runner', 'secured'];
const CHECK_ITEMS = ['i1', 'i2', 'i3'];
const CHECKLIST = 'ic-command';

type Candidate = { kind: string; spId?: string; events: FieldShoreEvent[] };

function candidates(w: World, d: Device): Candidate[] {
  const s = d.ops.store.getState();
  const items = d.inv.store.getState().items;
  const live = s.shorePoints.filter((p) => p.deletedAt == null);
  const out: { weight: number; build: () => Candidate | null }[] = [];
  const add = (weight: number, build: () => Candidate | null) => out.push({ weight, build });
  const rng = w.rng;

  const strutRowsWithStock = items.filter((r) => r.type === 'strut' && r.available > 0);
  const nextSeq = nextSeqBase(s.shorePoints) + 1;

  // Status slides along the reversible zone (pending↔process = deploy/return,
  // secured↔returned = reclaim; both owned elsewhere).
  const slidable = live.filter((p) => SLIDE_ZONE.includes(p.status));
  if (slidable.length)
    add(6, () => {
      const p = rng.pick(slidable);
      const tos = SLIDE_ZONE.filter((t) => canTransition(p.status, t));
      const to = rng.pick(tos);
      return { kind: 'slide', spId: p.id, events: [slideEvt(w, d, p.id, p.status, to)] };
    });

  const pending = live.filter((p) => p.status === 'pending');
  if (pending.length && strutRowsWithStock.length)
    add(4, () => {
      const p = rng.pick(pending);
      return { kind: 'deploy', spId: p.id, events: [deployEvt(w, d, p.id, rng.pick(strutRowsWithStock))] };
    });

  const assigned = live.filter((p) => p.status === 'process' && p.deployedBom);
  if (assigned.length)
    add(3, () => {
      const p = rng.pick(assigned);
      return { kind: 'return', spId: p.id, events: [returnEvt(w, d, p.id)] };
    });

  const secured = live.filter((p) => p.status === 'secured' && p.deployedBom);
  if (secured.length)
    add(2, () => {
      const p = rng.pick(secured);
      return { kind: 'reclaim', spId: p.id, events: [{ type: 'EquipmentReclaimed', ...base(w, d), spId: p.id }] };
    });

  const holders = live.filter((p) => p.deployedBom && p.status !== 'returned');
  if (holders.length)
    add(1, () => {
      const p = rng.pick(holders);
      const cur = p.deployedBom![0]!;
      const targets = strutRowsWithStock.filter((r) => r.id !== cur.inventoryId);
      if (!targets.length) return null;
      const r = rng.pick(targets);
      return {
        kind: 'resource',
        spId: p.id,
        events: [{ type: 'ComponentResourced', ...base(w, d), spId: p.id, componentIndex: 0, source: r.apparatus, inventoryId: r.id }],
      };
    });

  add(1.5, () => {
    const id = `sp-${newId(w)}`;
    return { kind: 'add', spId: id, events: [spAdded(w, d, makeSp(id, nextSeq))] };
  });

  add(1, () => {
    // Grouped add (#220) — one commitMany batch, one shared groupId/seq.
    const total = rng.chance(0.5) ? 2 : 3;
    const groupId = `grp-${newId(w)}`;
    const shoreType = total === 2 ? 'double-t' : '3-post';
    const events = Array.from({ length: total }, (_, k) =>
      spAdded(w, d, makeSp(`sp-${newId(w)}`, nextSeq, { shoreType, groupId, groupIndex: k + 1, groupTotal: total })),
    );
    return { kind: 'addGroup', events };
  });

  // Delete (DeleteShorePointModal): opened from a Pending card; a grouped shore deletes
  // EVERY live member as one commitMany batch (audit W5) — the store refuses the whole
  // batch while any member holds equipment (#421), which the tally records.
  if (pending.length)
    add(1.5, () => {
      const p = rng.pick(pending);
      const members = p.groupId ? live.filter((m) => m.groupId === p.groupId) : [p];
      return { kind: 'delete', spId: p.id, events: members.map((m) => ({ type: 'ShorePointDeleted', ...base(w, d), spId: m.id }) as FieldShoreEvent) };
    });

  const deleted = s.shorePoints.filter((p) => p.deletedAt != null);
  if (deleted.length)
    add(1, () => {
      // OperationsBoard.handleRestore: group-aware like the delete — every deleted member.
      const p = rng.pick(deleted);
      const members = p.groupId ? deleted.filter((m) => m.groupId === p.groupId) : [p];
      return { kind: 'restore', spId: p.id, events: members.map((m) => ({ type: 'ShorePointRestored', ...base(w, d), spId: m.id }) as FieldShoreEvent) };
    });

  if (live.length)
    add(1, () => {
      const p = rng.pick(live);
      const label = `L${rng.int(1, 99)}`;
      if (p.label === label) return null;
      return { kind: 'label', spId: p.id, events: [{ type: 'ShorePointEdited', ...base(w, d), spId: p.id, patch: { label } }] };
    });

  const unclaimed = live.filter((p) => p.status === 'cutting' && !p.sawId);
  if (unclaimed.length)
    add(1, () => {
      const p = rng.pick(unclaimed);
      return { kind: 'claim', spId: p.id, events: [{ type: 'CuttingClaimed', ...base(w, d), spId: p.id, sawId: 'A' }] };
    });

  // Command transfer (ADR-021): initiate only as the IC of record with nothing pending;
  // accept/decline only as the named target; cancel only as the initiator. Every
  // resolver names the pending handshake (ADR-041 transferId).
  const ic = currentIC(s.positions);
  const pend = s.commandTransfer;
  if (!pend && ic?.ref === 'device' && ic.value === d.uid) add(3, () => ({ kind: 'xferInit', events: [xferInit(w, d)] }));
  if (pend && pend.toResource.ref === 'device' && pend.toResource.value === d.uid) {
    add(3, () => ({ kind: 'xferAccept', events: [xferResolve(w, d, 'CommandTransferAccepted', pend.transferId)] }));
    add(1, () => ({ kind: 'xferDecline', events: [xferResolve(w, d, 'CommandTransferDeclined', pend.transferId)] }));
  }
  if (pend && pend.initiatedBy === d.uid)
    add(3, () => ({ kind: 'xferCancel', events: [xferResolve(w, d, 'CommandTransferCancelled', pend.transferId)] }));

  // ICS-208 hazards.
  add(0.7, () => ({
    kind: 'hazLog',
    events: [
      {
        type: 'HazardLogged',
        ...base(w, d),
        hazard: { id: `hz-${newId(w)}`, type: 'structural', location: 'Division 1', severity: 'high', reportedBy: d.uid, reportedAt: w.wall },
      },
    ],
  }));
  const hazards = Object.values(s.hazards);
  const open = hazards.filter((h) => h.mitigatedAt == null);
  const mitigated = hazards.filter((h) => h.mitigatedAt != null);
  if (open.length)
    add(1, () => ({ kind: 'hazMit', events: [{ type: 'HazardMitigated', ...base(w, d), hazardId: rng.pick(open).id }] }));
  if (mitigated.length)
    add(1, () => ({ kind: 'hazReopen', events: [{ type: 'HazardReopened', ...base(w, d), hazardId: rng.pick(mitigated).id }] }));

  // Checklist toggles (a tap on an unchecked leaf checks it; on a checked leaf, un-checks).
  add(1, () => {
    const itemId = rng.pick(CHECK_ITEMS);
    const inst = s.checklists[`${CHECKLIST}::${OP}`] ?? {};
    const type = itemId in inst ? 'ChecklistItemUnchecked' : 'ChecklistItemChecked';
    return {
      kind: type === 'ChecklistItemChecked' ? 'check' : 'uncheck',
      events: [{ type, ...base(w, d), checklistId: CHECKLIST, instanceId: OP, itemId, role: 'Incident Commander' }],
    };
  });

  add(0.5, () => {
    const key = rng.pick(DEFAULT_POSITION_KEYS);
    const positionId = defaultPositionId(OP, key);
    if (s.myRoles[d.uid] === positionId) return null;
    return { kind: 'myRole', events: [{ type: 'MyRoleSet', ...base(w, d), positionId }] };
  });

  add(0.3, () => {
    const divs = s.operation?.divisions ?? [1];
    return { kind: 'division', events: [{ type: 'DivisionAdded', ...base(w, d), division: Math.max(...divs) + 1 }] };
  });

  // Weighted pick, a few tries (a builder may decline).
  const picked: Candidate[] = [];
  const total = out.reduce((n, c) => n + c.weight, 0);
  for (let tries = 0; tries < 4 && picked.length === 0; tries++) {
    let r = rng.next() * total;
    for (const c of out) {
      r -= c.weight;
      if (r <= 0) {
        const cand = c.build();
        if (cand) picked.push(cand);
        break;
      }
    }
  }
  return picked;
}

async function randomStep(w: World, d: Device, peer: Device, mode: 'online' | 'offline'): Promise<void> {
  const [cand] = candidates(w, d);
  if (!cand) return;
  const unit = mode === 'online' ? await online(w, d, peer, cand.events) : await offline(w, d, cand.events);
  if (unit && mode === 'offline') {
    if (cand.spId) d.touched.add(cand.spId);
    if (cand.kind.startsWith('xfer')) d.transferActs++;
  }
}

// ─── assertions ────────────────────────────────────────────────────────────────

const short = (id: string) => id.slice(0, 4) + id.slice(id.indexOf('-'));

function fmtEvent(e: FieldShoreEvent): string {
  const rec = e as unknown as Record<string, unknown>;
  const bits = [`${short(e.id)} ${e.type} by=${e.by === A_UID ? 'A' : e.by === B_UID ? 'B' : e.by} at=${e.at - 1_760_000_000_000}`];
  if (e.receivedAt !== undefined) bits.push(`rcv=${e.receivedAt - 1_760_000_000_000}`);
  if (e.batchId) bits.push(`batch=${e.batchId.slice(0, 6)}`);
  for (const k of ['spId', 'from', 'to', 'hazardId', 'itemId', 'positionId', 'componentIndex', 'inventoryId', 'sawId', 'division']) {
    if (rec[k] !== undefined) bits.push(`${k}=${String(rec[k])}`);
  }
  if (e.type === 'CommandTransferAccepted' || e.type === 'CommandTransferDeclined' || e.type === 'CommandTransferCancelled') {
    bits.push(`transferId=${e.transferId ? short(e.transferId) : '-'}`);
  }
  if (e.type === 'EquipmentDeployed') bits.push(`bom=${e.deployedBom.map((c) => c.inventoryId ?? 'untracked').join('+')}`);
  if (e.type === 'ShorePointAdded') bits.push(`sp=${e.shorePoint.id}${e.shorePoint.groupId ? ` grp=${e.shorePoint.groupId}` : ''}`);
  return bits.join(' ');
}

/** The full convergence check after a reconnect. Both devices must hold the server's
 *  event set; every observable projection must match each other AND an independent fold
 *  of the server ledger. */
function assertConverged(w: World, a: Device, b: Device): void {
  const sortedLedger = sortCanonical(w.ledger);
  const ledgerIds = sortedLedger.map((e) => e.id);

  for (const d of [a, b]) {
    const evs = d.ops.sortedEvents();
    // Harness sanity first: the same event SET, everything received.
    expect(new Set(evs.map((e) => e.id)), `${d.name} holds the server's event set`).toEqual(new Set(ledgerIds));
    expect(evs.filter((e) => e.receivedAt === undefined).map((e) => e.id), `${d.name} has no provisional events left`).toEqual([]);
    // Same canonical ORDER as the server ledger, with identical stamps.
    expect(evs.map((e) => e.id), `${d.name} canonical order`).toEqual(ledgerIds);
    expect(canon(evs), `${d.name} events byte-identical to the ledger`).toBe(canon(sortedLedger));
  }

  // Batch-atomic fold (plan §B): every member of a commitMany batch shares one outcome.
  const batches = new Map<string, string[]>();
  for (const e of sortedLedger) if (e.batchId) batches.set(e.batchId, [...(batches.get(e.batchId) ?? []), e.id]);
  let batchLost = false;
  for (const [batchId, ids] of batches) {
    const outs = new Set(ids.map((id) => a.ops.outcomes().get(id)));
    expect(outs.size, `batch ${batchId.slice(0, 6)} folds all-or-nothing`).toBe(1);
    if (outs.has('no-effect')) batchLost = true;
  }

  // Oracle 1: the projection the plan names. Oracle 2: a naive pure reduce of the same
  // canonical list, independent of eventLog's two-tier/incremental machinery. Batch
  // atomicity is the one rule the naive reduce lacks, so oracle 2 is compared only when no
  // batch ended no-effect.
  const expected = projectOperation(sortedLedger);
  if (!batchLost) {
    const naive = sortedLedger.reduce<OperationState>(operationReducer, EMPTY_OPERATION_STATE);
    expect(canon(naive), 'naive reduce ≡ projectOperation').toBe(canon(expected));
  }

  const sa = a.ops.store.getState();
  const sb = b.ops.store.getState();
  expect(canon(sa), 'A state ≡ B state').toBe(canon(sb));
  expect(sa, 'A state strictly equals B state').toStrictEqual(sb);
  expect(canon(sa), 'A state ≡ projectOperation(sortCanonical(ledger))').toBe(canon(expected));

  // Held stock: equal, and equal to an independent tally of the expected state (single
  // active op, never ended → no stockReleased).
  expect(canon(a.ops.held()), 'held A ≡ held B').toBe(canon(b.ops.held()));
  expect(canon(a.ops.held()), 'held ≡ tally of the expected shore points').toBe(canon(heldInShorePoints(expected.shorePoints)));

  // Outcomes for every shared id.
  expect(canon(a.ops.outcomes()), 'outcomes A ≡ B').toBe(canon(b.ops.outcomes()));
  expect([...a.ops.outcomes().keys()].sort()).toEqual([...ledgerIds].sort());

  // The stock view.
  const view = (d: Device) => [...d.inv.store.getState().items].sort((x, y) => (x.id < y.id ? -1 : 1));
  expect(canon(view(a)), 'inventory view A ≡ B').toBe(canon(view(b)));
  const expHeld = heldInShorePoints(expected.shorePoints);
  const rows = [...a.inv.store.getState().rows].sort((x, y) => (x.id < y.id ? -1 : 1));
  expect(canon(view(a)), 'inventory view ≡ rows + expected held').toBe(
    canon(withAvailability(rows, expHeld).map((r) => ({ ...r, held: heldOf(expHeld, r.id) }))),
  );

  // The losing branch is surfaced on the device that lost — and only its own events.
  const outcomes = a.ops.outcomes();
  for (const d of [a, b]) {
    const listed = d.ops.overridden.getState().events;
    for (const e of listed) {
      expect(e.by, `${d.name} overridden lists only its own events`).toBe(d.uid);
      expect(outcomes.get(e.id), `${d.name} overridden entry is no-effect`).toBe('no-effect');
    }
    // ...and only the tell-worthy ones (ADR-041 policy: idempotent bookkeeping never nags).
    const lost = [...d.appliedAtCommit]
      .filter((id) => outcomes.get(id) === 'no-effect')
      .filter((id) => isTellWorthy(d.ops.sortedEvents().find((e) => e.id === id)!))
      .sort();
    expect(listed.map((e) => e.id).sort(), `${d.name} overridden ≡ own tell-worthy events applied at commit that ended no-effect`).toEqual(lost);
  }
}

// ─── one seeded run ─────────────────────────────────────────────────────────────

async function runSeed(seed: number, total: RunStats): Promise<void> {
  const w = newWorld(seed);
  const rng = w.rng;
  const a = await makeDevice(w, 'A', RUN_ROWS, 0);
  const b = await makeDevice(w, 'B', RUN_ROWS, rng.int(-120_000, 120_000)); // B's wall clock is skewed
  const dev = (x: 'A' | 'B') => (x === 'A' ? a : b);
  const peerOf = (d: Device) => (d === a ? b : a);
  const ownInOrder = rng.chance(0.7); // 30 %: own receipts also arrive out of order (stronger than real flush)
  const simulate = async (): Promise<void> => {
    // 1. Online common prefix.
    await online(w, a, b, [opCreated(w, a)]);
    const nPoints = rng.int(3, 5);
    for (let i = 0; i < nPoints; i++) {
      const d = dev(rng.chance(0.5) ? 'A' : 'B');
      const id = `sp-${newId(w)}`;
      await online(w, d, peerOf(d), [spAdded(w, d, makeSp(id, nextSeqBase(d.ops.store.getState().shorePoints) + 1))]);
    }
    // Deploy two points and walk one of them part of the way (so return / slides / reclaim are reachable).
    const pts = a.ops.store.getState().shorePoints;
    const rows = a.inv.store.getState().rows;
    await online(w, a, b, [deployEvt(w, a, pts[0]!.id, rows[1]!)]);
    await online(w, b, a, [deployEvt(w, b, pts[1]!.id, rows[rng.int(0, 2)]!)]);
    const walk = rng.int(0, 4);
    const path: ShorePointStatus[] = ['process', 'strutset', 'cutting', 'runner', 'secured'];
    for (let k = 0; k < walk; k++) {
      const d = dev(rng.chance(0.5) ? 'A' : 'B');
      await online(w, d, peerOf(d), [slideEvt(w, d, pts[1]!.id, path[k]!, path[k + 1]!)]);
    }
    if (rng.chance(0.6)) await online(w, a, b, [xferInit(w, a)]);
    const extra = rng.int(0, 10);
    for (let k = 0; k < extra; k++) {
      const d = dev(rng.chance(0.5) ? 'A' : 'B');
      await randomStep(w, d, peerOf(d), 'online');
    }
    assertConverged(w, a, b);

    // 2–4. Offline windows + reconnects.
    const rounds = rng.int(1, 3);
    for (let r = 0; r < rounds; r++) {
      for (const d of [a, b]) {
        d.ops.acknowledgeOverridden();
        d.roundOwn.clear();
        d.appliedAtCommit.clear();
        d.touched.clear();
        d.transferActs = 0;
      }
      w.trace.push(`── offline window ${r + 1}`);
      const nA = rng.int(1, 12);
      const nB = rng.int(1, 12);
      // Interleave the two devices' offline work in wall time (it is invisible to each other).
      const order = rng.shuffle([...Array(nA).fill('A'), ...Array(nB).fill('B')] as ('A' | 'B')[]);
      for (const x of order) await randomStep(w, dev(x), peerOf(dev(x)), 'offline');

      if (a.transferActs > 0 && b.transferActs > 0) total.transferRaces++;
      if ([...a.touched].some((id) => b.touched.has(id))) total.pointRaces++;

      const units = stampReconnect(w, a, b);
      for (const d of rng.shuffle([a, b])) await deliver(w, d, units, ownInOrder);
      assertConverged(w, a, b);

      const outcomes = a.ops.outcomes();
      if ([...a.roundOwn, ...b.roundOwn].some((id) => outcomes.get(id) === 'no-effect')) total.offlineNoEffect++;
      if (a.ops.overridden.getState().events.length || b.ops.overridden.getState().events.length) total.overriddenShown++;
      if (a.inv.store.getState().items.some((i) => i.available < 0)) total.overAllocated++;
      const ledgerById = new Map(w.ledger.map((e) => [e.id, e]));
      if ([...a.roundOwn, ...b.roundOwn].some((id) => ledgerById.get(id)?.batchId && outcomes.get(id) === 'no-effect')) total.batchNoEffect++;
    }

    // Negative control: had each device folded in its own ARRIVAL order (the pre-ADR-041
    // store), would they agree? Counted, not asserted per seed — the aggregate must be > 0,
    // proving the generator builds order-sensitive histories the canonical order resolves.
    const naiveA = a.arrival.reduce<OperationState>(operationReducer, EMPTY_OPERATION_STATE);
    const naiveB = b.arrival.reduce<OperationState>(operationReducer, EMPTY_OPERATION_STATE);
    if (canon(naiveA) !== canon(naiveB)) total.arrivalDivergent++;

    // Durability: a cold reboot of each device folds the same thing from Dexie.
    for (const d of [a, b]) {
      const inv2 = createInventoryStore(d.db);
      await inv2.boot();
      const re = createOperationStore({ db: d.db, inventory: inv2, deviceUid: () => d.uid });
      await re.boot();
      expect(canon(re.store.getState()), `${d.name} reboot state`).toBe(canon(a.ops.store.getState()));
      expect(re.sortedEvents().map((e) => e.id), `${d.name} reboot order`).toEqual(a.ops.sortedEvents().map((e) => e.id));
      expect(canon(re.held()), `${d.name} reboot held`).toBe(canon(a.ops.held()));
      expect(canon(re.outcomes()), `${d.name} reboot outcomes`).toBe(canon(a.ops.outcomes()));
    }
  };
  const dumpOf = (head: string[]) =>
    [
      ...head,
      '── server ledger (canonical order):',
      ...sortCanonical(w.ledger).map((e) => '  ' + fmtEvent(e)),
      '── action trace:',
      ...w.trace.map((t) => '  ' + t),
      `── A delivery: ${a.delivery.join(' ')}`,
      `── B delivery: ${b.delivery.join(' ')}`,
      `── A overridden: ${a.ops.overridden.getState().events.map((e) => short(e.id)).join(',')}`,
      `── B overridden: ${b.ops.overridden.getState().events.map((e) => short(e.id)).join(',')}`,
    ].join('\n');
  try {
    await simulate();
    if (process.env.CONVERGENCE_DUMP) console.info(dumpOf([`seed ${seed} (ownInOrder=${ownInOrder}) — converged`]));
  } catch (err) {
    const dump = dumpOf([
      `CONVERGENCE FAILURE — seed ${seed} (ownInOrder=${ownInOrder}). Replay: CONVERGENCE_SEED=${seed}`,
      String(err instanceof Error ? err.message : err),
    ]);
    console.error(dump);
    throw new Error(dump);
  } finally {
    total.batches += w.stats.batches;
    total.stampTies += w.stats.stampTies;
    total.redeliveries += w.stats.redeliveries;
    for (const [k, n] of Object.entries(w.stats.rejected)) total.rejected[k] = (total.rejected[k] ?? 0) + n;
    await a.db.delete();
    await b.db.delete();
  }
}

// ─── the property ───────────────────────────────────────────────────────────────

const ONE_SEED = process.env.CONVERGENCE_SEED;
const SEED_COUNT = Number(process.env.CONVERGENCE_SEEDS ?? 500);
const SLICE = 20;
const slices = ONE_SEED
  ? [[Number(ONE_SEED), Number(ONE_SEED) + 1] as [number, number]]
  : Array.from({ length: Math.ceil(SEED_COUNT / SLICE) }, (_, i) => [i * SLICE + 1, Math.min((i + 1) * SLICE, SEED_COUNT) + 1] as [number, number]);

describe('two-device convergence (#499 regression, ADR-041)', () => {
  const total = emptyStats();
  let seedsRun = 0;
  const started = Date.now();

  it.each(slices)('seeds [%i, %i): same events ⇒ same state, held, outcomes and order on both devices', async (lo, hi) => {
    for (let seed = lo; seed < hi; seed++) {
      await runSeed(seed, total);
      seedsRun++;
    }
  }, 120_000);

  it('the generator produced real conflicts (the property is not vacuous)', () => {
    console.info(
      `[convergence] ${seedsRun} seeds in ${((Date.now() - started) / 1000).toFixed(1)}s — ` +
        JSON.stringify({ ...total, rejected: undefined }) +
        ` local refusals: ${JSON.stringify(total.rejected)}`,
    );
    if (ONE_SEED) return;
    expect(seedsRun).toBe(SEED_COUNT);
    if (SEED_COUNT < 200) return; // the aggregate floors below need the full sweep
    expect(total.arrivalDivergent).toBeGreaterThan(0);
    expect(total.batchNoEffect).toBeGreaterThan(0);
    expect(total.offlineNoEffect).toBeGreaterThan(0);
    expect(total.overriddenShown).toBeGreaterThan(0);
    expect(total.transferRaces).toBeGreaterThan(0);
    expect(total.pointRaces).toBeGreaterThan(0);
    expect(total.overAllocated).toBeGreaterThan(0);
    expect(total.batches).toBeGreaterThan(0);
    expect(total.stampTies).toBeGreaterThan(0);
  });
});

// ─── deterministic TTX probes at store level ──────────────────────────────────

describe('TTX probes at store level (#262 → #499 / #500)', () => {
  const pointStatus = (d: Device, spId: string) => d.ops.store.getState().shorePoints.find((p) => p.id === spId)!;
  const available = (d: Device, id: string) => d.inv.store.getState().items.find((i) => i.id === id)!.available;

  // Probe 1c: A initiates (received); A offline cancels; B online accepts (received first);
  // A reconnects. Cloud-first: the Accept stands, A's Cancel had no effect and A is told.
  it.each([['ingest-then-ack'], ['ack-then-ingest']] as const)('probe 1c — cancel vs accept converges on the incoming IC (A delivery: %s)', async (order) => {
    const w = newWorld(101);
    const a = await makeDevice(w, 'A', [], 0);
    const b = await makeDevice(w, 'B', [], 0);
    try {
      await online(w, a, b, [opCreated(w, a)]);
      const [init] = (await online(w, a, b, [xferInit(w, a)]))!;
      expect(b.ops.store.getState().commandTransfer?.transferId).toBe(init!.id);

      const [cancel] = (await offline(w, a, [xferResolve(w, a, 'CommandTransferCancelled', init!.id)]))!;
      expect(a.ops.store.getState().commandTransfer).toBeNull(); // A thinks it cancelled
      const [accept] = (await online(w, b, null, [xferResolve(w, b, 'CommandTransferAccepted', init!.id)]))!; // A is offline

      const units = stampReconnect(w, a, b);
      const cancelStamped = units[0]!.events[0]!;
      expect(cancelStamped.receivedAt!).toBeGreaterThan(accept!.receivedAt!);
      if (order === 'ingest-then-ack') {
        await a.ops.ingestRemote([accept]);
        await a.ops.markReceived(cancel!.id, cancelStamped.receivedAt!);
      } else {
        await a.ops.markReceived(cancel!.id, cancelStamped.receivedAt!);
        expect(currentIC(a.ops.store.getState().positions)?.value).toBe(A_UID); // not yet: the Accept hasn't arrived
        await a.ops.ingestRemote([accept]);
      }
      await b.ops.ingestRemote([cancelStamped]);

      for (const d of [a, b]) {
        const s = d.ops.store.getState();
        expect(currentIC(s.positions), `${d.name} IC`).toEqual({ ref: 'device', value: B_UID, label: `Device ${B_UID}` });
        expect(s.commandTransfer).toBeNull();
        expect(d.ops.outcomes().get(accept!.id)).toBe('applied');
        expect(d.ops.outcomes().get(cancel!.id)).toBe('no-effect');
      }
      expect(a.ops.overridden.getState().events.map((e) => e.id)).toEqual([cancel!.id]);
      expect(b.ops.overridden.getState().events).toEqual([]);
      assertConverged(w, a, b);
    } finally {
      await a.db.delete();
      await b.db.delete();
    }
  });

  // Probe 4: A offline slides Alpha Equipment Assigned → Strut Set; B online returns
  // Alpha's strut (received first). After reconnect: Alpha Pending, one unit less held.
  it.each([['ingest-then-ack'], ['ack-then-ingest']] as const)('probe 4 — strut set vs return converges on Pending with the unit back (A delivery: %s)', async (order) => {
    const w = newWorld(202);
    const rows = [invRow('inv-1', 'Rescue 2', 2)];
    const a = await makeDevice(w, 'A', rows, 0);
    const b = await makeDevice(w, 'B', rows, 0);
    try {
      await online(w, a, b, [opCreated(w, a)]);
      await online(w, a, b, [spAdded(w, a, makeSp('alpha', 1))]);
      await online(w, b, a, [deployEvt(w, b, 'alpha', rows[0]!)]);
      for (const d of [a, b]) {
        expect(d.ops.held()).toEqual({ 'inv-1': 1 });
        expect(available(d, 'inv-1')).toBe(1);
      }

      const [strutSet] = (await offline(w, a, [slideEvt(w, a, 'alpha', 'process', 'strutset')]))!;
      expect(pointStatus(a, 'alpha').status).toBe('strutset');
      const [ret] = (await online(w, b, null, [returnEvt(w, b, 'alpha')]))!;
      expect(pointStatus(b, 'alpha').status).toBe('pending');

      const units = stampReconnect(w, a, b);
      const setStamped = units[0]!.events[0]!;
      if (order === 'ingest-then-ack') {
        await a.ops.ingestRemote([ret]);
        await a.ops.markReceived(strutSet!.id, setStamped.receivedAt!);
      } else {
        await a.ops.markReceived(strutSet!.id, setStamped.receivedAt!);
        await a.ops.ingestRemote([ret]);
      }
      await b.ops.ingestRemote([setStamped]);

      for (const d of [a, b]) {
        const alpha = pointStatus(d, 'alpha');
        expect(alpha.status, `${d.name} Alpha`).toBe('pending');
        expect(alpha.deployedBom).toBeUndefined();
        expect(d.ops.held(), `${d.name} held one lower`).toEqual({});
        expect(available(d, 'inv-1')).toBe(2);
        expect(d.ops.outcomes().get(strutSet!.id)).toBe('no-effect');
        expect(d.ops.outcomes().get(ret!.id)).toBe('applied');
      }
      expect(a.ops.overridden.getState().events.map((e) => e.id)).toEqual([strutSet!.id]);
      expect(b.ops.overridden.getState().events).toEqual([]);
      assertConverged(w, a, b);
    } finally {
      await a.db.delete();
      await b.db.delete();
    }
  });

  // #500: both devices deploy the LAST unit of one row while offline.
  it.each([['A', 'B'], ['B', 'A']] as const)('#500 — last unit deployed on two different points: both stand, rig over-allocated (stamped %s first)', async (first, second) => {
    const w = newWorld(303);
    const rows = [invRow('inv-last', 'Rescue 2', 1)];
    const a = await makeDevice(w, 'A', rows, 0);
    const b = await makeDevice(w, 'B', rows, 0);
    try {
      await online(w, a, b, [opCreated(w, a)]);
      await online(w, a, b, [spAdded(w, a, makeSp('p1', 1))]);
      await online(w, b, a, [spAdded(w, b, makeSp('p2', 2))]);
      const [depA] = (await offline(w, a, [deployEvt(w, a, 'p1', rows[0]!)]))!;
      const [depB] = (await offline(w, b, [deployEvt(w, b, 'p2', rows[0]!)]))!;
      expect(available(a, 'inv-last')).toBe(0);
      expect(available(b, 'inv-last')).toBe(0);

      const units = stampReconnect(w, a, b, [first, second]);
      for (const d of [a, b]) await deliver(w, d, units, true);

      for (const d of [a, b]) {
        expect(d.ops.outcomes().get(depA!.id)).toBe('applied');
        expect(d.ops.outcomes().get(depB!.id)).toBe('applied');
        expect(pointStatus(d, 'p1').status).toBe('process');
        expect(pointStatus(d, 'p2').status).toBe('process');
        expect(d.ops.held()).toEqual({ 'inv-last': 2 });
        expect(available(d, 'inv-last'), `${d.name} over-allocated`).toBe(-1);
        expect(d.ops.overridden.getState().events).toEqual([]);
      }
      assertConverged(w, a, b);
    } finally {
      await a.db.delete();
      await b.db.delete();
    }
  });

  it.each([['A', 'B'], ['B', 'A']] as const)('#500 — the same point deployed on both devices: exactly one applies (stamped %s first)', async (first, second) => {
    const w = newWorld(404);
    const rows = [invRow('inv-last', 'Rescue 2', 1)];
    const a = await makeDevice(w, 'A', rows, 0);
    const b = await makeDevice(w, 'B', rows, 0);
    try {
      await online(w, a, b, [opCreated(w, a)]);
      await online(w, a, b, [spAdded(w, a, makeSp('p1', 1))]);
      const [depA] = (await offline(w, a, [deployEvt(w, a, 'p1', rows[0]!)]))!;
      const [depB] = (await offline(w, b, [deployEvt(w, b, 'p1', rows[0]!)]))!;

      const units = stampReconnect(w, a, b, [first, second]);
      for (const d of [a, b]) await deliver(w, d, units, true);

      const [win, lose] = first === 'A' ? [depA!, depB!] : [depB!, depA!];
      const [winner, loser] = first === 'A' ? [a, b] : [b, a];
      for (const d of [a, b]) {
        expect(d.ops.outcomes().get(win.id)).toBe('applied');
        expect(d.ops.outcomes().get(lose.id)).toBe('no-effect');
        expect(d.ops.held()).toEqual({ 'inv-last': 1 });
        expect(available(d, 'inv-last')).toBe(0);
        expect(pointStatus(d, 'p1').status).toBe('process');
      }
      expect(loser.ops.overridden.getState().events.map((e) => e.id)).toEqual([lose.id]);
      expect(winner.ops.overridden.getState().events).toEqual([]);
      assertConverged(w, a, b);
    } finally {
      await a.db.delete();
      await b.db.delete();
    }
  });
});
