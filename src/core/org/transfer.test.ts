import { describe, it, expect } from 'vitest';
import type { FieldShoreEvent, OrgResourceRef } from '../schema';
import { projectOperation } from '../operation/projection';
import { operationReducer, EMPTY_OPERATION_STATE } from '../operation/reducer';
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
    const init = initiate(DEV, INCOMING_PERSON);
    s = orgReducer(s, init);
    // ADR-041 — the pending transfer is keyed by the Initiated event's id.
    expect(s.commandTransfer).toEqual({ transferId: init.id, initiatedBy: DEV, toResource: INCOMING_PERSON, at: 1 });
    expect(currentIC(s.positions)).toEqual({ ref: 'device', value: DEV, label: 'This device' });
  });

  it('only the current IC device may initiate (pre-auth soft check)', () => {
    const s = seedOrgState(OP, DEV);
    expect(orgReducer(s, initiate('intruder', INCOMING_PERSON))).toBe(s); // non-IC → no-op
  });

  it('a claimCode rides the fold onto pending; a codeless initiate stays codeless (#425)', () => {
    let s = seedOrgState(OP, DEV);
    s = orgReducer(s, { ...initiate(DEV, INCOMING_PERSON), claimCode: '4729' } as FieldShoreEvent);
    expect(s.commandTransfer?.claimCode).toBe('4729');
    // the code is a UI fat-finger gate, NOT authentication — canAccept's soft claim unchanged
    expect(canAccept(s.commandTransfer, 'any-device')).toBe(true);
    let s2 = seedOrgState(OP, DEV);
    s2 = orgReducer(s2, initiate(DEV, INCOMING_PERSON));
    expect('claimCode' in (s2.commandTransfer ?? {})).toBe(false); // absent, not undefined-serialized
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

  // LEGACY branch (pre-ADR-041 resolvers carry no transferId): unchanged behaviour —
  // an untagged resolver resolves whatever is pending, and no-ops when nothing is.
  it('accept with no matching pending is a no-op (replay-safe)', () => {
    const s = seedOrgState(OP, DEV);
    expect(orgReducer(s, accept(DEV))).toBe(s);
    expect(canAccept(null, DEV)).toBe(false);
  });

  it('decline / cancel clear pending; command stays with the outgoing IC (legacy, untagged)', () => {
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

// ── ADR-041 — every resolver names the handshake it resolves (transferId = the
// Initiated event id), so a racing Accept and Cancel fold to the SAME state on every
// device: whichever lands first in canonical order wins and the other returns the
// identical state reference (no effect).
describe('command transfer — transferId-tagged resolvers (ADR-041)', () => {
  const created = (): FieldShoreEvent => ({ type: 'OperationCreated', ...base(), name: 'Maple St.', multiBuilding: false });
  const acceptT = (by: string, transferId: string): FieldShoreEvent => ({ type: 'CommandTransferAccepted', ...base(), by, transferId });
  const cancelT = (transferId: string): FieldShoreEvent => ({ type: 'CommandTransferCancelled', ...base(), transferId });
  const declineT = (transferId: string): FieldShoreEvent => ({ type: 'CommandTransferDeclined', ...base(), transferId });
  const fold = (events: FieldShoreEvent[]) => events.reduce(operationReducer, EMPTY_OPERATION_STATE);
  const founderIC = { ref: 'device', value: DEV, label: 'This device' };

  it('[Init, Cancel, Accept]: the cancel lands first — command stays; the late accept is no effect', () => {
    const init = initiate(DEV, INCOMING_PERSON);
    const afterCancel = fold([created(), init, cancelT(init.id)]);
    expect(afterCancel.commandTransfer).toBeNull();
    const afterAccept = operationReducer(afterCancel, acceptT('dev-b', init.id));
    expect(afterAccept).toBe(afterCancel); // identical reference — the loser had no effect
    expect(currentIC(afterAccept.positions)).toEqual(founderIC);
  });

  it('[Init, Accept, Cancel]: the accept lands first — command moves; the late cancel is no effect', () => {
    const init = initiate(DEV, INCOMING_PERSON);
    const afterAccept = fold([created(), init, acceptT('dev-b', init.id)]);
    expect(currentIC(afterAccept.positions)).toEqual(INCOMING_PERSON);
    const afterCancel = operationReducer(afterAccept, cancelT(init.id));
    expect(afterCancel).toBe(afterAccept);
    exactlyOneIC(afterCancel.positions);
  });

  it('a stale resolver never closes a LATER re-initiate (the case transferId exists for)', () => {
    const a = initiate(DEV, INCOMING_PERSON);
    const b = initiate(DEV, INCOMING_DEVICE);
    const reopened = fold([created(), a, cancelT(a.id), b]);
    expect(reopened.commandTransfer?.transferId).toBe(b.id);

    // Accept / Decline / Cancel naming handshake A all no-op against pending B.
    expect(operationReducer(reopened, acceptT('dev-2', a.id))).toBe(reopened);
    expect(operationReducer(reopened, declineT(a.id))).toBe(reopened);
    expect(operationReducer(reopened, cancelT(a.id))).toBe(reopened);

    // Naming B resolves it.
    const accepted = operationReducer(reopened, acceptT('dev-2', b.id));
    expect(accepted.commandTransfer).toBeNull();
    expect(currentIC(accepted.positions)).toEqual(INCOMING_DEVICE);
    expect(operationReducer(reopened, declineT(b.id)).commandTransfer).toBeNull();
    expect(operationReducer(reopened, cancelT(b.id)).commandTransfer).toBeNull();
  });

  it('a mismatched transferId no-ops even when the actor is a valid target', () => {
    const init = initiate(DEV, INCOMING_PERSON);
    const pending = fold([created(), init]);
    expect(operationReducer(pending, acceptT('anyone', 'not-this-handshake'))).toBe(pending);
    expect(operationReducer(pending, declineT('not-this-handshake'))).toBe(pending);
    expect(operationReducer(pending, cancelT('not-this-handshake'))).toBe(pending);
    expect(canAccept(pending.commandTransfer, 'anyone', null, 'not-this-handshake')).toBe(false);
    expect(canAccept(pending.commandTransfer, 'anyone', null, init.id)).toBe(true);
  });

  it('a tagged accept still enforces the target check (device target, wrong device)', () => {
    const init = initiate(DEV, INCOMING_DEVICE);
    const pending = fold([created(), init]);
    expect(operationReducer(pending, acceptT('wrong-device', init.id))).toBe(pending);
    expect(currentIC(operationReducer(pending, acceptT('dev-2', init.id)).positions)).toEqual(INCOMING_DEVICE);
  });

  it('legacy untagged resolvers keep resolving whatever is pending (pre-ADR-041 logs)', () => {
    const a = initiate(DEV, INCOMING_PERSON);
    const b = initiate(DEV, INCOMING_PERSON);
    const s = fold([created(), a, cancelT(a.id), b]);
    expect(operationReducer(s, { type: 'CommandTransferCancelled', ...base() }).commandTransfer).toBeNull();
    expect(currentIC(operationReducer(s, accept('anyone')).positions)).toEqual(INCOMING_PERSON);
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
