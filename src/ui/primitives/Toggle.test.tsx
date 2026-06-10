// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Toggle } from './Toggle';

function Harness({ label = 'Sync over cellular' }: { label?: string }) {
  const [on, setOn] = useState(false);
  return <Toggle label={label} checked={on} onChange={setOn} />;
}

describe('Toggle', () => {
  it('is a switch with a stable label in both states', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: 'Sync over cellular' });
    expect(sw).toHaveAttribute('aria-checked', 'false');

    await user.click(sw);
    // Same accessible name after the flip — the label never says Enable/Disable.
    expect(screen.getByRole('switch', { name: 'Sync over cellular' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('keyboard flips it (Space)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const sw = screen.getByRole('switch');
    sw.focus();
    await user.keyboard(' ');
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('the whole row is the tap target — clicking the label flips it', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Sync over cellular'));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});
