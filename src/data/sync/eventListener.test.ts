import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FieldShoreEvent } from '@core/schema';
import { createEventListenerSync, type EventListenerSync } from './eventListener';
import { createCloudIndex, type CloudIndex } from './cloudIndex';
import type { ReconcileOptions } from './syncService';

// The cloud → local listener, driven through an injected `subscribe` so no Firebase
// is touched. Every snapshot refreshes the cloud index FIRST, then reconciles the whole
// department (single-flight, latest-wins). The first snapshot is a TWO-WAY merge: push the
// never-received local backlog UP in canonical order, pull the cloud DOWN without tracking
// overridden changes; an empty first snapshot is never a delete.

const ev = (id: string, extra: Partial<FieldShoreEvent> = {}): FieldShoreEvent =>
  ({ type: 'OperationEnded', id, opId: 'op-1', at: 1, by: 'dev', ...extra }) as FieldShoreEvent;

/** Build an RTDB {opId}→{eventId}→event snapshot from a flat event list. */
const snap = (events: FieldShoreEvent[]): Record<string, Record<string, FieldShoreEvent>> => {
  const out: Record<string, Record<string, FieldShoreEvent>> = {};
  for (const e of events) {
    (out[e.opId] ??= {})[e.id] = e;
  }
  return out;
};

/** Let the listener's promise chain settle. */
const settle = () => new Promise((r) => setTimeout(r, 0));

type ReconcileFn = (cloud: readonly unknown[], opts: ReconcileOptions) => Promise<unknown>;
const ids = (cloud: readonly unknown[]) => (cloud as FieldShoreEvent[]).map((e) => e.id).sort();

describe('eventListenerSync — cloud → local (ADR-041)', () => {
  let reconcile: ReturnType<typeof vi.fn<ReconcileFn>>;
  let flush: ReturnType<typeof vi.fn>;
  let enqueue: ReturnType<typeof vi.fn>;
  let unsubSpy: ReturnType<typeof vi.fn>;
  let cb: ((snap: unknown) => void) | null;
  let lastPath: string;
  let local: FieldShoreEvent[];
  let cloud: CloudIndex;

  const make = (deptId: string | null = 'dept-1'): EventListenerSync =>
    createEventListenerSync({
      deptId: () => deptId,
      localEvents: async () => local,
      reconcile,
      enqueue,
      flush,
      cloud,
      subscribe: (path, c) => {
        lastPath = path;
        cb = c;
        return unsubSpy;
      },
    });

  beforeEach(() => {
    reconcile = vi.fn<ReconcileFn>(async () => ({ inserted: [], applied: [], stamped: [] }));
    flush = vi.fn(async () => {});
    enqueue = vi.fn();
    unsubSpy = vi.fn();
    cb = null;
    lastPath = '';
    local = [];
    cloud = createCloudIndex();
  });

  it('subscribes to orgs/{deptId}/events on start, and not at all for a guest', () => {
    make().start();
    expect(lastPath).toBe('orgs/dept-1/events');

    cb = null;
    make(null).start(); // guest → no cloud listener
    expect(cb).toBeNull();
  });

  it('empty first snapshot with a local backlog pushes UP — never treats empty as a delete', async () => {
    local = [ev('a'), ev('b')];
    make().start();
    cb!(null); // cloud empty
    await settle();
    expect(enqueue).toHaveBeenCalledTimes(2);
    expect(flush).toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled(); // nothing to pull — and NOT a wipe
  });

  it('first-merge backlog = never-received local events absent from the cloud, in canonical order', async () => {
    local = [
      ev('in-cloud'), //                                       already uploaded
      ev('stamped', { receivedAt: 5 }), //                     received once — never re-upload
      ev('late', { at: 30 }),
      ev('b-early', { at: 10 }),
      ev('a-early', { at: 10 }), //                            same `at` → id breaks the tie
    ];
    make().start();
    cb!(snap([ev('in-cloud')]));
    await settle();
    expect(enqueue.mock.calls.map((c) => (c[0] as FieldShoreEvent).id)).toEqual(['a-early', 'b-early', 'late']);
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('the first merge tracks ONLY the backlog ids; steady-state snapshots track everything', async () => {
    local = [ev('a', { receivedAt: 3 }), ev('offline-1', { at: 2 }), ev('stamped-gone', { receivedAt: 4 })];
    make().start();
    cb!(snap([ev('a', { receivedAt: 3 })]));
    await settle();
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(ids(reconcile.mock.calls[0]![0])).toEqual(['a']);
    expect(reconcile.mock.calls[0]![1]).toEqual({ trackOverridden: true, onlyIds: new Set(['offline-1']) });

    enqueue.mockClear();
    flush.mockClear();
    cb!(snap([ev('a'), ev('b')]));
    await settle();
    expect(reconcile).toHaveBeenCalledTimes(2);
    expect(ids(reconcile.mock.calls[1]![0])).toEqual(['a', 'b']); // the WHOLE department
    expect(reconcile.mock.calls[1]![1]).toEqual({ trackOverridden: true });
    expect(enqueue).not.toHaveBeenCalled(); // no backlog rebuild after the first merge
    expect(flush).not.toHaveBeenCalled();
  });

  it('replaces the cloud index BEFORE reconcile runs (a pending flush reads the server stamp from it)', async () => {
    const seen: boolean[] = [];
    reconcile.mockImplementation(async () => {
      seen.push(cloud.has('a') && cloud.receivedAt('a') === 77);
      return {};
    });
    make().start();
    cb!(snap([ev('a', { receivedAt: 77 })]));
    expect(cloud.receivedAt('a')).toBe(77); // synchronously, inside the callback
    await settle();
    expect(seen).toEqual([true]);
  });

  it('single-flight: three snapshots during one in-flight reconcile → exactly one more pass, on the latest', async () => {
    make().start();
    cb!(snap([ev('a')])); // first merge
    await settle();
    reconcile.mockClear();

    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    reconcile.mockImplementationOnce(async () => {
      await gate;
      return {};
    });
    cb!(snap([ev('a'), ev('b')])); // in flight
    await settle();
    cb!(snap([ev('a'), ev('b'), ev('c')]));
    cb!(snap([ev('a'), ev('b'), ev('c'), ev('d')]));
    cb!(snap([ev('a'), ev('b'), ev('c'), ev('d'), ev('e')])); // the latest
    expect(cloud.has('e')).toBe(true); // the index tracks every snapshot even while gated
    await settle();
    expect(reconcile).toHaveBeenCalledTimes(1);

    release();
    await settle();
    expect(reconcile).toHaveBeenCalledTimes(2);
    expect(ids(reconcile.mock.calls[1]![0])).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('a failed reconcile never wedges the listener', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    make().start();
    cb!(snap([ev('a')]));
    await settle();
    reconcile.mockRejectedValueOnce(new Error('boom'));
    cb!(snap([ev('a'), ev('b')]));
    await settle();
    cb!(snap([ev('a'), ev('b'), ev('c')]));
    await settle();
    expect(reconcile).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('start() is idempotent, clears a stale index, and stop() detaches and clears', () => {
    cloud.replace([{ id: 'other-dept', receivedAt: 1 }]);
    const l = make();
    l.start();
    expect(cloud.size()).toBe(0); // a previous department's ids never vouch for this one
    l.start();
    cb!(snap([ev('a')]));
    expect(cloud.has('a')).toBe(true);
    l.stop();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
    expect(cloud.size()).toBe(0);
  });
});
