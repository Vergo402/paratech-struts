import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { migrateLegacyDb } from './migrate';
import { globalDb, createDB, deptDbName, GUEST_BUCKET, LEGACY_DB_NAME } from './db';
import { AUTH_UID_KEY } from './auth';
import { SESSION_KEY } from './session';
import { APPARATUS_ROSTER_KEY } from './apparatusStore';
import type { InventoryItem } from '@core/schema';

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

describe('legacy DB migration (single-tenant → global + dept bucket)', () => {
  // A FRESH legacy handle per test. The migration now deletes the legacy DB after
  // the split, which force-closes any open handle to it — a reused singleton would
  // be poisoned for the next test, so each test opens its own instance.
  let legacy: ReturnType<typeof createDB>;
  beforeEach(() => {
    legacy = createDB(LEGACY_DB_NAME);
  });
  afterEach(async () => {
    await globalDb.meta.clear(); // resets the migration + deletion flags
    await Dexie.delete(LEGACY_DB_NAME); // drop any legacy DB a test left behind
    await createDB(deptDbName('dept-1')).delete();
    await createDB(deptDbName(GUEST_BUCKET)).delete();
  });

  it('routes global meta to the global DB and dept data to the active dept bucket', async () => {
    await legacy.meta.bulkPut([
      { key: AUTH_UID_KEY, value: 'uid-legacy' },
      { key: SESSION_KEY, value: JSON.stringify({ departmentId: 'dept-1' }) },
      { key: APPARATUS_ROSTER_KEY, value: '[]' }, // a dept-scoped meta row
    ]);
    await legacy.inventory.add(item('inv-1'));

    await migrateLegacyDb();

    // Global rows landed in the global DB.
    expect((await globalDb.meta.get(AUTH_UID_KEY))?.value).toBe('uid-legacy');
    expect((await globalDb.meta.get(SESSION_KEY))?.value).toContain('dept-1');
    // The global DB must NOT carry the dept-scoped roster.
    expect(await globalDb.meta.get(APPARATUS_ROSTER_KEY)).toBeUndefined();

    // Dept-scoped data landed in the dept-1 bucket.
    const deptDb = createDB(deptDbName('dept-1'));
    expect(await deptDb.inventory.get('inv-1')).toBeTruthy();
    expect((await deptDb.meta.get(APPARATUS_ROSTER_KEY))?.value).toBe('[]');
    deptDb.close();
  });

  it('is idempotent — a second run never re-copies', async () => {
    await legacy.inventory.add(item('inv-x')); // no session → guest bucket
    await migrateLegacyDb();
    // The legacy DB is deleted after the split; even a re-appeared legacy DB must be
    // ignored by a second run (the flag short-circuits, never re-copies).
    const revived = createDB(LEGACY_DB_NAME);
    await revived.inventory.add(item('inv-y'));
    revived.close();
    await migrateLegacyDb();

    const guest = createDB(deptDbName(GUEST_BUCKET));
    expect(await guest.inventory.get('inv-x')).toBeTruthy();
    expect(await guest.inventory.get('inv-y')).toBeUndefined(); // not re-migrated
    guest.close();
  });

  it('deletes the orphaned legacy DB once the split is done (O-1, #399)', async () => {
    await legacy.inventory.add(item('inv-del')); // no session → guest bucket
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(true);

    await migrateLegacyDb();

    // The orphan is gone…
    expect(await Dexie.exists(LEGACY_DB_NAME)).toBe(false);
    // …but its rows were copied out first (never a lossy delete).
    const guest = createDB(deptDbName(GUEST_BUCKET));
    expect(await guest.inventory.get('inv-del')).toBeTruthy();
    guest.close();
  });

  it('coalesces concurrent callers onto one migration (single-flight)', async () => {
    await legacy.inventory.add(item('inv-c')); // no session → guest bucket
    const p1 = migrateLegacyDb();
    const p2 = migrateLegacyDb();
    expect(p1).toBe(p2); // same in-flight promise — not a second racing migration
    await Promise.all([p1, p2]);
    const guest = createDB(deptDbName(GUEST_BUCKET));
    expect(await guest.inventory.get('inv-c')).toBeTruthy();
    guest.close();
  });
});
