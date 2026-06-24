import { describe, it, expect, vi, beforeEach } from 'vitest';

const pushMock = vi.fn();
const refMock = vi.fn((_db: unknown, path: string) => ({ path }));
vi.mock('../sync/firebase', () => ({
  rtdb: {},
  ref: (db: unknown, path: string) => refMock(db, path),
  push: (r: unknown, v: unknown) => pushMock(r, v),
  serverTimestamp: () => ({ '.sv': 'timestamp' }),
}));
vi.mock('@core/version', () => ({ APP_VERSION: 'v9.9.9-test' }));

import { createFeedbackService } from './feedbackService';

function sessionWith(identity: unknown, dept = { id: 'dept-1', name: 'Hamden' }) {
  return {
    store: {
      getState: () => ({ identity, departmentId: dept.id, departmentName: dept.name }),
    },
  } as never;
}

beforeEach(() => {
  pushMock.mockReset().mockResolvedValue(undefined);
  refMock.mockClear();
});

describe('feedbackService', () => {
  const member = { kind: 'member', accountId: 'uid-7', displayName: 'Cap' };

  it('pushes a payload with category/text/timestamp + deptId/appVersion/uid', async () => {
    const svc = createFeedbackService({ session: () => sessionWith(member) });
    const res = await svc.submit({ category: 'bug', text: '  busted  ' });
    expect(res).toEqual({ ok: true });
    expect(refMock).toHaveBeenCalledWith(expect.anything(), 'feedback');
    const payload = pushMock.mock.calls[0][1];
    expect(payload).toMatchObject({
      category: 'bug',
      text: 'busted', // trimmed
      deptId: 'dept-1',
      deptName: 'Hamden',
      appVersion: 'v9.9.9-test',
      uid: 'uid-7',
    });
    expect(payload.timestamp).toEqual({ '.sv': 'timestamp' });
  });

  it('rejects an empty message without writing', async () => {
    const svc = createFeedbackService({ session: () => sessionWith(member) });
    const res = await svc.submit({ category: 'idea', text: '   ' });
    expect(res.ok).toBe(false);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('asks a guest to sign in (the /feedback rule needs auth)', async () => {
    const svc = createFeedbackService({ session: () => sessionWith({ kind: 'guest' }) });
    const res = await svc.submit({ category: 'other', text: 'hi' });
    expect(res).toEqual({ ok: false, reason: 'Sign in to send feedback.' });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('maps a permission_denied write to a friendly reason', async () => {
    pushMock.mockRejectedValue(new Error('PERMISSION_DENIED: nope'));
    const svc = createFeedbackService({ session: () => sessionWith(member) });
    const res = await svc.submit({ category: 'bug', text: 'x' });
    expect(res).toEqual({ ok: false, reason: 'Sign in to send feedback.' });
  });
});
