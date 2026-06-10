// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Slider, shouldCommit } from './Slider';

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
  it('renders the full step label, untruncated, and the #37 visible button', () => {
    render(<Slider label="Slide to set Runner" onCommit={() => {}} />);
    expect(screen.getByText('Slide to set Runner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advance' })).toBeInTheDocument();
  });

  it('#37 button commits the same step', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Slider label="Slide to set Runner" buttonLabel="Set Runner" onCommit={onCommit} />);
    await user.click(screen.getByRole('button', { name: 'Set Runner' }));
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it('step-back direction renders its secondary button', () => {
    render(<Slider label="Slide back to Cutting" direction="stepback" onCommit={() => {}} />);
    expect(screen.getByRole('button', { name: 'Step back' })).toBeInTheDocument();
  });

  it('a short drag releases without committing (jsdom: zero travel never commits)', () => {
    const onCommit = vi.fn();
    const { container } = render(<Slider label="Slide to set Runner" onCommit={onCommit} />);
    const thumb = container.querySelector('.fs-slide-thumb') as HTMLElement;

    fireEvent.pointerDown(thumb, { pointerId: 1, clientX: 10 });
    fireEvent.pointerMove(thumb, { pointerId: 1, clientX: 40 });
    fireEvent.pointerUp(thumb, { pointerId: 1, clientX: 40 });

    expect(onCommit).not.toHaveBeenCalled();
    // Snap-back: inline transform returns to rest.
    expect(thumb.style.transform).toBe('translateX(0px)');
  });

  it('disabled: gesture and button both inert', async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    render(<Slider label="Slide to set Runner" onCommit={onCommit} disabled />);
    await user.click(screen.getByRole('button', { name: 'Advance' }));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('disabledReason renders adjacent to the #37 button (disabled-with-reason)', () => {
    render(
      <Slider
        label="Slide to set Strut Set"
        onCommit={vi.fn()}
        disabled
        disabledReason="Waiting on group — 1 of 3 still Pending"
      />,
    );
    expect(screen.getByText('Waiting on group — 1 of 3 still Pending')).toBeInTheDocument();
  });
});
