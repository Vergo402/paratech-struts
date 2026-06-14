// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BuildingPicker } from './BuildingPicker';

describe('BuildingPicker', () => {
  it('the trigger shows the selected building, or a placeholder when none', () => {
    const { rerender } = render(<BuildingPicker value="" onChange={() => {}} buildings={[]} />);
    expect(screen.getByRole('button', { name: /Building/ })).toHaveTextContent('Select building');
    rerender(<BuildingPicker value="North tower" onChange={() => {}} buildings={['North tower']} />);
    expect(screen.getByRole('button', { name: /Building/ })).toHaveTextContent('North tower');
  });

  it('lists existing buildings; selecting one calls onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BuildingPicker value="" onChange={onChange} buildings={['North tower', 'South tower']} />);
    await user.click(screen.getByRole('button', { name: /Building/ }));
    await user.click(screen.getByRole('option', { name: 'South tower' }));
    expect(onChange).toHaveBeenCalledWith('South tower');
  });

  it('"Add building" names a new building from the text input (trimmed)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BuildingPicker value="" onChange={onChange} buildings={[]} />);
    await user.click(screen.getByRole('button', { name: /Building/ }));
    await user.type(screen.getByRole('textbox', { name: 'Add building' }), '  East wing  ');
    await user.click(screen.getByRole('button', { name: '+ Add building' }));
    expect(onChange).toHaveBeenCalledWith('East wing');
  });
});
