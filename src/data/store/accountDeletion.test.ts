import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, it, expect, afterEach } from 'vitest';
import { deleteLocalAccountData } from './accountDeletion';
import { globalDb, createDB, deptDbName } from './db';
import { AUTH_UID_KEY } from './auth';
import { SESSION_KEY, MEMBERSHIPS_KEY } from './session';
import type { InventoryItem } from '@core/schema';

const DEPT = 'dept-del-1';

const item: InventoryItem = {
  id: 'inv-1', type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'r2', quantity: 1, available: 1,
};

afterEach(async () => {
  await globalDb.meta.clear(); // singleton — clear, don't delete
  await createDB(deptDbName(DEPT)).delete().catch(() => {});
});

describe('deleteLocalAccountData (account-delete local wipe)', () => {
  it('deletes the dept bucket + session/memberships, KEEPS the device uid', async () => {
    const dept = createDB(deptDbName(DEPT));
    await dept.inventory.add(item);
    dept.close();
    await globalDb.meta.bulkPut([
      { key: AUTH_UID_KEY, value: 'device-uid-keep' },
      { key: SESSION_KEY, value: '{"identity":{"kind":"member"}}' },
      { key: MEMBERSHIPS_KEY, value: '{"acct":{}}' },
    ]);

    await deleteLocalAccountData(DEPT, 'acct');

    expect(await Dexie.exists(deptDbName(DEPT))).toBe(false); // bucket gone
    expect(await globalDb.meta.get(SESSION_KEY)).toBeUndefined();
    expect(await globalDb.meta.get(MEMBERSHIPS_KEY)).toBeUndefined();
    expect((await globalDb.meta.get(AUTH_UID_KEY))?.value).toBe('device-uid-keep'); // the floor
  });

  it('a guest (null departmentId) deletes no bucket but still clears the session', async () => {
    await globalDb.meta.put({ key: SESSION_KEY, value: '{}' });
    await deleteLocalAccountData(null, null);
    expect(await globalDb.meta.get(SESSION_KEY)).toBeUndefined();
  });

  it('removes ONLY the deleting account from a shared memberships map (keeps others)', async () => {
    await globalDb.meta.put({
      key: MEMBERSHIPS_KEY,
      value: JSON.stringify({ acctA: { id: 'dA' }, acctB: { id: 'dB' } }),
    });
    await deleteLocalAccountData(null, 'acctA'); // Capt. A deletes their account
    const row = await globalDb.meta.get(MEMBERSHIPS_KEY);
    expect(row).toBeDefined(); // row survives — Capt. B is still in it
    const map = JSON.parse(row!.value);
    expect(map.acctA).toBeUndefined();
    expect(map.acctB).toEqual({ id: 'dB' });
  });
});
