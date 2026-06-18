// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { SideDrawer } from './SideDrawer';

// Desktop = matchMedia('(min-width:768px)') matches. Without the stub jsdom has no
// matchMedia → useIsDesktop()=false → the phone/modal branch (the test default).
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

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <SideDrawer open={open} onClose={() => setOpen(false)} title="Shore detail">
        <p>Body content</p>
      </SideDrawer>
    </>
  );
}

describe('SideDrawer — phone (modal drawer)', () => {
  it('renders a modal dialog over the scrim with the phone class', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.querySelector('.fs-drawer--phone')).not.toBeNull();
    expect(document.querySelector('.fs-scrim')).not.toBeNull();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('Esc closes and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });

  it('the Close button closes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('SideDrawer — desktop (docked companion)', () => {
  it('renders a non-modal complementary panel: no dialog, no scrim, dock class', async () => {
    stubDesktop();
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(screen.getByRole('complementary', { name: 'Shore detail' })).toBeInTheDocument();
    // The board beside it stays live — never a focus-trapping dialog, never a scrim.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.querySelector('.fs-scrim')).toBeNull();
    expect(document.querySelector('.fs-drawer--dock')).not.toBeNull();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('moves focus to Close on open and Esc closes + restores opener focus', async () => {
    stubDesktop();
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
  });
});
