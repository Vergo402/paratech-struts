import { describe, expect, it, vi } from 'vitest';
import { MAY_BE_UNFINISHED, NOTHING_CHANGED, runAccountUpdate } from './accountUpdate';
import type { AccountUpdateOps } from './accountUpdate';

// Every fake op records one label in `calls`, then throws if that label is in
// `fail`. Asserting the WHOLE array is what pins the write order: reorder a step
// in accountUpdate.ts and these break.
function harness(opts: { prevFlag?: unknown; fail?: Record<string, unknown> } = {}) {
  const calls: string[] = [];
  const step = (label: string): void => {
    calls.push(label);
    if (opts.fail && label in opts.fail) throw opts.fail[label];
  };
  const ops: AccountUpdateOps = {
    readAuthEmail: async () => (step('readAuthEmail'), 'old@dept.test'),
    readMustChangePassword: async () => (step('readFlag'), opts.prevFlag),
    writeMemberFields: async (f) => step(`write ${JSON.stringify(f)}`),
    updateAuth: async (p) => step(`auth ${JSON.stringify(p)}`),
    revokeRefreshTokens: async () => step('revoke'),
    mapAuthError: (err) => new Error(`mapped ${(err as { code: string }).code}`),
    saveFailed: (message) => new Error(message),
    warn: vi.fn(),
  };
  return { ops, calls };
}

const reset = { email: '', newPassword: 'Smith123!', displayName: '' };
const emailChange = { email: 'new@dept.test', newPassword: '', displayName: '' };
const RAISE = 'write {"mustChangePassword":true}';
const AUTH_PW = 'auth {"password":"Smith123!"}';
const AUTH_NEW = 'auth {"email":"new@dept.test"}';
const AUTH_OLD = 'auth {"email":"old@dept.test"}';
const MIRROR = 'write {"email":"new@dept.test"}';

describe('runAccountUpdate — adminUpdateAccount write order', () => {
  it('password reset: raises mustChangePassword BEFORE Auth changes, then revokes', async () => {
    const { ops, calls } = harness({ prevFlag: false });
    await runAccountUpdate(reset, ops);
    expect(calls).toEqual(['readFlag', RAISE, AUTH_PW, 'revoke']);
  });

  it('flag write fails: Auth password is never changed, nothing revoked', async () => {
    const { ops, calls } = harness({ fail: { [RAISE]: new Error('rtdb down') } });
    await expect(runAccountUpdate(reset, ops)).rejects.toThrow(NOTHING_CHANGED);
    expect(calls).toEqual(['readFlag', RAISE]);
  });

  it.each([
    [false, 'write {"mustChangePassword":false}'],
    [undefined, 'write {"mustChangePassword":null}'], // absent before ⇒ key deleted
  ])('Auth rejects (prev flag %s): flag restored, Auth error surfaces, no revoke', async (prev, restore) => {
    const { ops, calls } = harness({
      prevFlag: prev,
      fail: { [AUTH_PW]: { code: 'auth/invalid-password' } },
    });
    await expect(runAccountUpdate(reset, ops)).rejects.toThrow('mapped auth/invalid-password');
    expect(calls).toEqual(['readFlag', RAISE, AUTH_PW, restore]);
  });

  it('a failed flag restore cannot mask the original Auth error', async () => {
    const restore = 'write {"mustChangePassword":false}';
    const { ops, calls } = harness({
      prevFlag: false,
      fail: { [AUTH_PW]: { code: 'auth/invalid-password' }, [restore]: new Error('rtdb down') },
    });
    await expect(runAccountUpdate(reset, ops)).rejects.toThrow('mapped auth/invalid-password');
    expect(calls).toEqual(['readFlag', RAISE, AUTH_PW, restore]);
  });

  it('Auth outcome unknown (timeout): flag stays raised and tokens are revoked', async () => {
    const { ops, calls } = harness({
      prevFlag: false,
      fail: { [AUTH_PW]: { code: 'app/network-timeout' } },
    });
    await expect(runAccountUpdate(reset, ops)).rejects.toThrow(MAY_BE_UNFINISHED);
    expect(calls).toEqual(['readFlag', RAISE, AUTH_PW, 'revoke']);
  });

  it('email mirror fails: Auth rolled back to the old email, tokens revoked', async () => {
    const { ops, calls } = harness({ fail: { [MIRROR]: new Error('rtdb down') } });
    await expect(runAccountUpdate(emailChange, ops)).rejects.toThrow(NOTHING_CHANGED);
    expect(calls).toEqual(['readAuthEmail', AUTH_NEW, MIRROR, AUTH_OLD, 'revoke']);
  });

  it('email mirror AND rollback fail: still revoked, no "nothing was changed" claim', async () => {
    const { ops, calls } = harness({
      fail: { [MIRROR]: new Error('rtdb down'), [AUTH_OLD]: { code: 'auth/internal-error' } },
    });
    await expect(runAccountUpdate(emailChange, ops)).rejects.toThrow(MAY_BE_UNFINISHED);
    expect(calls).toEqual(['readAuthEmail', AUTH_NEW, MIRROR, AUTH_OLD, 'revoke']);
  });

  it('displayName-only: one Auth profile update, no reads, mirror or revoke', async () => {
    const { ops, calls } = harness();
    await runAccountUpdate({ email: '', newPassword: '', displayName: 'Pat Smith' }, ops);
    expect(calls).toEqual(['auth {"displayName":"Pat Smith"}']);
  });
});
