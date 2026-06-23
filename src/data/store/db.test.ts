import { describe, it, expect } from 'vitest';
import { isBucketStale, GUEST_BUCKET } from './db';

// The dev-only bucket guard (registry.ts) is built on this pure predicate: a
// commit is "stale" when the active store bucket no longer matches the signed-in
// member's department. boundBucket is the bare bucket key (a deptId or GUEST_BUCKET).
describe('isBucketStale', () => {
  it('is stale when a real department bucket no longer matches the session dept', () => {
    expect(isBucketStale('dept-abc', 'dept-xyz')).toBe(true);
  });

  it('is not stale when the bound bucket matches the session dept', () => {
    expect(isBucketStale('dept-abc', 'dept-abc')).toBe(false);
  });

  it('is not stale for a guest (no dept) sitting on the guest bucket', () => {
    expect(isBucketStale(GUEST_BUCKET, null)).toBe(false);
    expect(isBucketStale(GUEST_BUCKET, undefined)).toBe(false);
  });

  // The exact regression the guard exists to catch: a returning member whose
  // department was restored but whose stores never reloaded off the guest bucket,
  // so their writes would land in the shared guest cache (fixed in d5d04dd).
  it('is stale when a member with a real dept is still on the guest bucket', () => {
    expect(isBucketStale(GUEST_BUCKET, 'dept-abc')).toBe(true);
  });
});
