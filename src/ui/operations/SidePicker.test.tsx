// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SidePicker } from './SidePicker';

describe('SidePicker', () => {
  it('opens the bird’s-eye grid; selecting a face reports its value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SidePicker value={undefined} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Side' }));
    await user.click(screen.getByRole('button', { name: 'C side' }));
    expect(onChange).toHaveBeenCalledWith('C');
  });

  it('selecting a corner reports the corner value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SidePicker value={undefined} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Side' }));
    await user.click(screen.getByRole('button', { name: 'A/B corner' }));
    expect(onChange).toHaveBeenCalledWith('A/B');
  });

  it('the centre clears the side', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SidePicker value="A" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Side' }));
    await user.click(screen.getByRole('button', { name: 'Clear side' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
