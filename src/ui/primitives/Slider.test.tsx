// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Slider, shouldCommit, buttonLabelFrom } from './Slider';
import { cancelSlide, dragSlide, slideToCommit } from './Slider.testkit';

// jsdom has no PointerEvent; MouseEvent carries clientX (which the handlers read).
const ptr = (type: string, clientX: number) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
const rect = (width: number): DOMRect =>
  ({ width, height: 56, top: 0, left: 0, right: width, bottom: 56, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

describe('shouldCommit (the pure threshold)', () => {
  it('commits only past the threshold fraction of travel (0.6, finalized in S12)', () => {
    expect(shouldCommit(59, 100)).toBe(false);
    expect(shouldCommit(60, 100)).toBe(true);
    expect(shouldCommit(100, 100)).toBe(true);
    expect(shouldCommit(0, 100)).toBe(false);
  });

  it('zero/unmeasured track never commits (jsdom safety)', () => {
    expect(shouldCommit(50, 0)).toBe(false);
  });
});

describe('Slider', () => {
  it('renders the full step label and NO button — the gesture is the only commit path (ADR-026)', () => {
    render(<Slider label="Slide to set Runner" onCommit={() => {}} />);
    expect(screen.getByText('Slide to set Runner')).toBeInTheDocument();
    // The thumb is aria-hidden; no twin, no AT/keyboard equivalent — KB-5 ruling.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a full drag past the threshold commits exactly once', async () => {
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to set Runner" onCommit={onCommit} />);
    await slideToCommit(container.querySelector('.fs-slide') as HTMLElement);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('FAST flick commits: move + release before a re-render, so onPointerEnd must read the ref not the state', () => {
    // The field bug. The down/move/up handlers here are all the SAME instances
    // from the initial render, so they close over `offset === 0`. The move's
    // setOffsetState(184) does not change THAT closed-over value — only a
    // re-render would mint handlers closing over 184. So a state-reading
    // onPointerEnd computes shouldCommit(0, …) → false and never commits (the
    // fast-flick: the user slid the whole way, nothing happened). The ref is
    // written synchronously in the move, so onPointerEnd reads 184 → commits.
    //   IMPORTANT for whoever maintains this: do NOT wrap each event in its own
    //   act(). A flush between move and up re-renders, mints a handler closing
    //   over 184, and the buggy state-read version would then pass too — silently
    //   gutting this guard. One act(), three events, is the point.
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to send to Runner" onCommit={onCommit} />);
    const track = container.querySelector('.fs-slide-track') as HTMLElement;
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;
    const trackSpy = vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(rect(240));
    const thumbSpy = vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(rect(48));
    try {
      act(() => {
        thumb.dispatchEvent(ptr('pointerdown', 400));
        thumb.dispatchEvent(ptr('pointermove', 400 + 184)); // full travel
        thumb.dispatchEvent(ptr('pointerup', 400 + 184));
      });
      expect(onCommit).toHaveBeenCalledTimes(1);
    } finally {
      trackSpy.mockRestore();
      thumbSpy.mockRestore();
    }
  });

  it('a bare TAP on the track (press + release, no travel) does not commit', () => {
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to send to Runner" onCommit={onCommit} />);
    const track = container.querySelector('.fs-slide-track') as HTMLElement;
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;
    const trackSpy = vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(rect(240));
    const thumbSpy = vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(rect(48));
    try {
      act(() => {
        thumb.dispatchEvent(ptr('pointerdown', 200));
        thumb.dispatchEvent(ptr('pointerup', 200)); // no pointermove — zero travel
      });
      expect(onCommit).not.toHaveBeenCalled();
    } finally {
      trackSpy.mockRestore();
      thumbSpy.mockRestore();
    }
  });

  it('a bare tap AFTER an orphaned full drag does not commit (the press re-zeroes the ref)', () => {
    // Orphaned drag = full travel with no matching pointerup (lost pointer
    // capture / interleaved second touch). Without re-zeroing on the next press,
    // the ref stays hot at 184 and a later TAP would commit with no slide.
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to send to Runner" onCommit={onCommit} />);
    const track = container.querySelector('.fs-slide-track') as HTMLElement;
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;
    const trackSpy = vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(rect(240));
    const thumbSpy = vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(rect(48));
    try {
      act(() => {
        thumb.dispatchEvent(ptr('pointerdown', 400));
        thumb.dispatchEvent(ptr('pointermove', 400 + 184)); // full travel — ref now hot
        // no pointerup: the gesture is orphaned
      });
      act(() => {
        thumb.dispatchEvent(ptr('pointerdown', 100)); // fresh press must re-zero the ref
        thumb.dispatchEvent(ptr('pointerup', 100)); // bare tap — no travel
      });
      expect(onCommit).not.toHaveBeenCalled();
    } finally {
      trackSpy.mockRestore();
      thumbSpy.mockRestore();
    }
  });

  it('a past-threshold drag that ends in pointercancel does NOT commit (audit W4)', async () => {
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to set Runner" onCommit={onCommit} />);
    await cancelSlide(container.querySelector('.fs-slide') as HTMLElement);
    expect(onCommit).not.toHaveBeenCalled();
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;
    expect(thumb.style.transform).toBe('translateX(0px)'); // snapped back, never committed
  });

  // #462 — a gate can close mid-gesture (e.g. a peer sync regresses a group
  // mate under the operator's thumb). onPointerEnd must re-check `disabled` at
  // release, not just trust the press-time value — same doctrine as the
  // pointercancel guard above: a disabled-mid-drag gesture snaps back without
  // committing.
  it('disabled flipping mid-drag makes release a no-op — no commit even past threshold', () => {
    const onCommit = vi.fn();
    const { container, rerender } = render(
      <Slider label="Slide to set Runner" onCommit={onCommit} />,
    );
    const track = container.querySelector('.fs-slide-track') as HTMLElement;
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;
    const trackSpy = vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(rect(240));
    const thumbSpy = vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(rect(48));
    try {
      act(() => {
        thumb.dispatchEvent(ptr('pointerdown', 400));
        thumb.dispatchEvent(ptr('pointermove', 400 + 184)); // full travel — past threshold
      });
      // The gate closes mid-gesture — the finger is still down.
      rerender(<Slider label="Slide to set Runner" onCommit={onCommit} disabled />);
      act(() => {
        thumb.dispatchEvent(ptr('pointerup', 400 + 184));
      });
      expect(onCommit).not.toHaveBeenCalled();
      expect(thumb.style.transform).toBe('translateX(0px)'); // snapped back, never committed
    } finally {
      trackSpy.mockRestore();
      thumbSpy.mockRestore();
    }
  });

  it('step-back mirrors the drag leftward and commits', async () => {
    const onCommit = vi.fn();
    const { container } = render(
      <Slider label="Slide back to Cutting" direction="stepback" onCommit={onCommit} />,
    );
    await slideToCommit(container.querySelector('.fs-slide') as HTMLElement);
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('a short drag (under threshold) releases without committing and snaps back', async () => {
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to set Runner" onCommit={onCommit} />);
    await dragSlide(container.querySelector('.fs-slide') as HTMLElement, 90); // < 110.4px commit point (0.6 × 184px travel)

    expect(onCommit).not.toHaveBeenCalled();
    // Snap-back: inline transform returns to rest.
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;
    expect(thumb.style.transform).toBe('translateX(0px)');
  });

  it('disabled: the gesture is inert even at full travel', async () => {
    const onCommit = vi.fn();
    const { container } = render(
      <Slider label="Slide to set Runner" onCommit={onCommit} disabled />,
    );
    await slideToCommit(container.querySelector('.fs-slide') as HTMLElement);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('disabledReason renders as the visible reason line, outside the faded track', () => {
    const { container } = render(
      <Slider
        label="Slide to set Strut Set"
        onCommit={vi.fn()}
        disabled
        disabledReason="Waiting on group — 1 of 3 still Pending"
      />,
    );
    const reason = screen.getByText('Waiting on group — 1 of 3 still Pending');
    expect(reason).toHaveClass('fs-slide-reason');
    // The reason sits OUTSIDE .fs-slide-track — the track fades, the reason doesn't.
    expect(reason.closest('.fs-slide-track')).toBeNull();
    expect(container.querySelector('.fs-slide--disabled')).not.toBeNull();
  });

  it('the reason line is gate-only — never rendered while enabled', () => {
    render(<Slider label="Slide to set Runner" onCommit={vi.fn()} disabledReason="not yet" />);
    expect(screen.queryByText('not yet')).toBeNull();
  });
});

describe('buttonLabelFrom (the mouse-branch label transform)', () => {
  it('strips the slide prefix and capitalizes — all current call-site labels', () => {
    expect(buttonLabelFrom('Slide to set Strut Set')).toBe('Set Strut Set');
    expect(buttonLabelFrom('Slide to send to Cutting Station')).toBe('Send to Cutting Station');
    expect(buttonLabelFrom('Slide to send to Runner')).toBe('Send to Runner');
    expect(buttonLabelFrom('Slide to mark Cut Done')).toBe('Mark Cut Done');
    expect(buttonLabelFrom('Slide to set Wood Shore Secured')).toBe('Set Wood Shore Secured');
    expect(buttonLabelFrom('Slide back to Pending Equipment')).toBe('Back to Pending Equipment');
    expect(buttonLabelFrom('Slide back to Equipment Assigned')).toBe('Back to Equipment Assigned');
    expect(buttonLabelFrom('Slide back to Strut Set')).toBe('Back to Strut Set');
    expect(buttonLabelFrom('Slide back to Cutting Station')).toBe('Back to Cutting Station');
    expect(buttonLabelFrom('Slide back to Runner')).toBe('Back to Runner');
    expect(buttonLabelFrom('Slide back — clear Cut Done')).toBe('Clear Cut Done');
  });
});

// On a MOUSE (ADR-034) the slide swaps for a tap-once button. jsdom has no
// matchMedia, so the slide-branch tests above keep the slide path; here we stub
// it to assert the pointer-device branch. The afterEach removes the stub so the
// stub never leaks into another file's no-matchMedia assumption.
describe('Slider — mouse branch (ADR-034: button instead of slide on a pointer device)', () => {
  const mockMouse = () => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  };
  afterEach(() => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
  });

  it('renders a tap-once button (no slide track) and commits on a single click', () => {
    mockMouse();
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to set Wood Shore Secured" onCommit={onCommit} />);
    expect(container.querySelector('.fs-slide-track')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Set Wood Shore Secured' }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('advance → primary button, step-back → secondary button', () => {
    mockMouse();
    const { rerender } = render(<Slider label="Slide to send to Cutting Station" onCommit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Send to Cutting Station' })).toHaveClass('fs-button--primary');
    rerender(<Slider label="Slide back to Cutting Station" direction="stepback" onCommit={vi.fn()} />);
    // A status step-back collapses to a compact "Back" on the mouse branch (the
    // advance button names the forward move; the card lays them on one row).
    expect(screen.getByRole('button', { name: 'Back' })).toHaveClass('fs-button--secondary');
  });

  it('disabled: the button is inert and still shows the gate reason', () => {
    mockMouse();
    const onCommit = vi.fn();
    render(
      <Slider
        label="Slide to set Strut Set"
        onCommit={onCommit}
        disabled
        disabledReason="Waiting on group — 1 of 3 still Pending"
      />,
    );
    const btn = screen.getByRole('button', { name: 'Set Strut Set' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText('Waiting on group — 1 of 3 still Pending')).toBeInTheDocument();
  });
});
