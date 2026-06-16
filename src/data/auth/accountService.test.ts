import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from '../store/db';
import { createSessionStore, SESSION_KEY, type SessionStoreApi } from '../store/session';
import { createAccountService, type AccountServiceApi } from './accountService';
import { newId } from '@core/id';
import type { InventoryItem } from '@core/schema';

const UID = 'device-test-uid';

const sentinel: InventoryItem = {
  id: 'inv-sentinel', type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 1, available: 1,
};

describe('accountService (stub seam — create / sign in / sign out)', () => {
  let db: FieldShoreDB;
  let session: SessionStoreApi;
  let account: AccountServiceApi;

  beforeEach(async () => {
    db = createDB(`test-account-${newId()}`);
    session = createSessionStore(db);
    account = createAccountService({ session: () => session });
    await session.boot(UID);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('rejects create-account with an empty display name and writes nothing', async () => {
    const res = await account.createAccount({ email: 'r@d.gov', password: 'pw', displayName: '' });
    expect(res.ok).toBe(false);
    expect(session.store.getState().identity).toEqual({ kind: 'guest' });
    // "nothing is written on reject" is a durable claim (ADR-025) — assert the row, not just memory.
    expect(await db.meta.get(SESSION_KEY)).toBeUndefined();
  });

  it('rejects a whitespace-only display name', async () => {
    const res = await account.createAccount({ email: 'r@d.gov', password: 'pw', displayName: '   ' });
    expect(res.ok).toBe(false);
    expect(session.store.getState().identity.kind).toBe('guest');
  });

  it('creates a member session and trims the display name', async () => {
    const res = await account.createAccount({ email: 'r@d.gov', password: 'pw', displayName: '  Capt. Reyes  ' });
    expect(res.ok).toBe(true);
    const identity = session.store.getState().identity;
    expect(identity.kind).toBe('member');
    if (identity.kind === 'member') expect(identity.displayName).toBe('Capt. Reyes');
  });

  it('signs a member in', async () => {
    const res = await account.signIn({ email: 'reyes@dept14.gov', password: 'pw' });
    expect(res.ok).toBe(true);
    expect(session.store.getState().identity.kind).toBe('member');
  });

  it('signs out back to guest', async () => {
    await account.signIn({ email: 'reyes@dept14.gov', password: 'pw' });
    await account.signOut();
    expect(session.store.getState().identity).toEqual({ kind: 'guest' });
  });

  it('sign-out preserves local work (inventory intact)', async () => {
    await db.inventory.add(sentinel);
    const before = await db.inventory.count();
    await account.signIn({ email: 'reyes@dept14.gov', password: 'pw' });
    await account.signOut();
    expect(await db.inventory.count()).toBe(before);
  });
});
