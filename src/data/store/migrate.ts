import Dexie from 'dexie';
import { globalDb, createDB, deptDbName, GUEST_BUCKET, LEGACY_DB_NAME } from './db';
import { AUTH_UID_KEY } from './auth';
import { SESSION_KEY, MEMBERSHIPS_KEY } from './session';
import { ONBOARDING_KEY } from './onboardingStore';
import { APPARATUS_ROSTER_KEY } from './apparatusStore';
import { CUSTOM_TITLES_KEY } from './customTitlesStore';
import { CHECKLIST_TEMPLATES_KEY } from './checklistTemplateStore';

// data/store/migrate — one-time split of the LEGACY single-tenant `fieldshore` DB
// into the global DB (device/account meta) + the active department's bucket
// (events/inventory/dept-meta). Runs first on boot, before any store hydrates.
// Idempotent via a flag in global meta. Routes the dept-scoped data to the bucket
// implied by the legacy session's departmentId — a guest (no dept) routes to the
// guest bucket. Verbatim copies (events keep their seq order); the immutable log
// is relocated, never rewritten (ADR-009). Once the split is done the orphaned
// legacy DB is deleted (SIM-IV O-1, #399) so it can't mislead debugging/tooling —
// a separate one-time flag runs the cleanup even on devices migrated by an earlier
// release (where MIGRATION_FLAG is already set).

const MIGRATION_FLAG = 'fieldshore_migrated_buckets_v1';
const LEGACY_DELETED_FLAG = 'fieldshore_legacy_db_deleted_v1';
const GLOBAL_META_KEYS = [AUTH_UID_KEY, SESSION_KEY, MEMBERSHIPS_KEY, ONBOARDING_KEY];
const DEPT_META_KEYS = [APPARATUS_ROSTER_KEY, CUSTOM_TITLES_KEY, CHECKLIST_TEMPLATES_KEY];

let migrating: Promise<void> | null = null;

/**
 * Single-flight wrapper: StrictMode's double-invoke of bootData (and a Splash-retry
 * fired while a slow legacy-upgrade migration is still in flight) call this
 * concurrently. The flag read (`:get`) and write (`:put`) are NOT atomic, so two
 * racing runs could both pass the guard and both bulkPut. Coalesce concurrent callers
 * onto the one in-flight migration; once it settles, the flag fast-paths every later call.
 */
export function migrateLegacyDb(): Promise<void> {
  if (migrating) return migrating;
  migrating = runMigration()
    .then(deleteLegacyDb)
    .finally(() => {
      migrating = null;
    });
  return migrating;
}

/**
 * One-time deletion of the orphaned legacy `fieldshore` DB. Safe because it runs
 * AFTER runMigration has copied its rows out and closed its throwaway handle (or
 * after an earlier release already did — the fast path sets MIGRATION_FLAG before
 * returning), so no live handle holds the legacy DB. Guarded by its own flag so an
 * already-migrated device still cleans up on its next boot, and a fresh install
 * marks it done without probing IndexedDB every boot.
 */
async function deleteLegacyDb(): Promise<void> {
  if (await globalDb.meta.get(LEGACY_DELETED_FLAG)) return;
  if (await Dexie.exists(LEGACY_DB_NAME)) await Dexie.delete(LEGACY_DB_NAME);
  await globalDb.meta.put({ key: LEGACY_DELETED_FLAG, value: 'true' });
}

async function runMigration(): Promise<void> {
  // Already migrated (also the steady-state fast path once the flag is set).
  if (await globalDb.meta.get(MIGRATION_FLAG)) return;

  // Fresh install — no legacy DB to split. Set the flag without opening (creating)
  // an empty legacy DB, and return.
  if (!(await Dexie.exists(LEGACY_DB_NAME))) {
    await globalDb.meta.put({ key: MIGRATION_FLAG, value: 'true' });
    return;
  }

  // A throwaway handle to the legacy DB — opened only to read its rows out, then
  // closed. deleteLegacyDb removes the DB itself once the split is recorded; nothing
  // keeps a long-lived legacy handle (that orphan connection is the SIM-IV O-1 trap).
  const legacy = createDB(LEGACY_DB_NAME);
  try {
    // 1. Global meta rows → the global DB.
    for (const key of GLOBAL_META_KEYS) {
      const row = await legacy.meta.get(key);
      if (row) await globalDb.meta.put(row);
    }

    // 2. Route dept-scoped data to the bucket implied by the legacy session.
    let bucket = GUEST_BUCKET;
    const sessionRow = await legacy.meta.get(SESSION_KEY);
    if (sessionRow) {
      try {
        const parsed = JSON.parse(sessionRow.value) as { departmentId?: string | null };
        if (parsed.departmentId) bucket = parsed.departmentId;
      } catch {
        /* malformed session → guest bucket (safe) */
      }
    }

    // A short-lived second handle to this bucket (boot's activateBucket opens its own
    // right after); close it when the copy is done so it doesn't linger for the page life.
    const deptDb = createDB(deptDbName(bucket));
    try {
      const events = await legacy.events.toArray();
      if (events.length) await deptDb.events.bulkPut(events); // preserves seq order
      const inventory = await legacy.inventory.toArray();
      if (inventory.length) await deptDb.inventory.bulkPut(inventory);
      for (const key of DEPT_META_KEYS) {
        const row = await legacy.meta.get(key);
        if (row) await deptDb.meta.put(row);
      }
    } finally {
      deptDb.close();
    }
  } finally {
    legacy.close();
  }

  // 3. Mark done (idempotent vs a reload mid-migration; concurrent boots coalesce above).
  await globalDb.meta.put({ key: MIGRATION_FLAG, value: 'true' });
}
