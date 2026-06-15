// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { BottomSheetPicker } from '@ui/picker';
import { Modal } from './Modal';

// Desktop = matchMedia('(min-width:768px)') matches. Without this stub jsdom has
// no matchMedia → useIsDesktop()=false → the Sheet branch — so every assertion
// below targets a POPOVER-specific marker (`.fs-popover`, and the ABSENCE of a
// role=dialog) so a forgotten stub fails loud instead of false-passing on Sheet.
function stubDesktop() {
  const mql = {
    matches: true,
    media: '',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  } as unknown as MediaQueryList;
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
}

afterEach(() => vi.unstubAllGlobals());

const OPTS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Bravo' },
] as const;

function Harness() {
  const [v, setV] = useState<'a' | 'b'>('a');
  return <BottomSheetPicker label="Pick" options={OPTS} value={v} onSelect={setV} />;
}

describe('PickerSurface — desktop dropdown (Popover)', () => {
  it('opens as a Popover (a dropdown), not a Sheet', async () => {
    stubDesktop();
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Pick' }));
    // `.fs-popover` is the dropdown marker (the Sheet renders `.fs-sheet`); this
    // fails loud on the phone/Sheet branch if the desktop stub is ever dropped.
    // Both surfaces are Radix dialogs, so role can't tell them apart — the class can.
    expect(document.querySelector('.fs-popover')).not.toBeNull();
    expect(screen.getByRole('option', { name: 'Bravo' })).toBeInTheDocument();
  });

  it('commits a selection and closes', async () => {
    stubDesktop();
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Pick' }));
    await user.click(screen.getByRole('option', { name: 'Bravo' }));
    expect(document.querySelector('.fs-popover')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pick' })).toHaveTextContent('Bravo');
  });

  it('inside a form Modal, Esc peels the dropdown first, then the modal', async () => {
    stubDesktop();
    const user = userEvent.setup();
    function ModalHarness() {
      const [v, setV] = useState<'a' | 'b'>('a');
      const [open, setOpen] = useState(true);
      return (
        <Modal open={open} onClose={() => setOpen(false)} title="Form" variant="form">
          <BottomSheetPicker label="Pick" options={OPTS} value={v} onSelect={setV} />
        </Modal>
      );
    }
    render(<ModalHarness />);
    await user.click(screen.getByRole('button', { name: 'Pick' }));
    expect(document.querySelector('.fs-popover')).not.toBeNull();

    await user.keyboard('{Escape}'); // peels the dropdown, NOT the form
    expect(document.querySelector('.fs-popover')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}'); // now the form
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
