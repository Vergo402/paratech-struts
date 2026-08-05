import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import { createOperationStore, type OperationStoreApi } from './operationStore';
import { newId } from '@core/id';
import { NO_DEDUCTIONS, type FieldShoreEvent, type ShorePoint } from '@core/schema';

// readShorePointHistory — the Quick View timeline read (ADR-019). The load-bearing
// logic is the filter: every event touching ONE shore point, in append order,
// including ShorePointAdded (which carries the id under shorePoint.id, not spId).

const OP = 'op-1';
const base = () => ({ id: newId(), opId: OP, at: 1, by: 'device-test' });
const opCreated = (): FieldShoreEvent => ({ type: 'OperationCreated', ...base(), name: 'Op', multiBuilding: false });
const spAdded = (sp: ShorePoint): FieldShoreEvent => ({ type: 'ShorePointAdded', ...base(), shorePoint: sp });
const edited = (spId: string, label: string): FieldShoreEvent => ({ type: 'ShorePointEdited', ...base(), spId, patch: { label } });
const makeSp = (id: string): ShorePoint => ({
  id, opId: OP, division: '1', shoreType: 't-shore', measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending',
});

describe('operationStore.readShorePointHistory', () => {
  let db: FieldShoreDB;
  let inventory: InventoryStoreApi;
  let ops: OperationStoreApi;

  beforeEach(async () => {
    db = createDB(`test-history-${newId()}`);
    inventory = createInventoryStore(db);
    ops = createOperationStore({ db, inventory, enqueue: () => {} });
    await inventory.boot();
    await ops.commit(opCreated());
    await ops.commit(spAdded(makeSp('sp-1')));
    await ops.commit(spAdded(makeSp('sp-2')));
    await ops.commit(edited('sp-1', 'A'));
    await ops.commit(edited('sp-2', 'B'));
    await ops.commit(edited('sp-1', 'C'));
  });

  afterEach(async () => {
    await db.delete();
  });

  it('returns only the target point\'s events, in append order, incl. its Added', async () => {
    const history = await ops.readShorePointHistory('sp-1');
    expect(history.map((e) => e.type)).toEqual(['ShorePointAdded', 'ShorePointEdited', 'ShorePointEdited']);
    // The Added event is matched by shorePoint.id, the edits by spId.
    expect(history.every((e) => (e.type === 'ShorePointAdded' ? e.shorePoint.id : 'spId' in e && e.spId) === 'sp-1')).toBe(true);
    // sp-2's edit (label 'B') never leaks in.
    expect(history.some((e) => e.type === 'ShorePointEdited' && e.patch.label === 'B')).toBe(false);
  });

  it('excludes operation-level events (no spId, not an Added)', async () => {
    const history = await ops.readShorePointHistory('sp-2');
    expect(history.map((e) => e.type)).toEqual(['ShorePointAdded', 'ShorePointEdited']);
  });

  it('is empty for an unknown point', async () => {
    expect(await ops.readShorePointHistory('nope')).toEqual([]);
  });
});

// #453 — a grouped ShorePointStatusChanged fans across every LOCKSTEP mate but carries
// only the TRIGGER's spId. The mates moved, so their audit trail must show it; a mate
// that was ahead or behind did NOT move, so its trail must NOT. The negative case is the
// load-bearing one — a naive "any group event" filter would fabricate history.
describe('operationStore.readShorePointHistory — group-fanned status changes (#453)', () => {
  let db: FieldShoreDB;
  let ops: OperationStoreApi;

  const grouped = (id: string, status: ShorePoint['status'], groupIndex: number): ShorePoint => ({
    ...makeSp(id),
    status,
    groupId: 'grp-1',
    groupIndex,
    groupTotal: 3,
  });
  const statusChanged = (spId: string, from: ShorePoint['status'], to: ShorePoint['status']): FieldShoreEvent => ({
    type: 'ShorePointStatusChanged',
    ...base(),
    by: 'device-trigger',
    at: 4242,
    spId,
    from,
    to,
  });

  beforeEach(async () => {
    db = createDB(`test-history-fan-${newId()}`);
    const inventory = createInventoryStore(db);
    ops = createOperationStore({ db, inventory, enqueue: () => {} });
    await inventory.boot();
    await ops.commit(opCreated());
    // Two legs in lockstep at Equipment Assigned; the third already ahead at Strut Set.
    await ops.commit(spAdded(grouped('leg-a', 'process', 1))); // groupIndex is 1-based
    await ops.commit(spAdded(grouped('leg-b', 'process', 2)));
    await ops.commit(spAdded(grouped('leg-ahead', 'strutset', 3)));
    // Trigger on leg-a: process → strutset, inside the group zone, so it fans.
    await ops.commit(statusChanged('leg-a', 'process', 'strutset'));
  });

  afterEach(async () => {
    await db.delete();
  });

  it('the fanned mate carries the change, attributed to the trigger\'s actor and time', async () => {
    const history = await ops.readShorePointHistory('leg-b');
    expect(history.map((e) => e.type)).toEqual(['ShorePointAdded', 'ShorePointStatusChanged']);
    const change = history[1]!;
    expect(change.by).toBe('device-trigger');
    expect(change.at).toBe(4242);
  });

  it('the mate that was AHEAD (never moved) does not get the entry', async () => {
    const history = await ops.readShorePointHistory('leg-ahead');
    expect(history.map((e) => e.type)).toEqual(['ShorePointAdded']);
  });

  it('an INDIVIDUAL-phase edge (leaves the group zone) reaches only the trigger', async () => {
    // Both legs are now at Strut Set; walk leg-a to cutting (group-wide), then to
    // runner — the Send-to-Runner edge leaves the zone and is per-card (#223).
    await ops.commit(statusChanged('leg-a', 'strutset', 'cutting'));
    await ops.commit(statusChanged('leg-a', 'cutting', 'runner'));
    const b = await ops.readShorePointHistory('leg-b');
    // leg-b got the two group-zone fans, never the runner handoff.
    expect(b.filter((e) => e.type === 'ShorePointStatusChanged')).toHaveLength(2);
    expect(b.some((e) => e.type === 'ShorePointStatusChanged' && e.to === 'runner')).toBe(false);
  });

  it('an ungrouped point is unaffected by a grouped neighbour\'s change', async () => {
    await ops.commit(spAdded({ ...makeSp('solo'), status: 'process' }));
    await ops.commit(statusChanged('leg-a', 'strutset', 'cutting'));
    expect((await ops.readShorePointHistory('solo')).map((e) => e.type)).toEqual(['ShorePointAdded']);
  });
});
