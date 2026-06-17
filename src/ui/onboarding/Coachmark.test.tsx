// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Coachmark } from './Coachmark';
import type { TourStep } from './tours';

const STEPS: TourStep[] = [
  { anchor: 'a', title: 'First', body: 'first body' },
  { anchor: 'b', title: 'Second', body: 'second body' },
];

beforeEach(() => {
  for (const id of ['a', 'b']) {
    const el = document.createElement('div');
    el.setAttribute('data-tour', id);
    document.body.appendChild(el);
  }
});

afterEach(() => {
  cleanup();
  document.body.querySelectorAll('[data-tour], #outside').forEach((n) => n.remove());
});

describe('Coachmark (guided tips — non-dismissing)', () => {
  it('walks steps with Next and finishes on Done', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onExit = vi.fn();
    render(<Coachmark steps={STEPS} onComplete={onComplete} onExit={onExit} />);

    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('rings the active target and moves the ring as steps advance', async () => {
    const user = userEvent.setup();
    render(<Coachmark steps={STEPS} onComplete={vi.fn()} onExit={vi.fn()} />);
    expect(document.querySelector('[data-tour="a"]')).toHaveClass('fs-coachmark-target');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(document.querySelector('[data-tour="a"]')).not.toHaveClass('fs-coachmark-target');
    expect(document.querySelector('[data-tour="b"]')).toHaveClass('fs-coachmark-target');
  });

  it('Skip exits the lesson', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<Coachmark steps={STEPS} onComplete={vi.fn()} onExit={onExit} />);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('does NOT exit when the user works the live screen — the regression', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    const outside = document.createElement('button');
    outside.id = 'outside';
    outside.textContent = 'a live control';
    document.body.appendChild(outside);

    render(<Coachmark steps={STEPS} onComplete={vi.fn()} onExit={onExit} />);
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();

    // Tapping a live control (e.g. the deductions toggle) or the highlighted
    // target must never dismiss the tip or end the lesson (the bug bounced the
    // checklist hub back up here).
    await user.click(outside);
    await user.click(document.querySelector<HTMLElement>('[data-tour="a"]')!);

    expect(onExit).not.toHaveBeenCalled();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });
});
