import { claimOverlay, releaseOverlay, hasOverlayClaim } from './overlay';

describe('overlay singleton', () => {
  it('claiming a second overlay closes the first', () => {
    const closeA = vi.fn();
    const closeB = vi.fn();

    claimOverlay(closeA);
    expect(closeA).not.toHaveBeenCalled();

    claimOverlay(closeB);
    expect(closeA).toHaveBeenCalledTimes(1); // first overlay told to close

    releaseOverlay(closeB);
    expect(hasOverlayClaim()).toBe(false);
  });

  it('re-claiming the same close is idempotent; stale release is a no-op', () => {
    const closeA = vi.fn();
    const closeB = vi.fn();

    claimOverlay(closeA);
    claimOverlay(closeA);
    expect(closeA).not.toHaveBeenCalled();

    claimOverlay(closeB);
    releaseOverlay(closeA); // stale — B holds the claim
    expect(hasOverlayClaim()).toBe(true);
    releaseOverlay(closeB);
    expect(hasOverlayClaim()).toBe(false);
  });
});
