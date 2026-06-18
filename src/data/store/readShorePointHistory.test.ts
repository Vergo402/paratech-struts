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
