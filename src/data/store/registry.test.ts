import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  activateBucket,
  inventoryStore,
  apparatusStore,
  operationStore,
  currentDeptDb,
} from './registry';
import { createDB, deptDbName, GUEST_BUCKET } from './db';
import { sessionStore } from './session';
import { syncService } from '../sync/syncService';
import type { InventoryItem, FieldShoreEvent } from '@core/schema';

// The anti-bleed proof for per-department bucketing: switching A→B→A keeps each
// department's local data in its OWN database, and switching never leaks one into
// the other. Inventory (a direct Dexie table) is the simplest probe.

const item = (id: string): InventoryItem => ({
  id,
  type: 'strut',
  model: 'LS 203',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'r2',
  quantity: 1,
  available: 1,
});

const ids = () =>
  inventoryStore.store
    .getState()
    .items.map((i) => i.id)
    .sort();

async function addAndReload(id: string): Promise<void> {
  await currentDeptDb().inventory.add(item(id));
  await inventoryStore.boot(); // re-hydrate the mirror from the active bucket
}

describe('store registry — per-department isolation', () => {
  afterEach(async () => {
    for (const b of ['dept-A', 'dept-B', GUEST_BUCKET]) {
      await createDB(deptDbName(b)).delete();
    }
  });

  it('switching A→B→A keeps each department bucket separate (no bleed)', async () => {
    await activateBucket('dept-A');
    await addAndReload('a1');
    expect(ids()).toEqual(['a1']);

    // Switch to B — a different department's bucket is its OWN database, so it's
    // empty; A's row must NOT appear here.
    await activateBucket('dept-B');
    expect(ids()).toEqual([]);
    await addAndReload('b1');
    expect(ids()).toEqual(['b1']);

    // Switch back to A — its row survived on disk; B's row is nowhere in sight.
    await activateBucket('dept-A');
    expect(ids()).toEqual(['a1']);

    // And B still has only its own row.
    await activateBucket('dept-B');
    expect(ids()).toEqual(['b1']);
  });

  it('a real department bucket starts empty (only the guest bucket gets demo fixtures)', async () => {
    await activateBucket('dept-A');
    expect(ids()).toEqual([]); // no seeded struts in a real department

    await activateBucket(GUEST_BUCKET);
    expect(inventoryStore.store.getState().items.length).toBeGreaterThan(0); // demo fixtures
  });
});

// Proves the dev-only bucket guard is actually WIRED, not just that isBucketStale is
// correct (db.test.ts): the registry must inject the closure into operationStore AND a
// commit must call it. A silent break here would give false confidence that a "forgot
// to reload" regression would be caught. (import.meta.env.DEV is true under vitest.)
describe('store registry — dev bucket guard wiring', () => {
  const opCreated = (): FieldShoreEvent => ({
    type: 'OperationCreated', id: 'evt-1', opId: 'op-1', at: 1, by: 'device-test', name: 'Op', multiBuilding: false,
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await createDB(deptDbName('dept-real')).delete();
  });

  it('console.errors when a commit lands on a bucket that does not match the session dept', async () => {
    await activateBucket('dept-real'); // stores now bound to the dept-real bucket
    sessionStore.store.setState({ departmentId: 'dept-OTHER' }); // a switch that never reloaded
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await operationStore.commit(opCreated());

    expect(res.ok).toBe(true); // the guard warns; it never blocks the write
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[bucket-guard]'));
  });

  it('stays silent when the bucket matches the session dept', async () => {
    await activateBucket('dept-real');
    sessionStore.store.setState({ departmentId: 'dept-real' }); // matched — no regression
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await operationStore.commit(opCreated());

    expect(spy).not.toHaveBeenCalled();
  });
});

// Proves the cloud-sync Increment 3 push hooks are WIRED into the dept-scoped stores:
// a manual stock edit reaches syncService.setState at the right path, with `available`
// stripped (event-owned). The store-level proof that deploy/return DON'T push lives in
// inventoryStore.test.ts (applyDeploy/ReturnTxn take no hooks).
describe('store registry — non-event cloud-push wiring (Increment 3)', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await createDB(deptDbName('dept-sync')).delete();
  });

  it('a manual inventory edit pushes to orgs-relative inventory/{id} without available', async () => {
    await activateBucket('dept-sync');
    const spy = vi.spyOn(syncService, 'setState').mockResolvedValue();

    const id = await inventoryStore.addOne({
      apparatus: 'Rescue 2', apparatusId: 'app-r2', type: 'strut', model: 'LS 203', system: 'LongShore',
    });

    expect(spy).toHaveBeenCalledWith(`inventory/${id}`, expect.objectContaining({ id, quantity: 1, lastWriteAt: expect.any(Number) }));
    const payload = spy.mock.calls[0]![1] as Record<string, unknown>;
    expect('available' in payload).toBe(false); // available is event-owned, never synced
  });

  it('an apparatus edit pushes the whole roster blob to the apparatus path', async () => {
    await activateBucket('dept-sync');
    const spy = vi.spyOn(syncService, 'setState').mockResolvedValue();

    await apparatusStore.addApparatus({ id: 'app-1', name: 'Engine 1', type: 'Engine' });

    expect(spy).toHaveBeenCalledWith('apparatus', expect.objectContaining({ value: expect.any(Array), lastWriteAt: expect.any(Number) }));
  });
});
