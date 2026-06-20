// @vitest-environment jsdom
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FloatingPanel } from './FloatingPanel';

// FloatingPanel renders identically on any media (the surface choice is the
// caller's — OperationsBoard picks FloatingPanel vs SideDrawer), so no matchMedia
// stub is needed. jsdom has no layout geometry → position math is exercised by
// the pure clampPanelPosition test; here we cover the dialog contract.
function Harness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <button type="button">Outside</button>
      <FloatingPanel open={open} onClose={() => { setOpen(false); onClose(); }} title="Shore detail">
        <p>Body content</p>
      </FloatingPanel>
    </div>
  );
}

describe('FloatingPanel', () => {
  it('renders nothing until opened', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens as a non-modal dialog with an accessible name and focus on Close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const panel = screen.getByRole('dialog', { name: 'Shore detail' });
    expect(panel).toBeInTheDocument();
    expect(panel.getAttribute('aria-modal')).toBeNull(); // non-modal — board stays live
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('Esc while focus is inside closes and calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not trap focus — a control outside the panel can take focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    expect(outside).toHaveFocus();
    expect(screen.getByRole('dialog')).toBeInTheDocument(); // still open — not modal
  });

  it('pointer-down on the header raises the panel to the front (z increases)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const panel = screen.getByRole('dialog');
    const before = Number(panel.style.zIndex);
    fireEvent.pointerDown(panel.querySelector('.fs-fp-handle')!, { pointerId: 1 });
    expect(Number(panel.style.zIndex)).toBeGreaterThan(before);
  });

  it('renders the bottom resize bar (height is auto until dragged)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const panel = screen.getByRole('dialog');
    // The bar is present + aria-hidden (a pointer enhancement); the actual
    // drag-to-resize is geometry/pointer-driven and verified manually, not here.
    const bar = panel.querySelector('.fs-fp-resize');
    expect(bar).not.toBeNull();
    expect(bar).toHaveAttribute('aria-hidden', 'true');
    expect(panel.style.height).toBe(''); // auto-sized until a resize drag sets it
  });
});
