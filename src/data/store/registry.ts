import { createDB, deptDbName, GUEST_BUCKET, isBucketStale, type FieldShoreDB } from './db';
import { createOperationStore, type OperationStoreApi } from './operationStore';
import { sessionStore } from './session';
import { createInventoryStore, type InventoryStoreApi } from './inventoryStore';
import { createApparatusStore, type ApparatusStoreApi } from './apparatusStore';
import { createCustomTitlesStore, type CustomTitlesStoreApi } from './customTitlesStore';
import { createChecklistTemplateStore, type ChecklistTemplateStoreApi } from './checklistTemplateStore';
import { seedIfEmpty, seedApparatusRoster } from './seed';
import { syncService } from '../sync/syncService';

// data/store/registry — per-department local bucketing (cloud-sync Increment 1).
// Each department gets its OWN Dexie DB (`fieldshore-dept-<deptId>`); a guest /
// no-department member works in `fieldshore-dept-guest`. The 5 dept-scoped stores
// are RECREATED against the active bucket's DB when the department changes, so two
// departments' data can never bleed (they're in different databases). The bucket
// maps 1:1 to /orgs/{deptId} — it's the local cache the cloud sync targets.
//
// The 5 stores are exported as LIVE BINDINGS (`let`): the barrel re-exports them and
// the hooks read `store.store`. A department switch is a FULL PAGE RELOAD
// (ui/dept/switchBucket → window.location.assign), which re-imports this module and
// re-runs build()/activateBucket fresh, so the new bindings always take effect. (An
// in-process binding swap WITHOUT a reload would NOT be seen by already-mounted hooks
// — they capture store.store at render — so the reload is what makes a switch safe.)
// The global stores (session/auth/onboarding) bind to the global DB and survive a
// switch — they are NOT recreated here.

let deptDb: FieldShoreDB;
let activeBucket = '';

export let operationStore: OperationStoreApi;
export let inventoryStore: InventoryStoreApi;
export let apparatusStore: ApparatusStoreApi;
export let customTitlesStore: CustomTitlesStoreApi;
export let checklistTemplateStore: ChecklistTemplateStoreApi;

/** Construct the 5 store instances against a bucket's DB. No IO — boot does that.
 *  Does NOT set activeBucket — that's only stamped once activateBucket fully boots. */
function build(bucket: string): void {
  deptDb = createDB(deptDbName(bucket));
  inventoryStore = createInventoryStore(deptDb);
  apparatusStore = createApparatusStore(deptDb);
  customTitlesStore = createCustomTitlesStore(deptDb);
  checklistTemplateStore = createChecklistTemplateStore(deptDb);
  operationStore = createOperationStore({
    db: deptDb,
    inventory: inventoryStore,
    enqueue: (e) => syncService.enqueue(e), // wire commits to the sync queue
    // Dev-only tripwire: a commit against a bucket that no longer matches the
    // signed-in department means a switch didn't reload (ui/dept/switchBucket).
    // Checked at write time (settled state), so the brief legit reload windows
    // never false-positive; import.meta.env.DEV strips it from prod entirely.
    assertBucket: import.meta.env.DEV
      ? () => {
          const dept = sessionStore.store.getState().departmentId;
          if (isBucketStale(bucket, dept))
            console.error(
              `[bucket-guard] write to bucket "${bucket}" but the signed-in department is ` +
                `"${dept ?? 'guest'}" — a department switch did not reload (see ui/dept/switchBucket).`,
            );
        }
      : undefined,
  });
}

// Initial bind at module load → the guest bucket, so the exported live bindings are
// defined before any importer reads them. boot()/activateBucket() then select the
// real department bucket and do the seed + hydrate.
build(GUEST_BUCKET);

/** The active bucket's Dexie DB (events / inventory / dept meta). */
export function currentDeptDb(): FieldShoreDB {
  return deptDb;
}

/** The active bucket id — a deptId, or the reserved 'guest' bucket. */
export function currentBucket(): string {
  return activeBucket;
}

/**
 * Activate a department's local bucket: (re)build the 5 stores against its DB,
 * seed the demo fixtures (GUEST bucket only — a real department's stock comes from
 * import / cloud sync, never demo struts), and hydrate each from durable storage.
 * Called by boot (initial) and on every switch (create / join / leave). The prior
 * dept DB is closed first so a switch never leaves two open handles (L-6 hygiene).
 */
let activating: Promise<void> = Promise.resolve();

export function activateBucket(bucket: string): Promise<void> {
  // Serialize activations: concurrent calls (StrictMode's double-boot, a rapid
  // switch) must NOT interleave the close+rebuild — that races the open Dexie
  // transaction (DexieError2 / DatabaseClosed). Each waits for the prior, and a
  // re-activation of the already-active bucket is a no-op.
  const run = activating.then(async () => {
    if (bucket === activeBucket) return;
    if (deptDb) deptDb.close();
    build(bucket);
    // Only the guest bucket gets the synthetic try-it fixtures; a real department's
    // local cache starts empty and fills from import / the cloud listener.
    if (bucket === GUEST_BUCKET) {
      await seedIfEmpty(deptDb);
      await seedApparatusRoster(deptDb);
    }
    await inventoryStore.boot();
    await apparatusStore.boot();
    await customTitlesStore.boot();
    await checklistTemplateStore.boot();
    await operationStore.boot();
    activeBucket = bucket; // stamp only after a fully-booted activation
  });
  activating = run.catch(() => {}); // a failed activation must not wedge the chain
  return run;
}
