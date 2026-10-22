// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// #555 — the members cold-read re-runs when the VIEWER's own role changes (the
// memberListener updated session.role), so an already-open /users re-reads its
// own-row badge / viewerIsAdmin instead of staying stale until a reload.
const h = vi.hoisted(() => {
  // a minimal zustand-shaped store (vi.hoisted can't import) — getState/setState/subscribe
  type S = { departmentId: string; departmentName: string; role: string; inviteCode: null };
  let state: S = { departmentId: 'dept-1', departmentName: 'QA', role: 'default', inviteCode: null };
  const subs = new Set<() => void>();
  return {
    readMembers: vi.fn(async () => ({})),
    session: {
      getState: () => state,
      setState: (patch: Partial<S>) => {
        state = { ...state, ...patch };
        subs.forEach((fn) => fn());
      },
      subscribe: (fn: () => void) => {
        subs.add(fn);
        return () => subs.delete(fn);
      },
    },
  };
});
vi.mock('@data/dept', () => ({ departmentService: { readMembers: h.readMembers } }));
vi.mock('@data/store', () => ({ sessionStore: { store: h.session } }));
const { readMembers, session } = h;

import { useUserManager } from './useUserManager';

describe('useUserManager — members read follows the viewer role', () => {
  beforeEach(() => {
    readMembers.mockClear();
    session.setState({ role: 'default' });
  });

  it('re-reads members when the own role changes, not on an unrelated re-render', async () => {
    const { rerender } = renderHook(() => useUserManager());
    await waitFor(() => expect(readMembers).toHaveBeenCalledTimes(1));
    rerender();
    expect(readMembers).toHaveBeenCalledTimes(1);
    act(() => session.setState({ role: 'admin' }));
    await waitFor(() => expect(readMembers).toHaveBeenCalledTimes(2));
  });
});
