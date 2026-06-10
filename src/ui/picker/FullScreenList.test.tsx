// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { FullScreenList } from './FullScreenList';

const small = ['A', 'B', 'C'].map((x) => ({ value: x, label: `Apparatus ${x}` }));
const big = Array.from({ length: 9 }, (_, i) => ({
  value: `a${i}`,
  label: `Apparatus ${i}`,
}));

function Harness({ options }: { options: typeof small | typeof big }) {
  const [open, setOpen] = useState(true);
  const [v, setV] = useState<string | null>(null);
  return (
    <>
      <span data-testid="value">{v ?? 'none'}</span>
      <FullScreenList
        open={open}
        onClose={() => setOpen(false)}
        title="Assign apparatus"
        options={options}
        value={v}
        onSelect={setV}
      />
    </>
  );
}

describe('FullScreenList', () => {
  it('search appears only above 7 items and filters locally', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness options={small} />);
    expect(screen.queryByLabelText('Search')).toBeNull(); // ≤7 — no search
    unmount();

    render(<Harness options={big} />);
    const search = screen.getByLabelText('Search');
    expect(screen.getAllByRole('option')).toHaveLength(9);

    await user.type(search, 'Apparatus 7');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: /apparatus 7/i })).toBeInTheDocument();
  });

  it('row tap commits and closes; Cancel leaves the value untouched', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Harness options={small} />);
    await user.click(screen.getByRole('option', { name: 'Apparatus B' }));
    expect(screen.getByTestId('value').textContent).toBe('B');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    unmount();

    render(<Harness options={small} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('value').textContent).toBe('none');
  });
});
