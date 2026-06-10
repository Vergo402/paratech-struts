// @vitest-environment jsdom
import {
  claimOverlay,
  releaseOverlay,
  hasOverlayClaim,
  isTopOverlay,
  overlayContains,
} from './overlay';

describe('overlay claim — peers close each other', () => {
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

describe('overlay claim — parent→child nesting (#220 picker-in-modal)', () => {
  function overlayDom() {
    const modal = document.createElement('div');
    const trigger = document.createElement('button');
    modal.appendChild(trigger);
    document.body.appendChild(modal);
    return { modal, trigger };
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('a child opened from inside the current overlay stacks — parent stays open', () => {
    const { modal, trigger } = overlayDom();
    const closeModal = vi.fn();
    const closeChild = vi.fn();

    claimOverlay(closeModal, { container: () => modal });
    claimOverlay(closeChild, { opener: trigger }); // opened from inside the modal
    expect(closeModal).not.toHaveBeenCalled();
    expect(isTopOverlay(closeChild)).toBe(true);
    expect(isTopOverlay(closeModal)).toBe(false);

    releaseOverlay(closeChild); // child closes → claim returns to the parent
    expect(isTopOverlay(closeModal)).toBe(true);
    releaseOverlay(closeModal);
  });

  it('a sibling opened from the same parent closes the open child, not the parent', () => {
    const { modal, trigger } = overlayDom();
    const closeModal = vi.fn();
    const closeChildA = vi.fn();
    const closeChildB = vi.fn();

    claimOverlay(closeModal, { container: () => modal });
    claimOverlay(closeChildA, { opener: trigger });
    claimOverlay(closeChildB, { opener: trigger }); // peer of A, child of modal
    expect(closeChildA).toHaveBeenCalledTimes(1);
    expect(closeModal).not.toHaveBeenCalled();

    releaseOverlay(closeChildB);
    releaseOverlay(closeModal);
  });

  it('an unrelated overlay (opener outside the stack) closes everything below it', () => {
    const { modal, trigger } = overlayDom();
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const closeModal = vi.fn();
    const closeChild = vi.fn();
    const closeOther = vi.fn();

    claimOverlay(closeModal, { container: () => modal });
    claimOverlay(closeChild, { opener: trigger });
    claimOverlay(closeOther, { opener: outside }); // peer of the whole stack
    expect(closeChild).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);

    releaseOverlay(closeOther);
  });

  it('overlayContains is true only for targets inside a claimed container', () => {
    const { modal, trigger } = overlayDom();
    const stray = document.createElement('div');
    document.body.appendChild(stray);
    const closeModal = vi.fn();

    claimOverlay(closeModal, { container: () => modal });
    expect(overlayContains(trigger)).toBe(true);
    expect(overlayContains(stray)).toBe(false);
    expect(overlayContains(null)).toBe(false);

    releaseOverlay(closeModal);
  });
});
