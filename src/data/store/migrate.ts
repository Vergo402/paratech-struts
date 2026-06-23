import Dexie from 'dexie';
import { legacyDb, globalDb, createDB, deptDbName, GUEST_BUCKET, LEGACY_DB_NAME } from './db';
import { AUTH_UID_KEY } from './auth';
import { SESSION_KEY, MEMBERSHIPS_KEY } from './session';
import { ONBOARDING_KEY } from './onboardingStore';
import { APPARATUS_ROSTER_KEY } from './apparatusStore';
import { CUSTOM_TITLES_KEY } from './customTitlesStore';
import { CHECKLIST_TEMPLATES_KEY } from './checklistTemplateStore';

// data/store/migrate — one-time split of the LEGACY single-tenant `fieldshore` DB
// into the global DB (device/account meta) + the active department's bucket
// (events/inventory/dept-meta). Runs first on boot, before any store hydrates.
// Idempotent via a flag in global meta; the legacy DB is left in place as a safety
// net (a later release can delete it). Routes the dept-scoped data to the bucket
// implied by the legacy session's departmentId — a guest (no dept) routes to the
// guest bucket. Verbatim copies (events keep their seq order); the immutable log
// is relocated, never rewritten (ADR-009).

const MIGRATION_FLAG = 'fieldshore_migrated_buckets_v1';
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
  migrating = runMigration().finally(() => {
    migrating = null;
  });
  return migrating;
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

  // 1. Global meta rows → the global DB.
  for (const key of GLOBAL_META_KEYS) {
    const row = await legacyDb.meta.get(key);
    if (row) await globalDb.meta.put(row);
  }

  // 2. Route dept-scoped data to the bucket implied by the legacy session.
  let bucket = GUEST_BUCKET;
  const sessionRow = await legacyDb.meta.get(SESSION_KEY);
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
    const events = await legacyDb.events.toArray();
    if (events.length) await deptDb.events.bulkPut(events); // preserves seq order
    const inventory = await legacyDb.inventory.toArray();
    if (inventory.length) await deptDb.inventory.bulkPut(inventory);
    for (const key of DEPT_META_KEYS) {
      const row = await legacyDb.meta.get(key);
      if (row) await deptDb.meta.put(row);
    }
  } finally {
    deptDb.close();
  }

  // 3. Mark done (idempotent vs a reload mid-migration; concurrent boots coalesce above).
  await globalDb.meta.put({ key: MIGRATION_FLAG, value: 'true' });
}
