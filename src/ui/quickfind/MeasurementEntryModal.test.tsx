// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MeasurementEntryModal } from './MeasurementEntryModal';

function Harness({ initial = 0 }: { initial?: number }) {
  const [v, setV] = useState(initial);
  const [open, setOpen] = useState(true);
  return (
    <>
      <span data-testid="eighths">{v}</span>
      <span data-testid="open">{String(open)}</span>
      <MeasurementEntryModal open={open} onClose={() => setOpen(false)} value={v} onChange={setV} />
    </>
  );
}

const eighths = () => Number(screen.getByTestId('eighths').textContent);
const isOpen = () => screen.getByTestId('open').textContent === 'true';
const slot = (name: RegExp) => screen.getByRole('button', { name });

describe('MeasurementEntryModal', () => {
  it('seeds the slots and strip from the committed value', () => {
    render(<Harness initial={4 * 96 + 8 * 8 + 3} />); // 4′ 8 3/8″
    expect(slot(/feet/i)).toHaveTextContent('4′');
    expect(slot(/inches/i)).toHaveTextContent('8');
    expect(screen.getByRole('radio', { name: '3/8 inch' })).toHaveAttribute('aria-checked', 'true');
  });

  it('digits type into the active slot — first press replaces, later presses append', async () => {
    const user = userEvent.setup();
    render(<Harness initial={4 * 96 + 8 * 8} />); // Feet active on open
    await user.click(screen.getByRole('button', { name: '1' }));
    expect(slot(/feet/i)).toHaveTextContent('1′'); // replaced the seeded 4
    await user.click(screen.getByRole('button', { name: '2' }));
    expect(slot(/feet/i)).toHaveTextContent('12′'); // appended
    await user.click(screen.getByRole('button', { name: '3' }));
    expect(slot(/feet/i)).toHaveTextContent('12′'); // feet capped at 2 digits
  });

  it('tapping a slot retargets the keypad, first press replacing', async () => {
    const user = userEvent.setup();
    render(<Harness initial={4 * 96 + 8 * 8} />);
    await user.click(slot(/inches/i));
    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '0' }));
    expect(slot(/inches/i)).toHaveTextContent('10″');
    expect(slot(/feet/i)).toHaveTextContent('4′'); // untouched
  });

  it('back deletes the last digit of the active slot; empty reads 0', async () => {
    const user = userEvent.setup();
    render(<Harness initial={4 * 96 + 8 * 8} />);
    await user.click(screen.getByRole('button', { name: 'Delete last digit' }));
    expect(slot(/feet/i)).toHaveTextContent('0′');
  });

  it('the strip sets the draft fraction without committing or closing', async () => {
    const user = userEvent.setup();
    render(<Harness initial={40 * 8} />); // 3′ 4″
    await user.click(screen.getByRole('radio', { name: '1/2 inch' }));
    expect(eighths()).toBe(40 * 8); // nothing committed yet
    expect(isOpen()).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Confirm measurement' }));
    expect(eighths()).toBe(40 * 8 + 4);
    expect(isOpen()).toBe(false);
  });

  it('OK composes feet + inches + fraction into exact eighths and closes', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);
    await user.click(screen.getByRole('button', { name: '5' })); // 5′
    await user.click(slot(/inches/i));
    await user.click(screen.getByRole('button', { name: '8' })); // 8″
    await user.click(screen.getByRole('radio', { name: '5/8 inch' }));
    await user.click(screen.getByRole('button', { name: 'Confirm measurement' }));
    expect(eighths()).toBe(5 * 96 + 8 * 8 + 5);
    expect(isOpen()).toBe(false);
  });

  it('over the 30 ft ceiling: inline message, stays open, commits nothing', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);
    await user.click(screen.getByRole('button', { name: '9' }));
    await user.click(screen.getByRole('button', { name: '9' })); // 99′
    await user.click(screen.getByRole('button', { name: 'Confirm measurement' }));
    expect(screen.getByText(/maximum opening is 30 ft/i)).toBeInTheDocument();
    expect(eighths()).toBe(0);
    expect(isOpen()).toBe(true);
    // correcting clears the message
    await user.click(screen.getByRole('button', { name: 'Delete last digit' }));
    expect(screen.queryByText(/maximum opening is 30 ft/i)).toBeNull();
  });

  it('every commit is an integer (exact eighths, never a float)', async () => {
    const user = userEvent.setup();
    const seen: number[] = [];
    function Capture() {
      const [v, setV] = useState(13);
      return (
        <MeasurementEntryModal
          open
          onClose={() => undefined}
          value={v}
          onChange={(next) => {
            seen.push(next);
            setV(next);
          }}
        />
      );
    }
    render(<Capture />);
    await user.click(screen.getByRole('radio', { name: '7/8 inch' }));
    await user.click(screen.getByRole('button', { name: 'Confirm measurement' }));
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((n) => Number.isInteger(n))).toBe(true);
  });
});
