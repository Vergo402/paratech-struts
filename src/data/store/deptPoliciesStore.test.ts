import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import {
  createDeptPoliciesStore,
  DEPT_POLICIES_KEY,
  type DeptPoliciesStoreApi,
} from './deptPoliciesStore';
import { newId } from '@core/id';

describe('dept policies store (object meta-blob, default-on)', () => {
  let db: FieldShoreDB;
  let store: DeptPoliciesStoreApi;

  beforeEach(() => {
    db = createDB(`test-dp-${newId()}`);
    store = createDeptPoliciesStore(db);
  });
  afterEach(async () => {
    await db.delete();
  });

  it('defaults afterActionEmail ON when there is no stored row', async () => {
    await store.boot();
    expect(store.store.getState().afterActionEmail).toBe(true);
  });

  it('disabling persists false across a re-boot', async () => {
    await store.boot();
    await store.setAfterActionEmail(false);
    const next = createDeptPoliciesStore(db);
    await next.boot();
    expect(next.store.getState().afterActionEmail).toBe(false);
  });

  it('boot degrades to defaults on an unreadable/wrong-shape row (never throws)', async () => {
    for (const value of ['not json {', 'null', '42', '[1,2]', '{"afterActionEmail":"yes"}']) {
      await db.meta.put({ key: DEPT_POLICIES_KEY, value });
      await expect(store.boot()).resolves.toBeUndefined();
      expect(store.store.getState().afterActionEmail).toBe(true);
    }
  });
});

// ---- cloud-sync (whole-blob LWW) -------------------------------------------
describe('dept policies store — LWW blob wrap / unwrap', () => {
  let db: FieldShoreDB;
  let blobs: { value: { afterActionEmail: boolean }; lastWriteAt: number }[];
  let store: DeptPoliciesStoreApi;

  beforeEach(async () => {
    db = createDB(`test-dp-lww-${newId()}`);
    blobs = [];
    store = createDeptPoliciesStore(db, { onBlob: (env) => blobs.push(env) });
    await store.boot();
  });
  afterEach(async () => {
    await db.delete();
  });

  it('set wraps { value, lastWriteAt } and fires the cloud hook; localStamp tracks it', async () => {
    await store.setAfterActionEmail(false);
    const raw = JSON.parse((await db.meta.get(DEPT_POLICIES_KEY))!.value);
    expect(raw).toMatchObject({ value: { afterActionEmail: false }, lastWriteAt: expect.any(Number) });
    expect(store.localStamp()).toBe(raw.lastWriteAt);
    expect(blobs.at(-1)!.value).toEqual({ afterActionEmail: false });
  });

  it('applyRemote replaces the policy, preserves the remote stamp, and does not echo', async () => {
    await store.applyRemote({ afterActionEmail: false }, 500);
    expect(store.store.getState().afterActionEmail).toBe(false);
    expect(store.localStamp()).toBe(500);
    expect(blobs).toHaveLength(0); // pulled down → never re-pushed
    const next = createDeptPoliciesStore(db);
    await next.boot();
    expect(next.localStamp()).toBe(500); // durable
  });
});
