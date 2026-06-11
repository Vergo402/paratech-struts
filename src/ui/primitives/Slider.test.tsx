// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { Slider, shouldCommit } from './Slider';
import { dragSlide, slideToCommit } from './Slider.testkit';

describe('shouldCommit (the pure threshold)', () => {
  it('commits only past the threshold fraction of travel', () => {
    expect(shouldCommit(79, 100)).toBe(false);
    expect(shouldCommit(80, 100)).toBe(true);
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
    await dragSlide(container.querySelector('.fs-slide') as HTMLElement, 100); // < 148px threshold

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
