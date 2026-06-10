import { db } from './db';
import { getDeviceUid } from './auth';
import { seedIfEmpty } from './seed';
import { inventoryStore } from './inventoryStore';
import { operationStore } from './operationStore';

// Boot the data layer (called once from src/app/main.tsx): open the DB, mint or
// read the device uid, seed the fixture inventory on first run, then hydrate
// both in-memory stores — events fold through projectOperation() (the log is
// the source of truth; state is a projection, ADR-009).

export interface BootResult {
  uid: string;
  seeded: boolean;
  inventoryCount: number;
  eventCount: number;
}

export async function bootData(): Promise<BootResult> {
  const uid = await getDeviceUid(db);
  const seeded = await seedIfEmpty(db);
  await inventoryStore.boot();
  await operationStore.boot();
  return {
    uid,
    seeded,
    inventoryCount: inventoryStore.store.getState().items.length,
    eventCount: await db.events.count(),
  };
}
