import { describe, it, expect } from 'vitest';
import type { FieldShoreEvent } from '../schema';
import {
  checklistReducer,
  checklistInstance,
  checklistInstanceKey,
  activeBriefing,
  EMPTY_CHECKLIST_STATE,
  type ChecklistState,
} from './reducer';

let n = 0;
function check(
  itemId: string,
  over: Partial<{ checklistId: string; instanceId: string; role: string; by: string; at: number }> = {},
): FieldShoreEvent {
  return {
    type: 'ChecklistItemChecked',
    id: `e${n++}`,
    opId: 'op1',
    at: over.at ?? 1000,
    by: over.by ?? 'dev-a',
    checklistId: over.checklistId ?? 'ic-command',
    instanceId: over.instanceId ?? 'op1',
    itemId,
    role: over.role ?? 'Incident Commander',
  };
}
function uncheck(itemId: string, over: Partial<{ checklistId: string; instanceId: string }> = {}): FieldShoreEvent {
  return {
    type: 'ChecklistItemUnchecked',
    id: `e${n++}`,
    opId: 'op1',
    at: 2000,
    by: 'dev-a',
    checklistId: over.checklistId ?? 'ic-command',
    instanceId: over.instanceId ?? 'op1',
    itemId,
    role: 'Incident Commander',
  };
}

const fold = (events: FieldShoreEvent[]): ChecklistState => events.reduce(checklistReducer, EMPTY_CHECKLIST_STATE);

describe('checklistReducer', () => {
  it('a check records who/role/when on the leaf', () => {
    const s = fold([check('ic-p2-safety', { by: 'dev-x', role: 'Operations Section Chief', at: 1234 })]);
    expect(checklistInstance(s, 'ic-command', 'op1')['ic-p2-safety']).toEqual({
      by: 'dev-x',
      role: 'Operations Section Chief',
      at: 1234,
    });
  });

  it('un-check removes the attestation (a check is never silently kept)', () => {
    const s = fold([check('ic-p2-safety'), uncheck('ic-p2-safety')]);
    expect(checklistInstance(s, 'ic-command', 'op1')['ic-p2-safety']).toBeUndefined();
  });

  it('un-checking an already-clear leaf is an idempotent no-op (safe replay)', () => {
    const before = fold([check('a')]);
    const after = checklistReducer(before, uncheck('not-checked'));
    expect(after).toBe(before); // same reference — no churn
  });

  it('re-check is last-write-wins (re-attributes who/when)', () => {
    const s = fold([
      check('a', { by: 'dev-a', role: 'Incident Commander', at: 100 }),
      check('a', { by: 'dev-b', role: 'Operations Section Chief', at: 200 }),
    ]);
    expect(checklistInstance(s, 'ic-command', 'op1')['a']).toEqual({
      by: 'dev-b',
      role: 'Operations Section Chief',
      at: 200,
    });
  });

  it('scopes by (checklistId, instanceId) — instances never bleed into each other', () => {
    const s = fold([
      check('step', { checklistId: 'task-level', instanceId: 'grp-1' }),
      check('step', { checklistId: 'task-level', instanceId: 'grp-2' }),
    ]);
    expect(checklistInstance(s, 'task-level', 'grp-1')['step']).toBeDefined();
    expect(checklistInstance(s, 'task-level', 'grp-2')['step']).toBeDefined();
    // same itemId, different instance -> distinct keys, both checked independently
    expect(checklistInstanceKey('task-level', 'grp-1')).not.toBe(checklistInstanceKey('task-level', 'grp-2'));
    // un-checking grp-1 leaves grp-2 alone
    const s2 = checklistReducer(s, uncheck('step', { checklistId: 'task-level', instanceId: 'grp-1' }));
    expect(checklistInstance(s2, 'task-level', 'grp-1')['step']).toBeUndefined();
    expect(checklistInstance(s2, 'task-level', 'grp-2')['step']).toBeDefined();
  });

  it('ignores unrelated events', () => {
    const before = fold([check('a')]);
    const unrelated = { type: 'OperationEnded', id: 'z', opId: 'op1', at: 9, by: 'd' } as FieldShoreEvent;
    expect(checklistReducer(before, unrelated)).toBe(before);
  });
});

function briefing(type: 'BriefingStarted' | 'BriefingEnded', briefingId: string, at: number, by = 'dev-a'): FieldShoreEvent {
  return { type, id: `e${n++}`, opId: 'op1', at, by, briefingId };
}

describe('ORM/TCRM briefing sessions', () => {
  it('Begin records the started time + briefer; End stamps endedAt', () => {
    const s = fold([briefing('BriefingStarted', 'b1', 100, 'dev-x')]);
    expect(s.briefings['b1']).toEqual({ id: 'b1', startedAt: 100, startedBy: 'dev-x' });
    const s2 = checklistReducer(s, briefing('BriefingEnded', 'b1', 200));
    expect(s2.briefings['b1']).toEqual({ id: 'b1', startedAt: 100, startedBy: 'dev-x', endedAt: 200 });
  });

  it('activeBriefing returns the latest un-ended session, null once ended', () => {
    let s = fold([briefing('BriefingStarted', 'b1', 100)]);
    expect(activeBriefing(s)?.id).toBe('b1');
    s = checklistReducer(s, briefing('BriefingStarted', 'b2', 300));
    expect(activeBriefing(s)?.id).toBe('b2'); // latest
    s = checklistReducer(s, briefing('BriefingEnded', 'b2', 400));
    expect(activeBriefing(s)?.id).toBe('b1'); // b2 ended -> falls back to b1
    s = checklistReducer(s, briefing('BriefingEnded', 'b1', 500));
    expect(activeBriefing(s)).toBeNull();
  });

  it('Begin is idempotent; Ending a missing/already-ended session no-ops', () => {
    const started = fold([briefing('BriefingStarted', 'b1', 100)]);
    expect(checklistReducer(started, briefing('BriefingStarted', 'b1', 999))).toBe(started);
    expect(checklistReducer(started, briefing('BriefingEnded', 'nope', 200))).toBe(started);
  });
});
