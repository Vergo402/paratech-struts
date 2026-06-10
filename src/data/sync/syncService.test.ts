import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDB, type FieldShoreDB } from '../store/db';
import { createInventoryStore, type InventoryStoreApi } from '../store/inventoryStore';
import { createOperationStore, type OperationStoreApi } from '../store/operationStore';
import { createSyncService, type SyncServiceApi } from './syncService';
import { newId } from '@core/id';
import {
  NO_DEDUCTIONS,
  type FieldShoreEvent,
  type InventoryItem,
  type ShorePoint,
  type ShorePointStatus,
} from '@core/schema';

// The sync seam stub: a real L-7 merge guard over a no-op transport. Local
// state below is advanced to 'cutting' so stale-peer regressions have teeth.

const OP = 'op-1';
const base = () => ({ id: newId(), opId: OP, at: 1, by: 'device-peer' });

const opCreated = (): FieldShoreEvent => ({ type: 'OperationCreated', ...base(), name: 'Test Op', multiBuilding: false });
const spAdded = (sp: ShorePoint): FieldShoreEvent => ({ type: 'ShorePointAdded', ...base(), shorePoint: sp });
const statusChanged = (spId: string, from: ShorePointStatus, to: ShorePointStatus): FieldShoreEvent => ({
  type: 'ShorePointStatusChanged', ...base(), spId, from, to,
});
const deploy = (spId: string, inventoryId: string): FieldShoreEvent => ({
  type: 'StrutDeployed', ...base(), spId, deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId },
});

const makeSp = (id: string): ShorePoint => ({
  id, opId: OP, division: '1', shoreType: 't-shore',
  measurementEighths: 240, deductions: NO_DEDUCTIONS, status: 'pending',
});

const invItem: InventoryItem = {
  id: 'inv-1', type: 'strut', model: 'LS 203', system: 'LongShore',
  apparatus: 'Rescue 2', apparatusId: 'app-r2', quantity: 2, available: 2,
};

describe('syncService (stub seam, real L-7 merge guard)', () => {
  let db: FieldShoreDB;
  let inventory: InventoryStoreApi;
  let ops: OperationStoreApi;
  let sync: SyncServiceApi;

  const localStatus = () => ops.store.getState().shorePoints.find((s) => s.id === 'sp-1')!.status;

  beforeEach(async () => {
    db = createDB(`test-sync-${newId()}`);
    inventory = createInventoryStore(db);
    // Two-step wiring mirrors the singletons' lazy cycle: sync sees ops
    // through an accessor; ops enqueues into sync.
    sync = createSyncService({ ops: () => ops });
    ops = createOperationStore({ db, inventory, enqueue: (e) => sync.enqueue(e) });

    await db.inventory.add(invItem);
    await inventory.boot();
    await ops.commit(opCreated());
    await ops.commit(spAdded(makeSp('sp-1')));
    await ops.commit(deploy('sp-1', 'inv-1')); // pending → process
    await ops.commit(statusChanged('sp-1', 'process', 'strutset'));
    await ops.commit(statusChanged('sp-1', 'strutset', 'cutting'));
  });

  afterEach(async () => {
    await db.delete();
  });

  it('drops a stale peer event premised on state older than ours (L-7) — it never enters the log', async () => {
    const before = await db.events.count();
    const stale = statusChanged('sp-1', 'strutset', 'process'); // peer never saw our advance to cutting
    const { applied, dropped } = await sync.reconcile([stale]);
    expect(applied).toHaveLength(0);
    expect(dropped).toEqual([stale]);
    expect(await db.events.count()).toBe(before);
    expect(localStatus()).toBe('cutting');
  });

  it('applies a deliberate peer step-back premised on our exact current status (ADR-010)', async () => {
    const stepBack = statusChanged('sp-1', 'cutting', 'strutset');
    const { applied, dropped } = await sync.reconcile([stepBack]);
    expect(applied).toEqual([stepBack]);
    expect(dropped).toHaveLength(0);
    expect(localStatus()).toBe('strutset');
  });

  it('applies a forward peer event through the one commit path without re-enqueueing it', async () => {
    const queueBefore = sync.pendingCount(); // the 5 local commits
    const forward = statusChanged('sp-1', 'cutting', 'runner');
    const { applied } = await sync.reconcile([forward]);
    expect(applied).toEqual([forward]);
    expect(localStatus()).toBe('runner');
    expect(sync.pendingCount()).toBe(queueBefore); // fromRemote — no echo
  });

  it('drops a peer event already merged once (duplicate id fails the unique index)', async () => {
    const forward = statusChanged('sp-1', 'cutting', 'runner');
    await sync.reconcile([forward]);
    const again = await sync.reconcile([forward]);
    expect(again.applied).toHaveLength(0);
    expect(again.dropped).toEqual([forward]);
    expect(localStatus()).toBe('runner');
  });

  it('reports per-row sync state: local commits are queued, merged peer events are not', async () => {
    const local = statusChanged('sp-1', 'cutting', 'runner');
    await ops.commit(local);
    expect(sync.getRowSyncState(local.id)).toBe('queued');

    const peer = statusChanged('sp-1', 'runner', 'secured');
    await sync.reconcile([peer]);
    expect(sync.getRowSyncState(peer.id)).toBe('synced');
  });

  it('flush is a documented no-op in this slice — the queue survives it', async () => {
    const before = sync.pendingCount();
    await sync.flush();
    expect(sync.pendingCount()).toBe(before);
  });
});
