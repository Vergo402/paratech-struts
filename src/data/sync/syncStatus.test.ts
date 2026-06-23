import { describe, it, expect } from 'vitest';
import { createSyncStatusStore } from './syncStatus';

// The reactive sync-status store (Increment 4) — plain state, the banner subscribes.

describe('syncStatusStore', () => {
  it('updates online, pendingCount, and pendingJoin reactively', () => {
    const s = createSyncStatusStore();

    s.setOnline(false);
    expect(s.store.getState().online).toBe(false);
    s.setOnline(true);
    expect(s.store.getState().online).toBe(true);

    s.setPending(3);
    expect(s.store.getState().pendingCount).toBe(3);
    s.setPending(0);
    expect(s.store.getState().pendingCount).toBe(0);

    s.setPendingJoin({ code: 'HAMD-4F2K', deptName: 'Hamden FD' });
    expect(s.store.getState().pendingJoin).toEqual({ code: 'HAMD-4F2K', deptName: 'Hamden FD' });
    s.setPendingJoin(null);
    expect(s.store.getState().pendingJoin).toBeNull();
  });
});
