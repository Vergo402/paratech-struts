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
