import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemberListenerSync } from './memberListener';

// #555 — the member's own row listener, driven through an injected `subscribe`.

describe('memberListenerSync — own role assignment (#555)', () => {
  let cbs: Record<string, (snap: unknown) => void>;
  let unsub: ReturnType<typeof vi.fn>;
  let subscribe: ReturnType<typeof vi.fn>;
  let applyRemote: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cbs = {};
    unsub = vi.fn();
    applyRemote = vi.fn();
    subscribe = vi.fn((path: string, cb: (snap: unknown) => void) => {
      cbs[path] = cb;
      return unsub;
    });
  });

  const make = (member: { deptId: string; uid: string } | null = { deptId: 'dept-1', uid: 'u1' }) =>
    createMemberListenerSync({ member: () => member, applyRemote, subscribe });

  it('does not subscribe for a guest / no department', () => {
    make(null).start();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('subscribes to the member row path', () => {
    make().start();
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe.mock.calls[0]![0]).toBe('orgs/dept-1/members/u1');
  });

  it('forwards a snapshot with a new role to applyRemote', () => {
    make().start();
    const snap = { role: 'role-2', active: true };
    cbs['orgs/dept-1/members/u1']!(snap);
    expect(applyRemote).toHaveBeenCalledWith(snap);
  });

  it('start is idempotent', () => {
    const l = make();
    l.start();
    l.start();
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('stop unsubscribes (and allows a fresh start)', () => {
    const l = make();
    l.start();
    l.stop();
    expect(unsub).toHaveBeenCalledTimes(1);
    l.start();
    expect(subscribe).toHaveBeenCalledTimes(2);
  });
});
