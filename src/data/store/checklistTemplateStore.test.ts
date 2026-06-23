import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newId } from '@core/id';
import { BASELINE_TEMPLATES, addChild, moveBefore, leavesOf } from '@core/checklist';
import { createDB, type FieldShoreDB } from './db';
import { createChecklistTemplateStore, type ChecklistTemplateStoreApi } from './checklistTemplateStore';

let db: FieldShoreDB;
let store: ChecklistTemplateStoreApi;

beforeEach(async () => {
  db = createDB(`test-${newId()}`);
  store = createChecklistTemplateStore(db);
  await store.boot();
});
afterEach(() => db.delete());

const taskLeaves = () => leavesOf({ id: 'r', label: 'r', children: store.effective('task-level').nodes }).length;

describe('checklistTemplateStore', () => {
  it('serves the FieldShore baseline until edited', () => {
    expect(store.effective('task-level')).toBe(BASELINE_TEMPLATES['task-level']);
    expect(store.effective('task-level').source).toBe('fieldshore-baseline');
  });

  it('setNodes forks: source flips to department and the change persists across reboot', async () => {
    const before = taskLeaves();
    const t = store.effective('task-level');
    const firstSection = t.nodes[0]!.id;
    await store.setNodes('task-level', addChild(t.nodes, firstSection, { id: 'x', label: 'A custom step' }));
    expect(store.effective('task-level').source).toBe('department');
    expect(taskLeaves()).toBe(before + 1);

    // reboot a fresh store on the same db — the fork survives (durable meta row)
    const store2 = createChecklistTemplateStore(db);
    await store2.boot();
    expect(store2.effective('task-level').source).toBe('department');
    expect(leavesOf({ id: 'r', label: 'r', children: store2.effective('task-level').nodes }).length).toBe(before + 1);
  });

  it('a cross-section move persists through setNodes', async () => {
    const t = store.effective('task-level');
    const [secA, secB] = [t.nodes[0]!, t.nodes[1]!];
    const stepA0 = secA.children![0]!.id;
    const stepB0 = secB.children![0]!.id;
    await store.setNodes('task-level', moveBefore(t.nodes, stepA0, stepB0)); // A's first step -> into B
    const after = store.effective('task-level');
    expect(after.nodes[0]!.children!.some((n) => n.id === stepA0)).toBe(false); // left A
    expect(after.nodes[1]!.children!.some((n) => n.id === stepA0)).toBe(true); // landed in B
  });

  it('reset discards the fork and restores the shipped baseline', async () => {
    await store.setNodes('ic-command', addChild(store.effective('ic-command').nodes, null, { id: 'tmp', label: 'Temp', children: [] }));
    expect(store.effective('ic-command').source).toBe('department');
    await store.reset('ic-command');
    expect(store.effective('ic-command')).toBe(BASELINE_TEMPLATES['ic-command']);
    // persisted: a fresh boot also sees the baseline
    const store2 = createChecklistTemplateStore(db);
    await store2.boot();
    expect(store2.effective('ic-command').source).toBe('fieldshore-baseline');
  });

  it('a corrupt meta row degrades to baseline rather than crashing boot', async () => {
    await db.meta.put({ key: 'fieldshore_checklist_templates', value: '{ not json' });
    const store2 = createChecklistTemplateStore(db);
    await store2.boot();
    expect(store2.effective('orm-tcrm')).toBe(BASELINE_TEMPLATES['orm-tcrm']);
  });

  // ---- cloud-sync Increment 3 (whole-blob LWW; the overrides map is a record) ----
  it('setNodes wraps the overrides blob, fires the hook, and tracks localStamp', async () => {
    const blobs: { value: unknown; lastWriteAt: number }[] = [];
    const synced = createChecklistTemplateStore(db, { onBlob: (env) => blobs.push(env) });
    await synced.boot();
    const t = synced.effective('task-level');
    await synced.setNodes('task-level', addChild(t.nodes, t.nodes[0]!.id, { id: 'x', label: 'Step' }));
    const raw = JSON.parse((await db.meta.get('fieldshore_checklist_templates'))!.value);
    expect(raw).toMatchObject({ value: { 'task-level': expect.any(Object) }, lastWriteAt: expect.any(Number) });
    expect(synced.localStamp()).toBe(raw.lastWriteAt);
    expect(blobs.at(-1)!.lastWriteAt).toBe(raw.lastWriteAt);
  });

  it('boot unwraps a bare pre-Increment-3 overrides record as the oldest (stamp 0)', async () => {
    const fork = { ...BASELINE_TEMPLATES['ic-command'], source: 'department' as const };
    await db.meta.put({ key: 'fieldshore_checklist_templates', value: JSON.stringify({ 'ic-command': fork }) });
    await store.boot();
    expect(store.effective('ic-command').source).toBe('department');
    expect(store.localStamp()).toBe(0);
  });

  it('applyRemote replaces overrides, preserves the remote stamp, no echo', async () => {
    const blobs: unknown[] = [];
    const synced = createChecklistTemplateStore(db, { onBlob: (env) => blobs.push(env) });
    await synced.boot();
    const fork = { ...BASELINE_TEMPLATES['orm-tcrm'], source: 'department' as const };
    await synced.applyRemote({ 'orm-tcrm': fork }, 900);
    expect(synced.effective('orm-tcrm').source).toBe('department');
    expect(synced.localStamp()).toBe(900);
    expect(blobs).toHaveLength(0);
  });
});
