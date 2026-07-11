import { describe, it, expect } from 'vitest';
import type { OrgResourceRef } from '../schema/org';
import type { FieldShoreEvent } from '../schema/event';
import { commandsIC, isSelf, selfKey } from './self';
import { seedOrgState, orgReducer } from './orgReducer';
import { canAccept, isCommanderOf, type PendingTransfer } from './transfer';
import { defaultPositionId } from './defaultTree';

// ADR-024 follow-up — a person's ICS position follows their ACCOUNT across every device
// they sign into; the device is the guest floor. These lock the identity algebra + the
// reducer/transfer account arms that make it so.

const acct = (id: string, label = id): OrgResourceRef => ({ ref: 'account', value: id, label });
const dev = (id: string): OrgResourceRef => ({ ref: 'device', value: id, label: 'This device' });
const indiv = (n: string): OrgResourceRef => ({ ref: 'individual', value: n, label: n });
const app = (id: string): OrgResourceRef => ({ ref: 'apparatus', value: id, label: id });

describe('isSelf', () => {
  const me = { accountId: 'A1', deviceUid: 'D1' };
  it('an account ref is me on ANY device I sign into', () => {
    expect(isSelf(acct('A1'), { accountId: 'A1', deviceUid: 'D9' })).toBe(true);
    expect(isSelf(acct('A2'), me)).toBe(false);
  });
  it('a device ref is me only on that device', () => {
    expect(isSelf(dev('D1'), me)).toBe(true);
    expect(isSelf(dev('D2'), me)).toBe(false);
  });
  it('a legacy device ref resolves to its owning account', () => {
    const resolve = (d: string) => (d === 'D2' ? 'A1' : null);
    expect(isSelf(dev('D2'), me, resolve)).toBe(true); // D2 is bound to my account
    expect(isSelf(dev('D3'), me, resolve)).toBe(false);
  });
  it('a guest (no account) never resolves a foreign device', () => {
    expect(isSelf(dev('D2'), { accountId: null, deviceUid: 'D1' }, () => 'A1')).toBe(false);
  });
  it('individual / apparatus refs are never a verifiable me', () => {
    expect(isSelf(indiv('FF Lopez'), me)).toBe(false);
    expect(isSelf(app('rig1'), me)).toBe(false);
  });
});

describe('commandsIC', () => {
  const me = { accountId: 'A1', deviceUid: 'D1' };
  it('an unstaffed IC bootstraps to anyone', () => {
    expect(commandsIC(null, me)).toBe(true);
    expect(commandsIC(null, { accountId: null, deviceUid: 'D9' })).toBe(true);
  });
  it('THE FIX: an account IC commands from every device the account signs into', () => {
    expect(commandsIC(acct('A1'), { accountId: 'A1', deviceUid: 'D9' })).toBe(true);
    expect(commandsIC(acct('A2'), me)).toBe(false);
  });
  it('a device IC commands from its own device or a resolved legacy device', () => {
    expect(commandsIC(dev('D1'), me)).toBe(true);
    expect(commandsIC(dev('D2'), me)).toBe(false);
    expect(commandsIC(dev('D2'), me, (d) => (d === 'D2' ? 'A1' : null))).toBe(true);
  });
  it('an individual / apparatus IC stays permissive (ADR-021 pre-auth)', () => {
    expect(commandsIC(indiv('Chief Alvarez'), me)).toBe(true);
    expect(commandsIC(app('rig1'), me)).toBe(true);
  });
});

describe('selfKey', () => {
  it('is the account for a member, the device for a guest', () => {
    expect(selfKey({ accountId: 'A1', deviceUid: 'D1' })).toBe('A1');
    expect(selfKey({ accountId: null, deviceUid: 'D1' })).toBe('D1');
    expect(selfKey({ accountId: null, deviceUid: null })).toBe(null);
  });
});

describe('seedOrgState', () => {
  const opId = 'op1';
  const icId = defaultPositionId(opId, 'ic');
  it('a member founder holds IC by ACCOUNT, My Role keyed by the account', () => {
    const st = seedOrgState(opId, 'D1', { id: 'A1', label: 'Alex Vergo' });
    expect(st.positions[icId]?.assignedResources[0]).toEqual({ ref: 'account', value: 'A1', label: 'Alex Vergo' });
    expect(st.myRoles).toEqual({ A1: icId });
  });
  it('a guest founder holds IC by device (unchanged floor) — back-compat', () => {
    const st = seedOrgState(opId, 'D1');
    expect(st.positions[icId]?.assignedResources[0]).toEqual({ ref: 'device', value: 'D1', label: 'This device' });
    expect(st.myRoles).toEqual({ D1: icId });
  });
});

describe('orgReducer MyRoleSet keying', () => {
  const base = { id: 'e1', opId: 'op1', at: 1 };
  const state = { positions: {}, myRoles: {}, commandTransfer: null };
  it('a member keys My Role by account (follows devices); clearing removes that key', () => {
    const set = orgReducer(state, {
      ...base, type: 'MyRoleSet', by: 'D1', positionId: 'pos-x', account: { id: 'A1', label: 'Alex' },
    } as FieldShoreEvent);
    expect(set.myRoles).toEqual({ A1: 'pos-x' });
    const cleared = orgReducer(set, {
      ...base, id: 'e2', type: 'MyRoleSet', by: 'D9', positionId: null, account: { id: 'A1', label: 'Alex' },
    } as FieldShoreEvent);
    expect(cleared.myRoles).toEqual({});
  });
  it('a guest keys My Role by device (unchanged)', () => {
    const set = orgReducer(state, { ...base, type: 'MyRoleSet', by: 'D1', positionId: 'pos-x' } as FieldShoreEvent);
    expect(set.myRoles).toEqual({ D1: 'pos-x' });
  });
});

describe('canAccept — account target', () => {
  const pending = (to: OrgResourceRef): PendingTransfer => ({ initiatedBy: 'D0', toResource: to, at: 1 });
  it('an account target is uid-verified — the accepting account must match, from any device', () => {
    expect(canAccept(pending(acct('A2')), 'Dwhatever', 'A2')).toBe(true);
    expect(canAccept(pending(acct('A2')), 'Dwhatever', 'A1')).toBe(false);
    expect(canAccept(pending(acct('A2')), 'Dwhatever', null)).toBe(false);
  });
  it('device + individual targets keep their existing behavior', () => {
    expect(canAccept(pending(dev('D5')), 'D5')).toBe(true);
    expect(canAccept(pending(dev('D5')), 'D6')).toBe(false);
    expect(canAccept(pending(indiv('Chief')), 'Danyone')).toBe(true);
  });
});

describe('isCommanderOf — account arm', () => {
  const opId = 'op1';
  const icId = defaultPositionId(opId, 'ic');
  const positions = { [icId]: { id: icId, title: 'IC', kind: 'command' as const, parentId: null, builtIn: true, order: 0, assignedResources: [acct('A1', 'Alex')] } };
  it('an account-led IC is recognised for that account on a DIFFERENT device', () => {
    expect(isCommanderOf(positions, null, opId, { accountId: 'A1', deviceUid: 'D9' })).toBe(true);
    expect(isCommanderOf(positions, null, opId, { accountId: 'A2', deviceUid: 'D9' })).toBe(false);
  });
});
