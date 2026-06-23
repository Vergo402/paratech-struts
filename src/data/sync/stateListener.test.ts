import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { InventoryItem } from '@core/schema';
import { createStateListenerSync, type BlobConfig, type StateListenerSync } from './stateListener';
import type { CloudRow } from './stateSync';

// The cloud → local STATE listener (LWW), driven through an injected `subscribe` so no
// Firebase is touched. The first snapshot is a two-way merge (pull newer cloud DOWN,
// push newer/absent local UP); an empty first snapshot is never a delete.

const row = (id: string, lastWriteAt: number, quantity = 1): InventoryItem => ({
  id, type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2',
  quantity, available: quantity, lastWriteAt,
});
const cloudRow = (id: string, lastWriteAt: number, quantity = 1): CloudRow => ({
  id, type: 'strut', model: 'LS 203', system: 'LongShore', apparatus: 'Rescue 2', apparatusId: 'app-r2',
  quantity, lastWriteAt,
});

describe('stateListenerSync — cloud → local LWW', () => {
  let subs: Record<string, (snap: unknown) => void>;
  let unsub: ReturnType<typeof vi.fn>;
  let setState: ReturnType<typeof vi.fn>;
  let applyRemoteRow: ReturnType<typeof vi.fn>;
  let applyRemoteDelete: ReturnType<typeof vi.fn>;
  let onInventoryReady: ReturnType<typeof vi.fn>;
  let invRows: InventoryItem[];
  // one representative blob (apparatus); the three share the same handler
  let appStamp: number;
  let appValue: unknown;
  let appApply: ReturnType<typeof vi.fn>;

  const blobCfg = (): BlobConfig => ({
    path: 'apparatus',
    localStamp: () => appStamp,
    localValue: () => appValue,
    applyRemote: appApply,
  });

  const make = (deptId: string | null = 'dept-1'): StateListenerSync =>
    createStateListenerSync({
      deptId: () => deptId,
      setState,
      onInventoryReady,
      inventory: { rows: () => invRows, applyRemoteRow, applyRemoteDelete },
      blobs: [blobCfg()],
      subscribe: (path, cb) => {
        subs[path] = cb;
        return unsub;
      },
    });

  beforeEach(() => {
    subs = {};
    unsub = vi.fn();
    setState = vi.fn();
    applyRemoteRow = vi.fn(async () => {});
    applyRemoteDelete = vi.fn(async () => {});
    onInventoryReady = vi.fn();
    invRows = [];
    appStamp = 0;
    appValue = [];
    appApply = vi.fn(async () => {});
  });

  it('subscribes to the inventory + blob paths on start; nothing for a guest', () => {
    make().start();
    expect(Object.keys(subs).sort()).toEqual(['orgs/dept-1/apparatus', 'orgs/dept-1/inventory']);

    subs = {};
    make(null).start();
    expect(Object.keys(subs)).toHaveLength(0);
  });

  it('inventory: a newer cloud row is applied, an older one is skipped', () => {
    invRows = [row('a', 100)];
    make().start();
    subs['orgs/dept-1/inventory']!({ a: cloudRow('a', 200) }); // newer → apply
    expect(applyRemoteRow).toHaveBeenCalledTimes(1);

    applyRemoteRow.mockClear();
    subs['orgs/dept-1/inventory']!({ a: cloudRow('a', 50) }); // older → skip
    expect(applyRemoteRow).not.toHaveBeenCalled();
  });

  it('inventory: a newer tombstone deletes; an older tombstone is skipped', () => {
    invRows = [row('a', 100)];
    make().start();
    subs['orgs/dept-1/inventory']!({ a: { id: 'a', deleted: true, lastWriteAt: 200 } });
    expect(applyRemoteDelete).toHaveBeenCalledWith('a');

    applyRemoteDelete.mockClear();
    subs['orgs/dept-1/inventory']!({ a: { id: 'a', deleted: true, lastWriteAt: 50 } });
    expect(applyRemoteDelete).not.toHaveBeenCalled();
  });

  it('inventory first snapshot pushes local rows newer-than-or-absent-in-cloud UP', () => {
    invRows = [row('local-only', 100), row('newer', 300), row('older', 50)];
    make().start();
    subs['orgs/dept-1/inventory']!({ newer: cloudRow('newer', 200), older: cloudRow('older', 80) });
    // local-only (absent) + newer (300 > 200) push up; older (50 < 80) does not
    const pushed = setState.mock.calls.map((c) => c[0]);
    expect(pushed.sort()).toEqual(['inventory/local-only', 'inventory/newer']);
  });

  it('inventory steady-state (after the first) pulls but never pushes', () => {
    invRows = [row('a', 100)];
    make().start();
    subs['orgs/dept-1/inventory']!({}); // first snapshot
    setState.mockClear();
    subs['orgs/dept-1/inventory']!({ b: cloudRow('b', 500) }); // steady: pull only
    expect(applyRemoteRow).toHaveBeenCalledTimes(1);
    expect(setState).not.toHaveBeenCalled();
  });

  it('blob: a newer cloud envelope is applied; an older one is not', () => {
    appStamp = 100;
    make().start();
    subs['orgs/dept-1/apparatus']!({ value: [{ id: 'x' }], lastWriteAt: 200 });
    expect(appApply).toHaveBeenCalledWith([{ id: 'x' }], 200);

    appApply.mockClear();
    subs['orgs/dept-1/apparatus']!({ value: [{ id: 'y' }], lastWriteAt: 50 });
    expect(appApply).not.toHaveBeenCalled();
  });

  it('blob first snapshot pushes local UP when local is newer (incl. an empty cloud)', () => {
    appStamp = 300;
    appValue = [{ id: 'local' }];
    make().start();
    subs['orgs/dept-1/apparatus']!(null); // empty cloud, never a delete
    expect(setState).toHaveBeenCalledWith('apparatus', { value: [{ id: 'local' }], lastWriteAt: 300 });
    expect(appApply).not.toHaveBeenCalled();
  });

  it('blob: an un-edited local (stamp 0) against an empty cloud pushes nothing', () => {
    appStamp = 0;
    make().start();
    subs['orgs/dept-1/apparatus']!(null);
    expect(setState).not.toHaveBeenCalled();
  });

  it('fires onInventoryReady after the inventory FIRST snapshot lands (re-drives dropped deploys), once', async () => {
    invRows = [row('a', 100)];
    make().start();
    subs['orgs/dept-1/inventory']!({ a: cloudRow('a', 200) }); // first
    await Promise.resolve(); // let the applies + onInventoryReady await settle
    await Promise.resolve();
    expect(onInventoryReady).toHaveBeenCalledTimes(1);

    subs['orgs/dept-1/inventory']!({ b: cloudRow('b', 300) }); // steady → no re-fire
    await Promise.resolve();
    await Promise.resolve();
    expect(onInventoryReady).toHaveBeenCalledTimes(1);
  });

  it('start() is idempotent and stop() detaches every subscription', () => {
    const l = make();
    l.start();
    l.start();
    l.stop();
    expect(unsub).toHaveBeenCalledTimes(2); // inventory + apparatus, once each
  });
});
