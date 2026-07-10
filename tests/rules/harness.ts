import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

// Rules-test harness (pre-Phase-J audit follow-up) — boots a test environment
// against the RTDB emulator with the COMMITTED database.rules.json, so every
// test genuinely attempts the write and observes allow/deny. This is the test
// class the shape-suite (src/core/schema/rules.test.ts) cannot cover: #418
// (missing .write = default-deny), #423 (create-only invite codes), and #424
// (permissive legacy trees) all passed shape checks while broken in production.
//
// Runs ONLY via `npm run test:rules` (firebase emulators:exec). Needs Java on
// PATH (the RTDB emulator is a JVM app): `brew install openjdk` + follow the
// brew caveats, or any JDK ≥ 11.

export { assertSucceeds, assertFails };

export const PROJECT_ID = 'fieldshore-database';

export function createEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    database: {
      rules: readFileSync(new URL('../../database.rules.json', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 9000,
    },
  });
}

// All 8 permission keys, defaulted off — mirror of core PERMISSION_KEYS (kept
// literal here so a rules test never imports app code under test).
export function perms(over: Partial<Record<string, boolean>> = {}): Record<string, boolean> {
  return {
    read: true,
    runFieldWork: false,
    manageOperations: false,
    manageInventory: false,
    manageRoster: false,
    manageSettings: false,
    manageUsers: false,
    manageData: false,
    ...over,
  };
}

export const DEPT = 'dept1';
export const CODE = 'AAAA-2222';

// The canonical fixture: one department with a founder-admin, a second admin,
// a custom-role manageUsers holder, a plain Default member, and a revoked
// member — plus one active invite code. Seeded with rules DISABLED.
export async function seedDept(env: RulesTestEnvironment): Promise<void> {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.database().ref().set({
      orgs: {
        [DEPT]: {
          name: 'Hamden Fire Rescue',
          createdBy: 'founder',
          createdAt: 1000,
          members: {
            founder: { role: 'admin', displayName: 'Founder', joinedAt: 1000 },
            admin2: { role: 'admin', displayName: 'Second Admin', joinedAt: 1001 },
            manager: { role: 'custom-mgr', displayName: 'Manager', joinedAt: 1002 },
            member1: { role: 'default', displayName: 'Member One', joinedAt: 1003 },
            revoked: { role: 'default', displayName: 'Revoked', joinedAt: 1004, active: false },
          },
          roles: {
            admin: { name: 'Admin', builtIn: true, permissions: perms({
              runFieldWork: true, manageOperations: true, manageInventory: true,
              manageRoster: true, manageSettings: true, manageUsers: true, manageData: true,
            }) },
            default: { name: 'Default', builtIn: true, permissions: perms({ runFieldWork: true }) },
            'custom-mgr': { name: 'Duty Officer', permissions: perms({ manageUsers: true }) },
          },
        },
        inviteCodes: {
          [CODE]: { deptId: DEPT, deptName: 'Hamden Fire Rescue', createdBy: 'founder', createdAt: 1000, active: true },
        },
      },
    });
  });
}
