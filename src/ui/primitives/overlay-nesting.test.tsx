// @vitest-environment jsdom
// Integration guard for the parent→child overlay stack (#220): the Add Shore
// Point form modal hosts the plate grid + picker sheets. Opening a child must
// never close its host, and Esc must peel one layer at a time.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Modal } from '@ui/primitives';
import { VisualGridPicker } from '@ui/picker';

function Harness({ onModalClose }: { onModalClose: () => void }) {
  const [plate, setPlate] = useState('none');
  return (
    <Modal open onClose={onModalClose} title="Host" variant="form">
      <VisualGridPicker
        label="Top plate"
        options={[
          { id: 'none', name: 'None' },
          { id: 'p1', name: 'Plate One' },
        ]}
        value={plate}
        onSelect={setPlate}
      />
    </Modal>
  );
}

describe('overlay nesting — grid inside a form modal', () => {
  it('opening the grid keeps the host modal open; picking commits and keeps it open', async () => {
    const user = userEvent.setup();
    const onModalClose = vi.fn();
    render(<Harness onModalClose={onModalClose} />);

    await user.click(screen.getByRole('button', { name: /Top plate/ }));
    expect(document.querySelector('.fs-plate-grid.open')).not.toBeNull();
    expect(onModalClose).not.toHaveBeenCalled();

    // fireEvent, not userEvent: the Radix modal puts pointer-events: none on
    // <body>; the grid's `.open` CSS re-enables it, but jsdom never loads the
    // stylesheet, so userEvent's pointer-events check false-positives here.
    fireEvent.click(screen.getByRole('option', { name: /Plate One/ }));
    expect(document.querySelector('.fs-plate-grid.open')).toBeNull();
    expect(onModalClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Top plate/ })).toHaveTextContent('Plate One');
  });

  it('Esc peels one layer at a time — grid first, modal second', async () => {
    const user = userEvent.setup();
    const onModalClose = vi.fn();
    render(<Harness onModalClose={onModalClose} />);

    await user.click(screen.getByRole('button', { name: /Top plate/ }));
    await user.keyboard('{Escape}');
    expect(document.querySelector('.fs-plate-grid.open')).toBeNull(); // grid closed
    expect(onModalClose).not.toHaveBeenCalled(); // modal stays

    await user.keyboard('{Escape}');
    expect(onModalClose).toHaveBeenCalledTimes(1); // now the modal
  });
});
