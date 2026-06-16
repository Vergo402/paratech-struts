import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createSessionStore, SESSION_KEY, type SessionStoreApi } from './session';
import { newId } from '@core/id';
import type { InventoryItem } from '@core/schema';

const UID = 'device-test-uid';
const member = { accountId: 'acc-1', displayName: 'Capt. T. Marchetti' };

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
    expect(JSON.parse(row!.value)).toEqual({ identity: { kind: 'member', ...member }, departmentId: null });
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
});
