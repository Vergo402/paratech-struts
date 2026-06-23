import 'fake-indexeddb/auto';
import { describe, it, expect, afterEach } from 'vitest';
import { globalDb } from './db';
import { currentDeptDb } from './registry';
import { bootData } from './boot';
import { sessionStore } from './session';

// bootData() runs against the singleton db + stores; fake-indexeddb/auto isolates
// this file's default DB. One test pins the wiring glue the per-store tests
// can't: that bootData threads the minted device uid INTO the session (reuse,
// not re-mint — the ADR-024 floor) and reports a guest identity on a clean DB.
describe('bootData() wiring', () => {
  afterEach(async () => {
    await currentDeptDb().delete();
    await globalDb.delete();
  });

  it('threads the minted device uid into the session and boots to guest', async () => {
    const result = await bootData();
    expect(result.uid).not.toBe('');
    expect(result.uid).toBe(sessionStore.store.getState().deviceUid); // reused, not re-minted
    expect(result.identityKind).toBe('guest');
  });
});
