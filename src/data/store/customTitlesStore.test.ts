import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from './db';
import { createCustomTitlesStore, CUSTOM_TITLES_KEY, type CustomTitlesStoreApi } from './customTitlesStore';
import type { CustomTitle } from '@core/schema';
import { newId } from '@core/id';

describe('custom titles store (meta-JSON library)', () => {
  let db: FieldShoreDB;
  let store: CustomTitlesStoreApi;

  beforeEach(() => {
    db = createDB(`test-ct-${newId()}`);
    store = createCustomTitlesStore(db);
  });
  afterEach(async () => {
    await db.delete();
  });

  it('adds a title and persists it across a hydrate round-trip', async () => {
    await store.boot();
    const t: CustomTitle = { id: 'ct-1', title: 'Tunneling Group Supervisor', kind: 'group' };
    await store.addTitle(t);
    const next = createCustomTitlesStore(db);
    await next.boot();
    expect(next.store.getState().titles).toEqual([t]);
  });

  it('keeps a team template with members through the round-trip', async () => {
    await store.boot();
    const team: CustomTitle = {
      id: 'ct-team',
      title: 'Engine Strike Team',
      kind: 'strike-team',
      members: [{ type: 'Engine', count: 3 }],
    };
    await store.addTitle(team);
    const next = createCustomTitlesStore(db);
    await next.boot();
    expect(next.store.getState().titles[0]).toEqual(team);
  });

  it('removeTitle drops one and persists across a re-boot', async () => {
    await store.boot();
    await store.addTitle({ id: 'a', title: 'A', kind: 'group' });
    await store.addTitle({ id: 'b', title: 'B', kind: 'unit' });
    await store.removeTitle('a');
    const next = createCustomTitlesStore(db);
    await next.boot();
    expect(next.store.getState().titles.map((t) => t.id)).toEqual(['b']);
  });

  it('boot degrades to an empty library on an unreadable/wrong-shape row (never throws)', async () => {
    for (const value of ['not json {', 'null', '42', '{"x":1}', '[{"id":"x"}]']) {
      await db.meta.put({ key: CUSTOM_TITLES_KEY, value });
      await expect(store.boot()).resolves.toBeUndefined();
      expect(store.store.getState().titles).toEqual([]);
    }
  });
});

// ---- cloud-sync Increment 3 (whole-blob LWW) -------------------------------
describe('custom titles store — LWW blob wrap / unwrap', () => {
  let db: FieldShoreDB;
  let blobs: { value: CustomTitle[]; lastWriteAt: number }[];
  let store: CustomTitlesStoreApi;

  beforeEach(async () => {
    db = createDB(`test-ct-lww-${newId()}`);
    blobs = [];
    store = createCustomTitlesStore(db, { onBlob: (env) => blobs.push(env) });
    await store.boot();
  });
  afterEach(async () => {
    await db.delete();
  });

  it('persist wraps { value, lastWriteAt } and fires the cloud hook; localStamp tracks it', async () => {
    await store.addTitle({ id: 'a', title: 'A', kind: 'group' });
    const raw = JSON.parse((await db.meta.get(CUSTOM_TITLES_KEY))!.value);
    expect(raw).toMatchObject({ value: [{ id: 'a' }], lastWriteAt: expect.any(Number) });
    expect(store.localStamp()).toBe(raw.lastWriteAt);
    expect(blobs.at(-1)!.value.map((t) => t.id)).toEqual(['a']);
  });

  it('boot unwraps a bare pre-Increment-3 row as the oldest (lastWriteAt 0)', async () => {
    await db.meta.put({ key: CUSTOM_TITLES_KEY, value: JSON.stringify([{ id: 'legacy', title: 'L', kind: 'group' }]) });
    await store.boot();
    expect(store.store.getState().titles.map((t) => t.id)).toEqual(['legacy']);
    expect(store.localStamp()).toBe(0);
  });

  it('applyRemote replaces the library, preserves the remote stamp, and does not echo', async () => {
    await store.applyRemote([{ id: 'r', title: 'Remote', kind: 'group' }], 500);
    expect(store.store.getState().titles.map((t) => t.id)).toEqual(['r']);
    expect(store.localStamp()).toBe(500);
    expect(blobs).toHaveLength(0); // pulled down → never re-pushed
    const next = createCustomTitlesStore(db);
    await next.boot();
    expect(next.localStamp()).toBe(500); // durable
  });
});
