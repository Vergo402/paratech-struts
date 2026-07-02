import { describe, it, expect } from 'vitest';
import type { FieldShoreEvent, OrgResourceRef } from '../schema';
import { projectOperation } from '../operation/projection';
import { orgReducer, seedOrgState } from './orgReducer';
import { currentIC, canAccept } from './transfer';
import { rootPosition } from './tree';

const OP = 'op1';
const DEV = 'dev-founder';

let n = 0;
const base = () => ({ id: `e${n++}`, opId: OP, at: 1, by: DEV });

const INCOMING_PERSON: OrgResourceRef = { ref: 'individual', value: 'BC Smith', label: 'BC Smith' };
const INCOMING_DEVICE: OrgResourceRef = { ref: 'device', value: 'dev-2', label: 'Tablet 2' };

const initiate = (by: string, toResource: OrgResourceRef): FieldShoreEvent => ({
  type: 'CommandTransferInitiated',
  ...base(),
  by,
  toResource,
});
const accept = (by: string): FieldShoreEvent => ({ type: 'CommandTransferAccepted', ...base(), by });

// Invariant helper: there is always exactly one IC node with exactly one leader.
function exactlyOneIC(positions: ReturnType<typeof seedOrgState>['positions']) {
  const roots = Object.values(positions).filter((p) => p.parentId === null);
  expect(roots).toHaveLength(1);
  expect(roots[0]!.assignedResources).toHaveLength(1);
}

describe('command transfer (ADR-021 handshake)', () => {
  it('initiate sets pending; command does NOT move (IC unchanged)', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, initiate(DEV, INCOMING_PERSON));
    expect(s.commandTransfer).toEqual({ initiatedBy: DEV, toResource: INCOMING_PERSON, at: 1 });
    expect(currentIC(s.positions)).toEqual({ ref: 'device', value: DEV, label: 'This device' });
  });

  it('only the current IC device may initiate (pre-auth soft check)', () => {
    const s = seedOrgState(OP, DEV);
    expect(orgReducer(s, initiate('intruder', INCOMING_PERSON))).toBe(s); // non-IC → no-op
  });

  it('accept moves command + clears pending; the gold IC follows', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, initiate(DEV, INCOMING_PERSON));
    s = orgReducer(s, accept('any-device')); // individual incoming → any device may accept
    expect(s.commandTransfer).toBeNull();
    expect(currentIC(s.positions)).toEqual(INCOMING_PERSON);
    exactlyOneIC(s.positions);
  });

  it('single shared device (#401): the INITIATOR uid may accept an individual-ref transfer', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, initiate(DEV, INCOMING_PERSON));
    expect(canAccept(s.commandTransfer, DEV)).toBe(true); // same uid that initiated
    s = orgReducer(s, accept(DEV)); // hand-the-tablet: SAME device emits the accept
    expect(s.commandTransfer).toBeNull();
    expect(currentIC(s.positions)).toEqual(INCOMING_PERSON);
    exactlyOneIC(s.positions);
  });

  it('single shared device (#401): a device-ref target stays strict — the initiator cannot self-accept', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, initiate(DEV, INCOMING_DEVICE));
    expect(canAccept(s.commandTransfer, DEV)).toBe(false);
    expect(orgReducer(s, accept(DEV))).toBe(s); // no-op; still pending for dev-2
  });

  it('a device-targeted transfer accepts ONLY from that device', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, initiate(DEV, INCOMING_DEVICE));
    const pending = s;
    expect(orgReducer(s, accept('wrong-device'))).toBe(pending); // wrong uid → no-op, still pending
    s = orgReducer(s, accept('dev-2'));
    expect(s.commandTransfer).toBeNull();
    expect(currentIC(s.positions)).toEqual(INCOMING_DEVICE);
  });

  it('accept with no matching pending is a no-op (replay-safe)', () => {
    const s = seedOrgState(OP, DEV);
    expect(orgReducer(s, accept(DEV))).toBe(s);
    expect(canAccept(null, DEV)).toBe(false);
  });

  it('decline / cancel clear pending; command stays with the outgoing IC', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, initiate(DEV, INCOMING_PERSON));
    const declined = orgReducer(s, { type: 'CommandTransferDeclined', ...base() });
    expect(declined.commandTransfer).toBeNull();
    expect(currentIC(declined.positions)).toEqual({ ref: 'device', value: DEV, label: 'This device' });
    const cancelled = orgReducer(s, { type: 'CommandTransferCancelled', ...base() });
    expect(cancelled.commandTransfer).toBeNull();
    exactlyOneIC(cancelled.positions);
  });

  it('after a full handshake the new IC can transfer onward (always one IC)', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, initiate(DEV, INCOMING_DEVICE));
    s = orgReducer(s, accept('dev-2'));
    // dev-2 is now IC of record → it can initiate the next transfer; DEV no longer can.
    expect(orgReducer(s, initiate(DEV, INCOMING_PERSON))).toBe(s); // old IC blocked
    s = orgReducer(s, initiate('dev-2', INCOMING_PERSON));
    s = orgReducer(s, accept('whoever'));
    expect(currentIC(s.positions)).toEqual(INCOMING_PERSON);
    exactlyOneIC(s.positions);
  });
});

describe('command transfer via the operation projection (end to end)', () => {
  it('folds created → initiate → accept; pending clears, IC moves', () => {
    const created: FieldShoreEvent = { type: 'OperationCreated', ...base(), name: 'Maple St.', multiBuilding: false };
    const state = projectOperation([created, initiate(DEV, INCOMING_PERSON), accept('x')]);
    expect(state.commandTransfer).toBeNull();
    expect(rootPosition(state.positions)!.assignedResources[0]).toEqual(INCOMING_PERSON);
  });
});
