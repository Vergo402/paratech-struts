import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Hoist the Firebase-seam mock before session.ts (which reaches it for the
// /userDepts reverse index) runs. getMock/setMock are controllable per test;
// the recovery suite routes get() by path. Default: no cloud entry, set resolves.
const { getMock, setMock } = vi.hoisted(() => ({ getMock: vi.fn(), setMock: vi.fn() }));
vi.mock('../sync/firebase', () => ({
  rtdb: {},
  ref: (_: unknown, path: string) => ({ path }),
  get: getMock,
  set: setMock,
}));

import { createDB, type FieldShoreDB } from './db';
import { createSessionStore, SESSION_KEY, MEMBERSHIPS_KEY, type SessionStoreApi } from './session';
import { newId } from '@core/id';
import type { InventoryItem } from '@core/schema';

const UID = 'device-test-uid';
const member = { accountId: 'acc-1', displayName: 'Capt. T. Marchetti' };

const okSnap = (val: unknown) => ({ exists: () => val != null, val: () => val });
/** Route get({path}) to a fixture map; unknown paths resolve to a non-existent snap. */
const routeGet = (map: Record<string, unknown>) => ({ path }: { path: string }) =>
  Promise.resolve(okSnap(map[path] ?? null));

// A sentinel inventory row sign-out must never touch (workflow 06 §Step 4).
const sentinel: InventoryItem = {
  id: 'inv-sentinel', type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 1, available: 1,
};

describe('session store (guest ⇄ member, persisted)', () => {
  let db: FieldShoreDB;
  let name: string;
  let session: SessionStoreApi;

  beforeEach(() => {
    getMock.mockReset().mockResolvedValue({ exists: () => false });
    setMock.mockReset().mockResolvedValue(undefined);
    name = `test-session-${newId()}`;
    db = createDB(name);
    session = createSessionStore(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('defaults to guest when nothing is persisted', async () => {
    await session.boot(UID);
    const s = session.store.getState();
    expect(s.identity).toEqual({ kind: 'guest' });
    expect(s.departmentId).toBeNull();
    expect(s.deviceUid).toBe(UID);
  });

  it('a member survives a hydrate round-trip (reopen the same database)', async () => {
    await session.boot(UID);
    await session.setMember(member);

    const reopened = createDB(name);
    const next = createSessionStore(reopened);
    await next.boot(UID);
    expect(next.store.getState().identity).toEqual({ kind: 'member', ...member });
    reopened.close();
  });

  it('setGuest returns to guest and preserves the device uid', async () => {
    await session.boot(UID);
    await session.setMember(member);
    await session.setGuest();
    const s = session.store.getState();
    expect(s.identity).toEqual({ kind: 'guest' });
    expect(s.deviceUid).toBe(UID);
  });

  it('setGuest never wipes local work (the inventory table is untouched)', async () => {
    await session.boot(UID);
    await db.inventory.add(sentinel);
    const before = await db.inventory.count();
    await session.setMember(member);
    await session.setGuest();
    expect(await db.inventory.count()).toBe(before);
    expect(await db.inventory.get('inv-sentinel')).toBeDefined();
  });

  it('boot reuses the passed device uid instead of re-minting one', async () => {
    await session.boot('arbitrary-uid-123');
    expect(session.store.getState().deviceUid).toBe('arbitrary-uid-123');
  });

  it('persists the member shape without leaking deviceUid into the stored row', async () => {
    await session.boot(UID);
    await session.setMember(member);
    const row = await db.meta.get(SESSION_KEY);
    expect(row).toBeDefined();
    // deviceUid has its own meta row — it must NOT be duplicated into the session blob.
    expect(JSON.parse(row!.value)).toEqual({
      identity: { kind: 'member', ...member },
      departmentId: null,
      departmentName: null,
      role: null,
      inviteCode: null,
    });
  });

  it('a sign-out survives a hydrate round-trip (reopen stays guest, not back to member)', async () => {
    await session.boot(UID);
    await session.setMember(member);
    await session.setGuest();

    const reopened = createDB(name);
    const next = createSessionStore(reopened);
    await next.boot(UID);
    expect(next.store.getState().identity).toEqual({ kind: 'guest' });
    reopened.close();
  });

  it('degrades to guest on any unreadable or wrong-shape row (boot never throws)', async () => {
    const bad = [
      'not json {',                                          // syntax error
      'null', '42', '"member"', '[]', '{}',                  // valid JSON, wrong shape
      '{"identity":{"kind":"member"}}',                      // member missing accountId/displayName
      '{"identity":{"kind":"member","accountId":"a","displayName":""},"departmentId":null}', // empty name (ADR-025)
      '{"identity":{"kind":"bogus"},"departmentId":null}',   // unknown kind
    ];
    for (const value of bad) {
      await db.meta.put({ key: SESSION_KEY, value });
      await expect(session.boot(UID)).resolves.toBeUndefined();
      expect(session.store.getState().identity).toEqual({ kind: 'guest' });
    }
  });

  it('setDepartment attaches the dept + role + invite code and survives a hydrate round-trip', async () => {
    await session.boot(UID);
    await session.setMember(member);
    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' });
    const s = session.store.getState();
    expect(s.departmentId).toBe('dept-1');
    expect(s.departmentName).toBe('Hamden Fire Rescue');
    expect(s.role).toBe('admin');
    expect(s.inviteCode).toBe('ABCD-2345');

    const reopened = createDB(name);
    const next = createSessionStore(reopened);
    await next.boot(UID);
    const r = next.store.getState();
    expect(r.identity).toEqual({ kind: 'member', ...member });
    expect(r.departmentId).toBe('dept-1');
    expect(r.departmentName).toBe('Hamden Fire Rescue');
    expect(r.role).toBe('admin');
    expect(r.inviteCode).toBe('ABCD-2345'); // the code is retrievable after the success sheet closes
    reopened.close();
  });

  it('setGuest clears the department projection', async () => {
    await session.boot(UID);
    await session.setMember(member);
    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' });
    await session.setGuest();
    const s = session.store.getState();
    expect(s.identity).toEqual({ kind: 'guest' });
    expect(s.departmentId).toBeNull();
    expect(s.departmentName).toBeNull();
    expect(s.role).toBeNull();
    expect(s.inviteCode).toBeNull();
  });

  it('setMember preserves an already-attached department (the auth-restore re-confirm)', async () => {
    await session.boot(UID);
    await session.setMember(member);
    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' });
    await session.setMember(member); // re-confirm the same member
    expect(session.store.getState().departmentId).toBe('dept-1');
  });

  it('restores the dept + invite code on sign-out → sign-in (account-keyed memory)', async () => {
    await session.boot(UID);
    await session.setMember(member);
    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' });
    await session.setGuest();              // sign out wipes the session row...
    await session.setMember(member);       // ...but signing back in re-discovers it
    const s = session.store.getState();
    expect(s.departmentId).toBe('dept-1');
    expect(s.departmentName).toBe('Hamden Fire Rescue');
    expect(s.role).toBe('admin');
    expect(s.inviteCode).toBe('ABCD-2345');
  });

  it('keeps the account-keyed memory account-scoped (account B never inherits A’s dept/code)', async () => {
    const accountB = { accountId: 'acc-2', displayName: 'Lt. R. Okafor' };
    await session.boot(UID);
    await session.setMember(member);       // account A
    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' });
    await session.setGuest();
    await session.setMember(accountB);     // a different account on the same device
    const s = session.store.getState();
    expect(s.identity).toEqual({ kind: 'member', ...accountB });
    expect(s.departmentId).toBeNull();
    expect(s.inviteCode).toBeNull();
  });

  it('setGuest leaves the account-keyed memory intact (so re-sign-in can restore it)', async () => {
    await session.boot(UID);
    await session.setMember(member);
    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' });
    await session.setGuest();
    expect(await db.meta.get(MEMBERSHIPS_KEY)).toBeDefined();
  });
});

// New-device recovery (#371 follow-up): the local account-keyed memory is empty on a
// device that has never signed in, so setMember falls back to the cloud reverse index
// /userDepts/{uid}, then re-reads the authoritative member record for the live role.
describe('session store — new-device department recovery (cloud reverse index)', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;

  beforeEach(() => {
    getMock.mockReset().mockResolvedValue({ exists: () => false });
    setMock.mockReset().mockResolvedValue(undefined);
    db = createDB(`test-recovery-${newId()}`);
    session = createSessionStore(db);
  });
  afterEach(async () => {
    await db.delete();
  });

  it('recovers the department from the cloud reverse index on a cache miss', async () => {
    getMock.mockImplementation(
      routeGet({
        'userDepts/acc-1': { deptId: 'dept-1', deptName: 'Hamden Fire Rescue', inviteCode: 'ABCD-2345' },
        'orgs/dept-1/members/acc-1': { role: 'admin' },
      }),
    );
    await session.boot(UID);
    await session.setMember(member); // local cache empty → recover from cloud
    const s = session.store.getState();
    expect(s.departmentId).toBe('dept-1');
    expect(s.departmentName).toBe('Hamden Fire Rescue');
    expect(s.role).toBe('admin'); // authoritative role from the member record, not the index
    expect(s.inviteCode).toBe('ABCD-2345');
  });

  it('a removed/revoked member (member record gone) falls through to the set-up screen', async () => {
    getMock.mockImplementation(
      routeGet({
        'userDepts/acc-1': { deptId: 'dept-1', deptName: 'Hamden Fire Rescue', inviteCode: 'ABCD-2345' },
        'orgs/dept-1/members/acc-1': null, // index points at a dept they no longer belong to
      }),
    );
    await session.boot(UID);
    await session.setMember(member);
    const s = session.store.getState();
    expect(s.identity).toEqual({ kind: 'member', ...member });
    expect(s.departmentId).toBeNull(); // no stale role — RequireDepartment shows set-up
  });

  it('no reverse-index entry → stays department-less (a pre-seed account)', async () => {
    getMock.mockResolvedValue({ exists: () => false });
    await session.boot(UID);
    await session.setMember(member);
    expect(session.store.getState().departmentId).toBeNull();
  });

  it('an offline cloud read degrades to the set-up screen (never throws)', async () => {
    getMock.mockRejectedValue(new Error('network'));
    await session.boot(UID);
    await expect(session.setMember(member)).resolves.toBeUndefined();
    expect(session.store.getState().departmentId).toBeNull();
  });

  it('seedUserDeptIndex writes /userDepts/{uid} from current state, no-ops without a dept', async () => {
    await session.boot(UID);
    await session.setMember(member);
    setMock.mockClear();
    session.seedUserDeptIndex(); // member but no department yet → no write
    expect(setMock).not.toHaveBeenCalled();

    await session.setDepartment({ id: 'dept-1', name: 'Hamden Fire Rescue', role: 'admin', inviteCode: 'ABCD-2345' });
    setMock.mockClear();
    session.seedUserDeptIndex();
    expect(setMock).toHaveBeenCalledWith(
      { path: 'userDepts/acc-1' },
      { deptId: 'dept-1', deptName: 'Hamden Fire Rescue', inviteCode: 'ABCD-2345' },
    );
  });
});
