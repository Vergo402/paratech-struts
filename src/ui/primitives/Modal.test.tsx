// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

function Harness({ variant }: { variant?: 'confirm' | 'destructive' | 'form' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>open it</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="End Operation?"
        variant={variant}
        footer={
          <>
            <span data-modal-cancel tabIndex={0} role="button">
              Cancel
            </span>
            <Button variant="primary" destructive onPress={() => {}}>
              End Operation
            </Button>
          </>
        }
      >
        Ends the operation and archives every shore point.
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('renders an aria-modal dialog labelled by its title', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open it' }));
    const dialog = screen.getByRole('dialog', { name: 'End Operation?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('Esc always cancels and focus returns to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open it' });
    await user.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(opener).toHaveFocus();
  });

  it('destructive variant: initial focus lands on the safe default, never the danger button', async () => {
    const user = userEvent.setup();
    render(<Harness variant="destructive" />);
    await user.click(screen.getByRole('button', { name: 'open it' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus(),
    );
  });

  it('the top-right X closes the modal', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open it' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  // The form-variant "ignore outside tap" gate is a one-line onInteractOutside
  // branch; Radix's outside-dismiss doesn't fire via a synthetic body click in
  // jsdom, so it's verified live rather than with a flaky unit test.
});
