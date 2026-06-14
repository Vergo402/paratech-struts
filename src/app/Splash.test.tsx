// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Splash } from './Splash';

describe('Splash (audit W6)', () => {
  it('shows booting copy and no retry button while booting', () => {
    render(<Splash />);
    expect(screen.getByText(/BOOTING/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('surfaces the error and a Try again button that calls onRetry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<Splash error="QuotaExceededError" onRetry={onRetry} />);
    expect(screen.getByText(/QuotaExceededError/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows no retry button when an error has no onRetry handler', () => {
    render(<Splash error="boom" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
