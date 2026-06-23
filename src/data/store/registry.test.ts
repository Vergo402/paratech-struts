import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { activateBucket, inventoryStore, currentDeptDb } from './registry';
import { createDB, deptDbName, GUEST_BUCKET } from './db';
import type { InventoryItem } from '@core/schema';

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
