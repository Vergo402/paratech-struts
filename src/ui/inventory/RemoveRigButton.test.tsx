// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { StockRow } from '@core/schema';
import { RemoveRigButton } from './RemoveRigButton';

// jsdom has no exit animation, so the real Modal unmounts instantly. This stand-in keeps the
// footer mounted after `open` goes false — exactly the ~180 ms fade window in a real browser,
// where the destructive button is still on screen and tappable.
vi.mock('@ui/primitives', async () => {
  const actual = await vi.importActual<typeof import('@ui/primitives')>('@ui/primitives');
  return {
    ...actual,
    Modal: ({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) => (
      <div role="dialog" aria-label={title}>
        {children}
        {footer}
      </div>
    ),
  };
});

const line = (id: string): StockRow => ({
  id,
  type: 'strut',
  model: 'AT 25-36',
  system: 'AcmeThread',
  apparatus: 'Engine 1',
  apparatusId: 'e1',
  quantity: 2,
  held: 0,
  available: 2,
});

describe('RemoveRigButton — closing window', () => {
  it('ignores a press on the still-mounted destructive button after Cancel (no stray removal during the fade)', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const onRemoved = vi.fn();
    render(<RemoveRigButton rigId="e1" rigName="Engine 1" items={[line('i1')]} onRemove={onRemove} onRemoved={onRemoved} />);
    // the stand-in Modal is always mounted: [0] = the screen's Remove button, [1] = the dialog's destructive action
    const [openButton, dialogAction] = screen.getAllByRole('button', { name: 'Remove Engine 1' });
    await user.click(openButton!); // opens the confirm
    await user.click(screen.getByText('Cancel'));
    await user.click(dialogAction!); // pressed while the dialog is closing
    expect(onRemove).not.toHaveBeenCalled();
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
