import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FieldShoreEvent } from '@core/schema';
import { createEventListenerSync, stripSeq, type EventListenerSync } from './eventListener';

// The cloud → local listener, driven through an injected `subscribe` so no Firebase
// is touched. The first snapshot is a TWO-WAY merge (push un-synced local backlog UP,
// pull cloud DOWN); an empty first snapshot is never a delete.

const ev = (id: string): FieldShoreEvent => ({ type: 'OperationEnded', id, opId: 'op-1', at: 1, by: 'dev' });

/** Build an RTDB {opId}→{eventId}→event snapshot from a flat event list. */
const snap = (events: FieldShoreEvent[]): Record<string, Record<string, FieldShoreEvent>> => {
  const out: Record<string, Record<string, FieldShoreEvent>> = {};
  for (const e of events) {
    (out[e.opId] ??= {})[e.id] = e;
  }
  return out;
};

/** Let firstMerge's localEvents + reconcile promise chain settle. */
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('eventListenerSync — cloud → local, first-snapshot two-way merge', () => {
  let reconcile: ReturnType<typeof vi.fn>;
  let flush: ReturnType<typeof vi.fn>;
  let enqueue: ReturnType<typeof vi.fn>;
  let unsubSpy: ReturnType<typeof vi.fn>;
  let cb: ((snap: unknown) => void) | null;
  let lastPath: string;
  let local: FieldShoreEvent[];

  const make = (deptId: string | null = 'dept-1'): EventListenerSync =>
    createEventListenerSync({
      deptId: () => deptId,
      localEvents: async () => local,
      reconcile,
      enqueue,
      flush,
      subscribe: (path, c) => {
        lastPath = path;
        cb = c;
        return unsubSpy;
      },
    });

  beforeEach(() => {
    reconcile = vi.fn(async () => ({ applied: [], dropped: [] }));
    flush = vi.fn(async () => {});
    enqueue = vi.fn();
    unsubSpy = vi.fn();
    cb = null;
    lastPath = '';
    local = [];
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
    expect(enqueue).toHaveBeenCalledTimes(2); // both local events re-queued for upload
    expect(flush).toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled(); // nothing to pull — and NOT a wipe
  });

  it('a local event absent from the cloud is enqueued + flushed (backlog rebuild after a reload)', async () => {
    local = [ev('a'), ev('stranded')]; // 'stranded' never reached the cloud
    make().start();
    cb!(snap([ev('a')])); // cloud has only a
    await settle();
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]![0].id).toBe('stranded');
    expect(flush).toHaveBeenCalled();
    expect(reconcile).toHaveBeenCalledTimes(1); // pull a down as well
  });

  it('non-empty first snapshot whose events are all local pushes nothing, pulls the cloud set down', async () => {
    local = [ev('a')];
    make().start();
    cb!(snap([ev('a'), ev('cloud-1')]));
    await settle();
    expect(enqueue).not.toHaveBeenCalled(); // a is already in the cloud → no backlog
    expect(reconcile).toHaveBeenCalledTimes(1);
    const passed = reconcile.mock.calls[0]![0] as FieldShoreEvent[];
    expect(passed.map((e) => e.id).sort()).toEqual(['a', 'cloud-1']);
  });

  it('steady-state snapshots (after the first) only reconcile', async () => {
    make().start();
    cb!(snap([ev('a')])); // first → merge
    await settle();
    reconcile.mockClear();
    enqueue.mockClear();
    flush.mockClear();

    cb!(snap([ev('b')])); // second → reconcile only
    await settle();
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(enqueue).not.toHaveBeenCalled();
    expect(flush).not.toHaveBeenCalled();
  });

  it('start() is idempotent and stop() detaches', () => {
    const l = make();
    l.start();
    l.start();
    l.stop();
    expect(unsubSpy).toHaveBeenCalledTimes(1);
  });

  it('stripSeq removes the local-only seq key so it never leaks to the cloud wire event', () => {
    const stripped = stripSeq({ ...ev('a'), seq: 42 });
    expect(stripped).not.toHaveProperty('seq');
    expect(stripped.id).toBe('a'); // the rest of the event is preserved
  });
});
