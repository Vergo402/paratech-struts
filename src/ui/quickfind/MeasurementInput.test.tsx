// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { setNativeControls } from '@ui/primitives';
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
const feetField = () => screen.getByRole('textbox', { name: 'Feet' });
const inchesField = () => screen.getByRole('textbox', { name: 'Inches' });

describe('MeasurementInput', () => {
  afterEach(() => setNativeControls(false)); // never leak the fallback into the strip tests

  it('feet and inches type straight into exact eighths (#248)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);

    await user.type(feetField(), '4');
    expect(eighths()).toBe(4 * 96); // 4 ft
    await user.type(inchesField(), '6');
    expect(eighths()).toBe(4 * 96 + 6 * 8); // 4 ft 6 in
  });

  it('feet / inches / strip-fraction compose into one exact value', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);
    await user.type(feetField(), '5');
    await user.type(inchesField(), '2');
    await user.click(screen.getByRole('radio', { name: '1/2 inch' }));
    expect(eighths()).toBe(5 * 96 + 2 * 8 + 4); // 5 ft 2 1/2 in
  });

  it('the typed fields reflect the committed value (derived, not stale text)', async () => {
    const user = userEvent.setup();
    render(<Harness initial={48 * 8} />); // 4 ft exactly
    expect(feetField()).toHaveValue('4');
    expect(inchesField()).toHaveValue(''); // 0 in → placeholder
    await user.type(inchesField(), '3');
    expect(feetField()).toHaveValue('4');
    expect(inchesField()).toHaveValue('3');
    expect(eighths()).toBe(48 * 8 + 3 * 8);
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

  it('falls back to an OS-native <select> for the fraction under Native controls (#398)', async () => {
    const user = userEvent.setup();
    setNativeControls(true);
    render(<Harness initial={40 * 8} />);

    // The custom tap-strip is gone; a native <select> carries the fraction instead.
    expect(screen.queryByRole('radio')).toBeNull();
    const select = screen.getByRole('combobox', { name: /eighths of an inch/i });
    await user.selectOptions(select, '4'); // 1/2 inch
    expect(eighths()).toBe(40 * 8 + 4);
  });

  it('holds at the 30 ft ceiling with an inline message — never over max', async () => {
    const user = userEvent.setup();
    render(<Harness initial={2880} />); // exactly 30 ft
    await user.type(inchesField(), '5'); // 30 ft + 5 in would exceed → rejected
    expect(eighths()).toBe(2880);
    expect(screen.getByText(/maximum opening is 30 ft/i)).toBeInTheDocument();

    // A legal change clears the message.
    await user.clear(feetField()); // 30 ft → 0
    expect(eighths()).toBe(0);
    expect(screen.queryByText(/maximum opening is 30 ft/i)).toBeNull();
  });

  it('clears the ceiling note on blur — it never lingers stale beside a kept value', async () => {
    const user = userEvent.setup();
    render(<Harness initial={2880} />); // exactly 30 ft
    await user.type(inchesField(), '5'); // overshoot → rejected, note shows
    expect(screen.getByText(/maximum opening is 30 ft/i)).toBeInTheDocument();
    expect(eighths()).toBe(2880); // value stays the last good 30 ft
    await user.tab(); // move on — the kept value (30 ft) is valid
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
    await user.type(screen.getByRole('textbox', { name: 'Feet' }), '4');
    await user.click(screen.getByRole('radio', { name: '7/8 inch' }));
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((n) => Number.isInteger(n))).toBe(true);
  });

  it('takes the whole opening typed in inches — 72 in = 6 ft, digits stay put, never compounding', async () => {
    const user = userEvent.setup();
    render(<Harness initial={0} />);

    // Type the whole opening in inches. The 72 must NOT roll into the feet box
    // and vanish, and each digit must NOT re-add the feet (the wild-growth bug).
    await user.type(inchesField(), '72');
    expect(eighths()).toBe(72 * 8); // 576 eighths = exactly 6 ft, not compounded
    expect(inchesField()).toHaveValue('72'); // the digits stay where you typed them
    expect(feetField()).toHaveValue(''); // feet box left empty — inches holds it all

    // Keep going: 88 in is still exact, never feet*96 stacked on top.
    await user.clear(inchesField());
    await user.type(inchesField(), '88');
    expect(eighths()).toBe(88 * 8);
    expect(inchesField()).toHaveValue('88');
  });
});
