import { db } from './db';
import { getDeviceUid } from './auth';
import { seedIfEmpty, seedApparatusRoster } from './seed';
import { inventoryStore } from './inventoryStore';
import { apparatusStore } from './apparatusStore';
import { customTitlesStore } from './customTitlesStore';
import { checklistTemplateStore } from './checklistTemplateStore';
import { operationStore } from './operationStore';
import { sessionStore, type Identity } from './session';
import { onboardingStore } from './onboardingStore';

// Boot the data layer (called once from src/app/main.tsx): open the DB, mint or
// read the device uid, seed the fixture inventory on first run, then hydrate the
// in-memory stores — events fold through projectOperation() (the log is the
// source of truth; state is a projection, ADR-009). The session hydrates from
// its own meta row, reusing the just-minted device uid (workflow 06).

export interface BootResult {
  uid: string;
  seeded: boolean;
  inventoryCount: number;
  eventCount: number;
  identityKind: Identity['kind'];
}

export async function bootData(): Promise<BootResult> {
  const uid = await getDeviceUid(db);
  const seeded = await seedIfEmpty(db);
  // Unconditional + idempotent (no-ops once the roster row exists): also backfills the
  // roster on an upgrade from a build that seeded inventory before the roster store —
  // safe because pre-Inventory-block the only stock was ever the fixture, whose ids match.
  await seedApparatusRoster(db);
  await inventoryStore.boot();
  await apparatusStore.boot();
  await customTitlesStore.boot();
  await checklistTemplateStore.boot();
  await operationStore.boot();
  await sessionStore.boot(uid); // after getDeviceUid — reuses the minted uid
  await onboardingStore.boot();
  return {
    uid,
    seeded,
    inventoryCount: inventoryStore.store.getState().items.length,
    eventCount: await db.events.count(),
    identityKind: sessionStore.store.getState().identity.kind,
  };
}
