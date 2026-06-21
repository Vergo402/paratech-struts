import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { createDB, type FieldShoreDB, type EventRow } from './db';
import { createInventoryStore } from './inventoryStore';
import { createOperationStore } from './operationStore';
import { NO_DEDUCTIONS } from '@core/schema';
import { newId } from '@core/id';

// F-SETUP-1: the event log is replayed forever, so a row written under an OLDER schema —
// here a ShorePointAdded whose shore point predates the now-required `deductions` field —
// must be SKIPPED on load, never folded into a card that then throws and takes the board
// (and its route) down. The store validates-then-degrades on read (operationStore.loadEvents).
describe('operationStore — validate-on-read (F-SETUP-1)', () => {
  let db: FieldShoreDB;
  afterEach(async () => {
    await db.delete();
  });

  it('boots past a malformed legacy event, keeping the valid points', async () => {
    db = createDB(`test-stale-${newId()}`);
    const base = { opId: 'op-1', at: 1, by: 'device-test' };
    await db.events.add({ type: 'OperationCreated', id: newId(), ...base, name: 'Op', multiBuilding: false } as EventRow);
    await db.events.add({
      type: 'ShorePointAdded',
      id: newId(),
      ...base,
      shorePoint: { id: 'sp-good', opId: 'op-1', division: '1', shoreType: 't-shore', measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending' },
    } as EventRow);
    // Stale: this shore point is missing the now-required `deductions` field.
    await db.events.add({
      type: 'ShorePointAdded',
      id: newId(),
      ...base,
      shorePoint: { id: 'sp-stale', opId: 'op-1', division: '1', shoreType: 't-shore', measurementEighths: 240, status: 'pending' },
    } as unknown as EventRow);

    const ops = createOperationStore({ db, inventory: createInventoryStore(db), enqueue: () => {} });
    await expect(ops.boot()).resolves.toBeUndefined(); // does NOT throw on the stale row

    const ids = ops.store.getState().shorePoints.map((s) => s.id);
    expect(ids).toContain('sp-good');
    expect(ids).not.toContain('sp-stale'); // dropped, not folded
  });
});
