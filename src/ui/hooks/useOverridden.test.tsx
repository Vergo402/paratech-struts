// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newId } from '@core/id';
import { NO_DEDUCTIONS, type FieldShoreEvent, type ShorePoint } from '@core/schema';
import { REJECTED_LINE } from '@core/audit';
import { createDB, type FieldShoreDB } from '@data/store/db';
import { createOperationStore, type OperationStoreApi } from '@data/store/operationStore';

// The "had no effect" list over a REAL operation store (real Dexie): the hook merges the
// server-rejected rows (#471) with the lost-race rows (#499), rejected first.
const holder = vi.hoisted(() => ({ ops: null as unknown as OperationStoreApi }));
vi.mock('@data/store', () => ({
  get operationStore() {
    return holder.ops;
  },
}));

import { useOverridden } from './useOverridden';

const OP = 'op-1';
const ME = 'device-me';
const PEER = 'device-peer';
const sp: ShorePoint = {
  id: 'sp-1', opId: OP, seq: 1, label: 'Alpha', division: '1', shoreType: 't-shore',
  measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending',
};
const ev = (x: object, by = ME): FieldShoreEvent => ({ id: newId(), opId: OP, at: 1, by, ...x }) as FieldShoreEvent;

describe('useOverridden (#471 + #499) over a real store', () => {
  let db: FieldShoreDB;

  beforeEach(async () => {
    db = createDB(`test-overridden-${newId()}`);
    holder.ops = createOperationStore({ db, deviceUid: () => ME });
    // The op and its point came from the cloud (received), so later own work folds on top.
    await holder.ops.ingestRemote([
      { ...ev({ type: 'OperationCreated', name: 'Op', multiBuilding: false }, PEER), receivedAt: 10 },
      { ...ev({ type: 'ShorePointAdded', shorePoint: sp }, PEER), receivedAt: 11 },
    ]);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('no rows when both lists are empty', () => {
    const { result } = renderHook(() => useOverridden());
    expect(result.current.rows).toEqual([]);
  });

  it('rejected rows come first, then the lost-race rows; Got it clears both lists', async () => {
    // A lost race: my provisional re-measure loses to a peer ending the op (received first).
    const mine = ev({ type: 'ShorePointEdited', spId: 'sp-1', patch: { measurementEighths: 250 } });
    expect(await holder.ops.commit(mine)).toEqual({ ok: true });
    await holder.ops.ingestRemote([{ ...ev({ type: 'OperationEnded' }, PEER), receivedAt: 12 }]);
    expect(holder.ops.overridden.getState().events.map((e) => e.id)).toEqual([mine.id]);
    // A server-refused change, quarantined by the sync layer.
    const refused = ev({ type: 'PositionRenamed', positionId: 'pos-x', title: 'Ops 2' });
    expect(await holder.ops.commit(refused)).toEqual({ ok: true });
    await holder.ops.quarantine([refused], 'PERMISSION_DENIED');

    const { result } = renderHook(() => useOverridden());
    expect(result.current.rows.map((r) => r.id)).toEqual([refused.id, mine.id]);
    expect(result.current.rows[0]!.line).toBe(REJECTED_LINE);
    expect(result.current.rows[0]!.who).toBe('this device');
    expect(result.current.rows[1]!.line).toBe('Your change had no effect.');

    act(() => result.current.acknowledge());
    expect(result.current.rows).toEqual([]);
    expect(holder.ops.overridden.getState().events).toEqual([]);
    expect(holder.ops.rejected.getState().events).toEqual([]);
  });

  it('a rejected row alone (no lost race) still shows', async () => {
    const refused = ev({ type: 'PositionRenamed', positionId: 'pos-x', title: 'Ops 2' });
    await holder.ops.commit(refused);
    await holder.ops.quarantine([refused], 'PERMISSION_DENIED');
    const { result } = renderHook(() => useOverridden());
    expect(result.current.rows.map((r) => r.line)).toEqual([REJECTED_LINE]);
  });
});
