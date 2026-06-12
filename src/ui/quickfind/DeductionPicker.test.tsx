// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { NO_DEDUCTIONS, type Deductions } from '@core/schema';
import { effectiveLengthFrom } from '@core/shorepoint';
import { DeductionPicker } from './DeductionPicker';

function Harness({ measurementEighths = 56 * 8 }: { measurementEighths?: number }) {
  const [d, setD] = useState<Deductions>(NO_DEDUCTIONS);
  return <DeductionPicker measurementEighths={measurementEighths} value={d} onChange={setD} />;
}

describe('DeductionPicker', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders the six ledger rows in the fixed order', () => {
    const { container } = render(<Harness />);
    const text = container.textContent!;
    const order = ['Raw opening', 'Header wood', 'Top plate', 'Bottom plate', 'Footer wood', 'Required strut length'];
    const positions = order.map((label) => text.indexOf(label));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('Effective equals the core math for a worked sample (56″ − 4×4 header = 52½″)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    const headerGroup = screen.getByRole('radiogroup', { name: 'Header wood' });
    await user.click(within(headerGroup).getByRole('radio', { name: '4×4' }));
    const expected = effectiveLengthFrom(56 * 8, { ...NO_DEDUCTIONS, headerWood: '4x4' });
    expect(expected).toBe(52.5);

    const effective = container.querySelector('.fs-ledger-effective .fs-ledger-value');
    expect(effective!.textContent).toBe('5212″'); // 52 + stacked ½ + ″
  });

  it('turns danger when deductions consume the opening', async () => {
    const user = userEvent.setup();
    // 8″ opening − 4×4 header (3.5) − 6×6 footer (5.5) = −1″
    const { container } = render(<Harness measurementEighths={8 * 8} />);
    const headerGroup = screen.getByRole('radiogroup', { name: 'Header wood' });
    const footerGroup = screen.getByRole('radiogroup', { name: 'Footer wood' });

    await user.click(within(headerGroup).getByRole('radio', { name: '4×4' }));
    await user.click(within(footerGroup).getByRole('radio', { name: '6×6' }));

    expect(container.querySelector('.fs-ledger-effective--danger')).not.toBeNull();
    expect(screen.getByText(/consume the whole opening/i)).toBeInTheDocument();
  });

  it('every deduction row shows a signed amount — −0″ unselected, −3½″ for 4×4 (KB-4)', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const rowValues = () =>
      [...container.querySelectorAll('.fs-picker-label-row .fs-ledger-value')].map(
        (el) => el.textContent,
      );
    // Header wood, Top plate, Bottom plate, Footer wood — nothing selected → −0″.
    expect(rowValues()).toEqual(['−0″', '−0″', '−0″', '−0″']);

    const headerGroup = screen.getByRole('radiogroup', { name: 'Header wood' });
    await user.click(within(headerGroup).getByRole('radio', { name: '4×4' }));
    expect(rowValues()[0]).toBe('−312″'); // −3 + stacked ½ + ″
  });

  it('plate options read as signed deductions, ≈ when not eighths-exact (KB-4)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /top plate/i }));
    // Swivel Base 6" is 1.8″ — not eighths-exact → ≈ −1¾″ (nearest ⅛″).
    const swivel = screen.getAllByRole('option', { name: /swivel base 6/i })[0]!;
    expect(swivel.querySelector('.fs-plate-sub')!.textContent).toBe('≈−134″');
    // None deducts nothing — still a signed amount, no prose.
    const none = screen.getAllByRole('option', { name: /^none/i })[0]!;
    expect(none.querySelector('.fs-plate-sub')!.textContent).toBe('−0″');
  });

  it('plate selection round-trips through onChange into the ledger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /top plate/i }));
    await user.click(screen.getAllByRole('option', { name: /swivel base 6/i })[0]!);
    expect(screen.getByRole('button', { name: /top plate/i }).textContent).toContain(
      'Swivel Base 6',
    );
  });
});
