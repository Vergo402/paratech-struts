import { globalDb, GUEST_BUCKET } from './db';
import { getDeviceUid } from './auth';
import { migrateLegacyDb } from './migrate';
import { activateBucket, currentDeptDb, inventoryStore } from './registry';
import { sessionStore, type Identity } from './session';
import { onboardingStore } from './onboardingStore';

// Boot the data layer (called once from src/app/main.tsx): split the legacy DB
// into buckets (one-time, idempotent), mint/read the device uid + session from the
// GLOBAL DB, then activate the active department's bucket — opening its own Dexie
// DB, seeding the demo fixtures (guest bucket only), and hydrating the 5 dept-scoped
// stores. The event log is the source of truth; state is a projection (ADR-009).
// A later department switch re-runs activateBucket (registry.ts) and remounts.

export interface BootResult {
  uid: string;
  bucket: string;
  inventoryCount: number;
  eventCount: number;
  identityKind: Identity['kind'];
}

export async function bootData(): Promise<BootResult> {
  await migrateLegacyDb(); // one-time legacy → global + dept-bucket split
  const uid = await getDeviceUid(globalDb);
  await sessionStore.boot(uid); // reads the session row from the global DB
  const bucket = sessionStore.store.getState().departmentId || GUEST_BUCKET;
  await activateBucket(bucket); // open the dept bucket, seed (guest only), hydrate the 5 stores
  await onboardingStore.boot();
  return {
    uid,
    bucket,
    inventoryCount: inventoryStore.store.getState().items.length,
    eventCount: await currentDeptDb().events.count(),
    identityKind: sessionStore.store.getState().identity.kind,
  };
}
