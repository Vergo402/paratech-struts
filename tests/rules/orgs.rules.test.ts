import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { createEnv, seedDept, assertSucceeds, assertFails, perms, DEPT, CODE } from './harness';

// Real write-attempting rules tests (see harness.ts). Every `assertFails` below
// is a PERMISSION_DENIED observed from the emulator, not a string match on the
// generated JSON. Suites re-seed between tests; rules persist for the env.

let env: RulesTestEnvironment;
const db = (uid: string | null) =>
  uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database();

beforeAll(async () => {
  env = await createEnv();
});

beforeEach(async () => {
  await env.clearDatabase();
  await seedDept(env);
});

afterAll(async () => {
  await env.cleanup();
});

describe('custom-role management (#418)', () => {
  const role = { name: 'Logistics', permissions: perms({ manageInventory: true }) };

  it('an admin creates a custom role', async () => {
    await assertSucceeds(db('founder').ref(`orgs/${DEPT}/roles/logistics`).set(role));
  });

  it('a custom manageUsers-holder (non-admin ROLE) creates a role — permission-driven, not name-driven', async () => {
    await assertSucceeds(db('manager').ref(`orgs/${DEPT}/roles/logistics`).set(role));
  });

  it('a Default member cannot create a role', async () => {
    await assertFails(db('member1').ref(`orgs/${DEPT}/roles/logistics`).set(role));
  });

  it('a revoked admin-of-nothing / outsider / anonymous cannot create a role', async () => {
    await assertFails(db('revoked').ref(`orgs/${DEPT}/roles/logistics`).set(role));
    await assertFails(db('outsider').ref(`orgs/${DEPT}/roles/logistics`).set(role));
    await assertFails(db(null).ref(`orgs/${DEPT}/roles/logistics`).set(role));
  });

  it('an admin edits the Default role (departments tune the joiner role — ADR-017)', async () => {
    await assertSucceeds(
      db('founder').ref(`orgs/${DEPT}/roles/default`).set({
        name: 'Default', builtIn: true, permissions: perms({ runFieldWork: true, manageInventory: true }),
      }),
    );
  });

  it('the Admin role is immutable — even to an admin', async () => {
    await assertFails(
      db('founder').ref(`orgs/${DEPT}/roles/admin`).set({
        name: 'Admin', builtIn: true, permissions: perms(), // a hollowed-out Admin = lockout
      }),
    );
  });

  it('an admin deletes a custom role with a real remove()', async () => {
    await assertSucceeds(db('founder').ref(`orgs/${DEPT}/roles/custom-mgr`).remove());
  });

  it('the built-ins can never be deleted (delete-protection lives in .write — remove() skips .validate)', async () => {
    await assertFails(db('founder').ref(`orgs/${DEPT}/roles/default`).remove());
    await assertFails(db('founder').ref(`orgs/${DEPT}/roles/admin`).remove());
  });

  it('a Default member cannot delete a custom role', async () => {
    await assertFails(db('member1').ref(`orgs/${DEPT}/roles/custom-mgr`).remove());
  });
});

describe('invite-code lifecycle (#423)', () => {
  it('the founder revokes the code (active → false)', async () => {
    await assertSucceeds(db('founder').ref(`orgs/inviteCodes/${CODE}/active`).set(false));
  });

  it('a non-founder manageUsers-holder revokes the code', async () => {
    await assertSucceeds(db('admin2').ref(`orgs/inviteCodes/${CODE}/active`).set(false));
    await env.clearDatabase();
    await seedDept(env);
    await assertSucceeds(db('manager').ref(`orgs/inviteCodes/${CODE}/active`).set(false));
  });

  it('a plain member cannot revoke', async () => {
    await assertFails(db('member1').ref(`orgs/inviteCodes/${CODE}/active`).set(false));
  });

  it('a dead code cannot be re-armed (no active → true branch)', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.database().ref(`orgs/inviteCodes/${CODE}/active`).set(false),
    );
    await assertFails(db('founder').ref(`orgs/inviteCodes/${CODE}/active`).set(true));
  });

  it('a revoke cannot re-point the code at another department (field freeze)', async () => {
    await assertFails(
      db('founder').ref(`orgs/inviteCodes/${CODE}`).update({ active: false, deptId: 'other-dept' }),
    );
  });

  it('a code can never be deleted — dead codes stay, auditably', async () => {
    await assertFails(db('founder').ref(`orgs/inviteCodes/${CODE}`).remove());
  });

  it('a non-founder admin publishes a NEW code (the regenerate path)', async () => {
    await assertSucceeds(
      db('admin2').ref('orgs/inviteCodes/BBBB-3333').set({
        deptId: DEPT, deptName: 'Hamden Fire Rescue', createdBy: 'admin2', createdAt: 2000, active: true,
      }),
    );
  });

  it('a plain member cannot publish a code for the dept', async () => {
    await assertFails(
      db('member1').ref('orgs/inviteCodes/CCCC-4444').set({
        deptId: DEPT, deptName: 'Hamden Fire Rescue', createdBy: 'member1', createdAt: 2000, active: true,
      }),
    );
  });
});

describe('join + membership (#420 root cause, anti-lockout)', () => {
  const joinRow = { role: 'default', displayName: 'New Joiner', joinedAt: 3000, viaCode: CODE };

  it('a new user self-joins with a valid active code', async () => {
    await assertSucceeds(db('newbie').ref(`orgs/${DEPT}/members/newbie`).set(joinRow));
  });

  it('a join with a revoked code fails', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      ctx.database().ref(`orgs/inviteCodes/${CODE}/active`).set(false),
    );
    await assertFails(db('newbie').ref(`orgs/${DEPT}/members/newbie`).set(joinRow));
  });

  it('re-writing an EXISTING member row is PERMISSION_DENIED — the #420 "offline" misread is really this', async () => {
    await assertFails(
      db('revoked').ref(`orgs/${DEPT}/members/revoked`).set({
        role: 'default', displayName: 'Revoked', joinedAt: 3000, viaCode: CODE,
      }),
    );
  });

  it('anti-lockout: another admin may demote an admin; an admin can never self-demote', async () => {
    await assertSucceeds(db('admin2').ref(`orgs/${DEPT}/members/founder/role`).set('default'));
    await env.clearDatabase();
    await seedDept(env);
    await assertFails(db('founder').ref(`orgs/${DEPT}/members/founder/role`).set('default'));
  });

  it('promotion TO Admin requires an ADMIN actor — a manageUsers custom role cannot escalate (#257 fold)', async () => {
    // 'manager' holds manageUsers via the custom role but is NOT an admin:
    // promoting anyone — including themselves — to Admin is denied.
    await assertFails(db('manager').ref(`orgs/${DEPT}/members/member1/role`).set('admin'));
    await assertFails(db('manager').ref(`orgs/${DEPT}/members/manager/role`).set('admin'));
    // A real admin still promotes members to Admin.
    await assertSucceeds(db('admin2').ref(`orgs/${DEPT}/members/member1/role`).set('admin'));
    // The manager's ordinary member management is untouched (non-admin role changes).
    await env.clearDatabase();
    await seedDept(env);
    await assertSucceeds(db('manager').ref(`orgs/${DEPT}/members/member1/role`).set('custom-mgr'));
  });
});

describe('legacy-tree lockdown (#424)', () => {
  it('/departments is dead — no read, no write, even signed in', async () => {
    await assertFails(db('founder').ref('departments/junk').set({ name: 'junk' }));
    await assertFails(db('founder').ref('departments').get());
  });

  it('/feedback accepts a valid write-once entry but is not client-readable', async () => {
    await assertSucceeds(
      db('member1').ref('feedback/fb1').set({ category: 'bug', text: 'Sheet sticks', timestamp: 4000 }),
    );
    await assertFails(
      db('member1').ref('feedback/fb1').set({ category: 'idea', text: 'overwrite!', timestamp: 5000 }),
    );
    await assertFails(db('member1').ref('feedback').get());
    await assertFails(
      db('member1').ref('feedback/fb2').set({ category: 'rant', text: 'bad category', timestamp: 4000 }),
    );
  });

  it('/diagnostics/sync accepts a write-once entry but is not client-readable', async () => {
    await assertSucceeds(db('member1').ref('diagnostics/sync/d1').set({ ts: 4000, event: 'flush' }));
    await assertFails(db('member1').ref('diagnostics/sync/d1').set({ ts: 5000, event: 'tamper' }));
    await assertFails(db('member1').ref('diagnostics').get());
  });

  it('the catch-all denies unknown top-level trees', async () => {
    await assertFails(db('founder').ref('anything-else/x').set(1));
  });
});

describe('department founding (CREATE_ONLY cascade)', () => {
  it('a founder creates a dept with the full payload, once', async () => {
    const payload = {
      name: 'Yorktown Heights FD',
      createdBy: 'founder2',
      createdAt: 5000,
      members: { founder2: { role: 'admin', displayName: 'F2', joinedAt: 5000 } },
      roles: {
        admin: { name: 'Admin', builtIn: true, permissions: perms({ manageUsers: true }) },
        default: { name: 'Default', builtIn: true, permissions: perms() },
      },
    };
    await assertSucceeds(db('founder2').ref('orgs/dept2').set(payload));
    // re-create / overwrite an existing dept is denied (CREATE_ONLY)
    await assertFails(db('founder2').ref('orgs/dept2').set(payload));
  });

  it('a member reads their dept; an outsider cannot', async () => {
    await assertSucceeds(db('member1').ref(`orgs/${DEPT}/name`).get());
    await assertFails(db('outsider').ref(`orgs/${DEPT}/name`).get());
    expect(true).toBe(true);
  });
});
