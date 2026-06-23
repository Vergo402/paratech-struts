import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { migrateLegacyDb } from './migrate';
import { legacyDb, globalDb, createDB, deptDbName, GUEST_BUCKET } from './db';
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
  afterEach(async () => {
    // Clear (not delete) the singleton DBs so the next test can reuse them — a
    // Dexie .delete() closes the instance and fake-indexeddb won't reopen it.
    await legacyDb.meta.clear();
    await legacyDb.inventory.clear();
    await legacyDb.events.clear();
    await globalDb.meta.clear(); // also clears the one-time migration flag
    // The dept buckets are throwaway handles — deleting them is fine.
    await createDB(deptDbName('dept-1')).delete();
    await createDB(deptDbName(GUEST_BUCKET)).delete();
  });

  it('routes global meta to the global DB and dept data to the active dept bucket', async () => {
    await legacyDb.meta.bulkPut([
      { key: AUTH_UID_KEY, value: 'uid-legacy' },
      { key: SESSION_KEY, value: JSON.stringify({ departmentId: 'dept-1' }) },
      { key: APPARATUS_ROSTER_KEY, value: '[]' }, // a dept-scoped meta row
    ]);
    await legacyDb.inventory.add(item('inv-1'));

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
    await legacyDb.inventory.add(item('inv-x')); // no session → guest bucket
    await migrateLegacyDb();
    // Mutate the legacy DB AFTER migrating; a second run must ignore it.
    await legacyDb.inventory.add(item('inv-y'));
    await migrateLegacyDb();

    const guest = createDB(deptDbName(GUEST_BUCKET));
    expect(await guest.inventory.get('inv-x')).toBeTruthy();
    expect(await guest.inventory.get('inv-y')).toBeUndefined(); // not re-migrated
    guest.close();
  });

  it('coalesces concurrent callers onto one migration (single-flight)', async () => {
    await legacyDb.inventory.add(item('inv-c')); // no session → guest bucket
    const p1 = migrateLegacyDb();
    const p2 = migrateLegacyDb();
    expect(p1).toBe(p2); // same in-flight promise — not a second racing migration
    await Promise.all([p1, p2]);
    const guest = createDB(deptDbName(GUEST_BUCKET));
    expect(await guest.inventory.get('inv-c')).toBeTruthy();
    guest.close();
  });
});
