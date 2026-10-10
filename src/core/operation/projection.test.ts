import { describe, it, expect } from 'vitest';
import { NO_DEDUCTIONS, type ShorePoint, type FieldShoreEvent } from '../schema';
import { projectOperation, projectOperationById, projectArchive, shorePointHistory } from './projection';
import { sortCanonical } from './eventLog';

let n = 0;
const eid = () => `e${n++}`;

function created(opId: string, name: string, at: number): FieldShoreEvent {
  return { type: 'OperationCreated', id: eid(), opId, at, by: 't', name, multiBuilding: false };
}
function ended(opId: string, at: number): FieldShoreEvent {
  return { type: 'OperationEnded', id: eid(), opId, at, by: 't' };
}
function reopened(opId: string, at: number): FieldShoreEvent {
  return { type: 'OperationReopened', id: eid(), opId, at, by: 't' };
}
function added(opId: string, spId: string): FieldShoreEvent {
  const shorePoint: ShorePoint = {
    id: spId,
    opId,
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 40 * 8,
    deductions: NO_DEDUCTIONS,
    status: 'pending',
  };
  return { type: 'ShorePointAdded', id: eid(), opId, at: 1, by: 't', shorePoint };
}

describe('projectOperation — active-op scoping (multi-incident isolation)', () => {
  it('a second operation never inherits the first operation’s shore points', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      added('op1', 'a'),
      added('op1', 'b'),
      ended('op1', 200),
      created('op2', 'Second', 300),
      added('op2', 'c'),
    ];
    const { operation, shorePoints } = projectOperation(log);
    expect(operation?.id).toBe('op2');
    expect(operation?.status).toBe('active');
    expect(shorePoints.map((s) => s.id)).toEqual(['c']); // NOT a, b
  });

  it('returns the empty state when every operation is ended', () => {
    const log: FieldShoreEvent[] = [created('op1', 'First', 100), added('op1', 'a'), ended('op1', 200)];
    expect(projectOperation(log)).toEqual({ operation: null, shorePoints: [], positions: {}, myRoles: {}, commandTransfer: null, hazards: {}, checklists: {}, briefings: {} });
  });

  it('a single active op behaves as before', () => {
    const log: FieldShoreEvent[] = [created('op1', 'First', 100), added('op1', 'a')];
    const { operation, shorePoints } = projectOperation(log);
    expect(operation?.id).toBe('op1');
    expect(shorePoints.map((s) => s.id)).toEqual(['a']);
  });
});

describe('re-open round-trip (ADR-036)', () => {
  it('re-opening an ended op makes it the active op again with its points intact', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      added('op1', 'a'),
      added('op1', 'b'),
      ended('op1', 200),
      reopened('op1', 300),
    ];
    const { operation, shorePoints } = projectOperation(log);
    expect(operation?.id).toBe('op1');
    expect(operation?.status).toBe('active');
    expect(shorePoints.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('re-opening op1 after op2 was started restores op1 (the path the incremental reducer can’t)', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      added('op1', 'a'),
      ended('op1', 200),
      created('op2', 'Second', 300),
      added('op2', 'c'),
      ended('op2', 400),
      reopened('op1', 500),
    ];
    const { operation, shorePoints } = projectOperation(log);
    expect(operation?.id).toBe('op1');
    expect(shorePoints.map((s) => s.id)).toEqual(['a']);
  });
});

describe('projectOperationById', () => {
  it('folds only the named op, regardless of which is active', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      added('op1', 'a'),
      ended('op1', 200),
      created('op2', 'Second', 300),
      added('op2', 'c'),
    ];
    const s1 = projectOperationById(log, 'op1');
    expect(s1.operation?.status).toBe('ended');
    expect(s1.shorePoints.map((s) => s.id)).toEqual(['a']);
  });
});

describe('projectArchive', () => {
  it('lists ended ops newest-first with live shore-point counts; omits active ones', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      added('op1', 'a'),
      added('op1', 'b'),
      ended('op1', 200),
      created('op2', 'Second', 300),
      added('op2', 'c'),
      ended('op2', 400),
      created('op3', 'Third (active)', 500),
      added('op3', 'd'),
    ];
    const archive = projectArchive(log);
    expect(archive.map((a) => a.id)).toEqual(['op2', 'op1']); // newest-ended first; op3 active → omitted
    expect(archive.find((a) => a.id === 'op1')).toMatchObject({ name: 'First', endedAt: 200, shorePointCount: 2 });
  });

  it('a re-opened op drops out of the archive (it is active again)', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      ended('op1', 200),
      reopened('op1', 300),
    ];
    expect(projectArchive(log)).toEqual([]);
  });
});

describe('ADR-041 — active-op rule (earliest un-ended create/reopen wins)', () => {
  it('a later create while one is active is ignored; the first stays active', () => {
    const log: FieldShoreEvent[] = [created('op1', 'First', 100), added('op1', 'a'), created('op2', 'Second', 200), added('op2', 'z')];
    const { operation, shorePoints } = projectOperation(log);
    expect(operation?.id).toBe('op1');
    expect(shorePoints.map((s) => s.id)).toEqual(['a']);
  });

  it('the loser does not become active when the winner ends', () => {
    const log: FieldShoreEvent[] = [created('op1', 'First', 100), created('op2', 'Second', 200), ended('op1', 300)];
    expect(projectOperation(log).operation).toBeNull();
  });

  it('a reopen that lost the race leaves the op ended (the reopen is skipped)', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      ended('op1', 200),
      created('op2', 'Second', 300),
      reopened('op1', 400),
    ];
    expect(projectOperation(log).operation?.id).toBe('op2');
    expect(projectOperationById(log, 'op1').operation?.status).toBe('ended');
  });
});

describe('ADR-041 — projectArchive lists every non-active op; superseded losers flagged', () => {
  it('a superseded op (never ended, not active) lists with superseded:true and endedAt = its created at', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'Winner', 100),
      created('op2', 'Loser', 150),
      added('op2', 'z'),
    ];
    expect(projectArchive(log)).toEqual([
      { id: 'op2', name: 'Loser', endedAt: 150, shorePointCount: 1, superseded: true },
    ]);
  });

  it('an ended op carries no superseded key; endedAt = the canonically LAST OperationEnded', () => {
    // receivedAt makes the array genuinely canonical: the last Ended (at 250) reached the
    // cloud after an earlier Ended stamped at 280 — canonical position decides, not `at`.
    const log: FieldShoreEvent[] = [
      { ...created('op1', 'First', 100), receivedAt: 1 },
      { ...ended('op1', 280), receivedAt: 2 },
      { ...reopened('op1', 300), receivedAt: 3 },
      { ...ended('op1', 250), receivedAt: 4 },
    ];
    expect(sortCanonical(log)).toEqual(log);
    const [row] = projectArchive(log);
    expect(row).toEqual({ id: 'op1', name: 'First', endedAt: 250, shorePointCount: 0 });
    expect('superseded' in row!).toBe(false);
  });

  it('a reopen-race loser stays an ordinary (ended) archive row', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      ended('op1', 200),
      created('op2', 'Second', 300),
      reopened('op1', 400),
    ];
    expect(projectArchive(log)).toEqual([{ id: 'op1', name: 'First', endedAt: 200, shorePointCount: 0 }]);
  });

  it('superseded and ended rows sort together newest first', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'Old', 100),
      ended('op1', 120),
      created('op2', 'Winner', 200),
      created('op3', 'Loser', 250),
    ];
    expect(projectArchive(log).map((a) => [a.id, a.superseded ?? false])).toEqual([
      ['op3', true],
      ['op1', false],
    ]);
  });
});

/**
 * shorePointHistory (#453) — the read-time reconstruction of which points a status
 * event actually MOVED. The store's readShorePointHistory.test.ts drives this through
 * real Dexie commits; these pin the pure function's two structural choices: the group
 * fan-out and the per-operation scoping that makes the membership replay honest.
 */
describe('shorePointHistory — group fan-out + op scoping (#453)', () => {
  function grouped(opId: string, spId: string, status: ShorePoint['status'], groupId?: string): FieldShoreEvent {
    const shorePoint: ShorePoint = {
      id: spId,
      opId,
      division: '1',
      shoreType: 't-shore',
      measurementEighths: 40 * 8,
      deductions: NO_DEDUCTIONS,
      status,
      ...(groupId ? { groupId, groupTotal: 2 } : {}),
    };
    return { type: 'ShorePointAdded', id: eid(), opId, at: 1, by: 't', shorePoint };
  }
  const moved = (
    opId: string,
    spId: string,
    from: ShorePoint['status'],
    to: ShorePoint['status'],
  ): FieldShoreEvent => ({ type: 'ShorePointStatusChanged', id: eid(), opId, at: 9, by: 'trigger-dev', spId, from, to });

  it('includes a fanned change on the mate, and excludes it from a mate that was ahead', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      grouped('op1', 'a', 'process', 'g1'),
      grouped('op1', 'b', 'process', 'g1'),
      grouped('op1', 'ahead', 'strutset', 'g1'),
      moved('op1', 'a', 'process', 'strutset'),
    ];
    expect(shorePointHistory(log, 'b').map((e) => e.type)).toEqual(['ShorePointAdded', 'ShorePointStatusChanged']);
    expect(shorePointHistory(log, 'ahead').map((e) => e.type)).toEqual(['ShorePointAdded']);
    // Attributable: the fanned entry IS the trigger event, so actor + time survive.
    expect(shorePointHistory(log, 'b')[1]!.by).toBe('trigger-dev');
  });

  it('membership is read AS OF the event — a point added after the change never gets it', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      grouped('op1', 'a', 'process', 'g1'),
      moved('op1', 'a', 'process', 'strutset'),
      grouped('op1', 'late', 'process', 'g1'),
    ];
    expect(shorePointHistory(log, 'late').map((e) => e.type)).toEqual(['ShorePointAdded']);
  });

  it('scopes to the point\'s own operation — a same-groupId point in ANOTHER op is untouched', () => {
    const log: FieldShoreEvent[] = [
      created('op1', 'First', 100),
      grouped('op1', 'a', 'process', 'g1'),
      ended('op1', 200),
      created('op2', 'Second', 300),
      grouped('op2', 'b', 'process', 'g1'), // same groupId, different incident
      moved('op1', 'a', 'process', 'strutset'),
    ];
    expect(shorePointHistory(log, 'b').map((e) => e.type)).toEqual(['ShorePointAdded']);
  });

  it('is empty for an unknown point', () => {
    expect(shorePointHistory([created('op1', 'First', 100)], 'nope')).toEqual([]);
  });
});
