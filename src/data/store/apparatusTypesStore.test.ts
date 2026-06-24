import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import {
  createApparatusTypesStore,
  APPARATUS_TYPES_KEY,
  type ApparatusTypesStoreApi,
} from './apparatusTypesStore';
import type { ApparatusTypeCustom } from '@core/schema';
import { newId } from '@core/id';

describe('apparatus types store (meta-JSON vocabulary)', () => {
  let db: FieldShoreDB;
  let store: ApparatusTypesStoreApi;

  beforeEach(() => {
    db = createDB(`test-at-${newId()}`);
    store = createApparatusTypesStore(db);
  });
  afterEach(async () => {
    await db.delete();
  });

  it('adds a type and persists it across a hydrate round-trip', async () => {
    await store.boot();
    const t: ApparatusTypeCustom = { id: 'at-1', name: 'Water Tender' };
    await store.addType(t);
    const next = createApparatusTypesStore(db);
    await next.boot();
    expect(next.store.getState().types).toEqual([t]);
  });

  it('removeType drops one and persists across a re-boot', async () => {
    await store.boot();
    await store.addType({ id: 'a', name: 'Crane' });
    await store.addType({ id: 'b', name: 'Drone' });
    await store.removeType('a');
    const next = createApparatusTypesStore(db);
    await next.boot();
    expect(next.store.getState().types.map((t) => t.id)).toEqual(['b']);
  });

  it('boot degrades to an empty vocabulary on an unreadable/wrong-shape row (never throws)', async () => {
    for (const value of ['not json {', 'null', '42', '{"x":1}', '[{"id":"x"}]']) {
      await db.meta.put({ key: APPARATUS_TYPES_KEY, value });
      await expect(store.boot()).resolves.toBeUndefined();
      expect(store.store.getState().types).toEqual([]);
    }
  });
});

// ---- cloud-sync (whole-blob LWW) -------------------------------------------
describe('apparatus types store — LWW blob wrap / unwrap', () => {
  let db: FieldShoreDB;
  let blobs: { value: ApparatusTypeCustom[]; lastWriteAt: number }[];
  let store: ApparatusTypesStoreApi;

  beforeEach(async () => {
    db = createDB(`test-at-lww-${newId()}`);
    blobs = [];
    store = createApparatusTypesStore(db, { onBlob: (env) => blobs.push(env) });
    await store.boot();
  });
  afterEach(async () => {
    await db.delete();
  });

  it('persist wraps { value, lastWriteAt } and fires the cloud hook; localStamp tracks it', async () => {
    await store.addType({ id: 'a', name: 'Crane' });
    const raw = JSON.parse((await db.meta.get(APPARATUS_TYPES_KEY))!.value);
    expect(raw).toMatchObject({ value: [{ id: 'a' }], lastWriteAt: expect.any(Number) });
    expect(store.localStamp()).toBe(raw.lastWriteAt);
    expect(blobs.at(-1)!.value.map((t) => t.id)).toEqual(['a']);
  });

  it('applyRemote replaces the vocabulary, preserves the remote stamp, and does not echo', async () => {
    await store.applyRemote([{ id: 'r', name: 'Remote Rig' }], 500);
    expect(store.store.getState().types.map((t) => t.id)).toEqual(['r']);
    expect(store.localStamp()).toBe(500);
    expect(blobs).toHaveLength(0); // pulled down → never re-pushed
    const next = createApparatusTypesStore(db);
    await next.boot();
    expect(next.localStamp()).toBe(500); // durable
  });
});
