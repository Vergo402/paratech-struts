// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MeasurementInput } from './MeasurementInput';

function Harness({ initial = 0 }: { initial?: number }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <span data-testid="eighths">{v}</span>
      <MeasurementInput value={v} onChange={setV} />
    </>
  );
}

const eighths = () => Number(screen.getByTestId('eighths').textContent);

describe('MeasurementInput', () => {
  it('steppers move by exact eighths: ±1″ = 8, ±1 ft = 96', async () => {
    const user = userEvent.setup();
    render(<Harness initial={40 * 8} />);

    await user.click(screen.getByRole('button', { name: 'Up one inch' }));
    expect(eighths()).toBe(40 * 8 + 8);
    await user.click(screen.getByRole('button', { name: 'Up one foot' }));
    expect(eighths()).toBe(40 * 8 + 8 + 96);
    await user.click(screen.getByRole('button', { name: 'Down one inch' }));
    await user.click(screen.getByRole('button', { name: 'Down one foot' }));
    expect(eighths()).toBe(40 * 8);
  });

  it('the tap-strip sets the eighths remainder and keeps the whole inches', async () => {
    const user = userEvent.setup();
    render(<Harness initial={40 * 8} />);
    await user.click(screen.getByRole('radio', { name: '5/8 inch' }));
    expect(eighths()).toBe(40 * 8 + 5);
    await user.click(screen.getByRole('radio', { name: '1/8 inch' }));
    expect(eighths()).toBe(40 * 8 + 1);
    await user.click(screen.getByRole('radio', { name: 'zero eighths' }));
    expect(eighths()).toBe(40 * 8);
  });

  it('strip cells read in reduced tape-measure form: 0, 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8', async () => {
    const user = userEvent.setup();
    render(<Harness initial={40 * 8} />);
    const labels = screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'));
    expect(labels).toEqual([
      'zero eighths',
      '1/8 inch',
      '1/4 inch',
      '3/8 inch',
      '1/2 inch',
      '5/8 inch',
      '3/4 inch',
      '7/8 inch',
    ]);
    // Reduced labels still commit the raw eighths value underneath.
    await user.click(screen.getByRole('radio', { name: '1/4 inch' }));
    expect(eighths()).toBe(40 * 8 + 2);
    await user.click(screen.getByRole('radio', { name: '1/2 inch' }));
    expect(eighths()).toBe(40 * 8 + 4);
    await user.click(screen.getByRole('radio', { name: '3/4 inch' }));
    expect(eighths()).toBe(40 * 8 + 6);
  });

  it('clamps at 0 with an inline message — no negative value ever emitted', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);
    await user.click(screen.getByRole('button', { name: 'Down one inch' }));
    expect(eighths()).toBe(0);
    expect(screen.getByText(/go below 0/i)).toBeInTheDocument();
  });

  it('clamps at the 30 ft ceiling with an inline message — never over max', async () => {
    const user = userEvent.setup();
    render(<Harness initial={2880} />);
    await user.click(screen.getByRole('button', { name: 'Up one inch' }));
    expect(eighths()).toBe(2880);
    expect(screen.getByText(/maximum opening is 30 ft/i)).toBeInTheDocument();

    // A legal change clears the message.
    await user.click(screen.getByRole('button', { name: 'Down one foot' }));
    expect(eighths()).toBe(2880 - 96);
    expect(screen.queryByText(/maximum opening is 30 ft/i)).toBeNull();
  });

  it('every emission is an integer (exact eighths, never a float)', async () => {
    const user = userEvent.setup();
    const seen: number[] = [];
    function Capture() {
      const [v, setV] = useState(13);
      return (
        <MeasurementInput
          value={v}
          onChange={(next) => {
            seen.push(next);
            setV(next);
          }}
        />
      );
    }
    render(<Capture />);
    await user.click(screen.getByRole('button', { name: 'Up one foot' }));
    await user.click(screen.getByRole('radio', { name: '7/8 inch' }));
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((n) => Number.isInteger(n))).toBe(true);
  });

  // Desktop hardware-typing path (jsdom has no matchMedia → isPhone=false).
  it('desktop: a typed measurement applies AND stays visible after Enter (regression)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);
    const field = screen.getByRole('textbox');
    await user.type(field, '48');
    await user.keyboard('{Enter}');
    expect(eighths()).toBe(48 * 8); // applied
    expect(field).toHaveValue('48'); // used to clear to '' on Enter — value invisible

    // Fractions round-trip through the same field.
    await user.clear(field);
    await user.type(field, '52 1/2');
    await user.keyboard('{Enter}');
    expect(eighths()).toBe(52 * 8 + 4);
    expect(field).toHaveValue('52 1/2');
  });

  it('desktop: the idle field reflects stepper/strip changes (reads from value, not stale text)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={48 * 8} />);
    const field = screen.getByRole('textbox');
    expect(field).toHaveValue('48');
    await user.click(screen.getByRole('button', { name: 'Up one foot' }));
    expect(field).toHaveValue('60'); // 48 + 12
    await user.click(screen.getByRole('radio', { name: '1/2 inch' }));
    expect(field).toHaveValue('60 1/2');
  });
});
