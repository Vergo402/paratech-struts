// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { NO_DEDUCTIONS, type Deductions } from '@core/schema';
import { effectiveLengthFrom } from '@core/shorepoint';
import { DeductionPicker } from './DeductionPicker';

function Harness({
  measurementEighths = 56 * 8,
  collapsible = false,
  initial = NO_DEDUCTIONS,
}: {
  measurementEighths?: number;
  collapsible?: boolean;
  initial?: Deductions;
}) {
  const [d, setD] = useState<Deductions>(initial);
  return (
    <DeductionPicker measurementEighths={measurementEighths} value={d} onChange={setD} collapsible={collapsible} />
  );
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
    expect(effective!.textContent).toBe('52 1/2″'); // 52 + diagonal ½ + ″ (ADR-028)
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
    expect(rowValues()[0]).toBe('−3 1/2″'); // −3 + diagonal ½ + ″ (ADR-028)
  });

  it('plate options read as signed deductions, ≈ when not eighths-exact (KB-4)', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /top plate/i }));
    // 6" Swivel Base is 1.8″ — not eighths-exact → ≈ −1¾″ (nearest ⅛″).
    const swivel = screen.getAllByRole('option', { name: /6" swivel/i })[0]!;
    expect(swivel.querySelector('.fs-plate-sub')!.textContent).toBe('≈−1 3/4″');
    // None deducts nothing — still a signed amount, no prose.
    const none = screen.getAllByRole('option', { name: /^none/i })[0]!;
    expect(none.querySelector('.fs-plate-sub')!.textContent).toBe('−0″');
  });

  it('plate selection round-trips through onChange into the ledger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: /top plate/i }));
    await user.click(screen.getAllByRole('option', { name: /6" swivel/i })[0]!);
    expect(screen.getByRole('button', { name: /top plate/i }).textContent).toContain(
      '6" Swivel Base',
    );
  });
});

describe('DeductionPicker — collapsible (#349, Add Shore Point)', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('collapsed by default: pickers hidden, but Required strut length + the "tap to add" hint stay visible', () => {
    render(<Harness collapsible />);
    expect(screen.queryByRole('radiogroup', { name: 'Header wood' })).toBeNull();
    // Principle 7 — the safety output is never hidden by the collapse.
    expect(screen.getByText('Required strut length')).toBeInTheDocument();
    // The bordered toggle carries its state + an explicit tap affordance (Alex 2026-07-02).
    expect(screen.getByText('None — tap to add')).toBeInTheDocument();
  });

  it('the toggle reveals the editable pickers', async () => {
    const user = userEvent.setup();
    render(<Harness collapsible />);
    expect(screen.queryByRole('radiogroup', { name: 'Header wood' })).toBeNull();
    await user.click(screen.getByRole('button', { name: /Deductions/ }));
    expect(screen.getByRole('radiogroup', { name: 'Header wood' })).toBeInTheDocument();
  });

  it('the collapsed summary names the applied deductions in build order (Option B)', () => {
    render(<Harness collapsible initial={{ ...NO_DEDUCTIONS, headerWood: '4x4', footerWood: '6x6' }} />);
    expect(screen.getByText('Header 4×4 · Footer 6×6')).toBeInTheDocument();
  });

  it('impossible force-opens the pickers and shows the warning even while collapsed', () => {
    // 8″ opening − 6×6 header (5.5) − 6×6 footer (5.5) = −3″.
    render(
      <Harness collapsible measurementEighths={8 * 8} initial={{ ...NO_DEDUCTIONS, headerWood: '6x6', footerWood: '6x6' }} />,
    );
    // Never tapped the toggle, yet the pickers show (can't fix what you can't see)…
    expect(screen.getByRole('radiogroup', { name: 'Header wood' })).toBeInTheDocument();
    // …and the danger warning is surfaced.
    expect(screen.getByText(/consume the whole opening/i)).toBeInTheDocument();
  });

  it('a blank (0) opening is not danger and stays collapsed, even with auto-filled deductions', () => {
    // Shore type auto-fills wood before a measurement is entered — that is the empty
    // state, NOT "deductions consume the opening". Must not false-flag or force-open.
    const { container } = render(
      <Harness collapsible measurementEighths={0} initial={{ ...NO_DEDUCTIONS, headerWood: '6x6', footerWood: '6x6' }} />,
    );
    expect(container.querySelector('.fs-ledger-effective--danger')).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Header wood' })).toBeNull();
    // The summary still announces what's auto-applied (Option B).
    expect(screen.getByText('Header 6×6 · Footer 6×6')).toBeInTheDocument();
  });
});

describe('DeductionPicker — in-stock-first plates (#409)', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  function StockHarness({ initial = NO_DEDUCTIONS, stockLabel }: { initial?: Deductions; stockLabel?: string }) {
    const [d, setD] = useState<Deductions>(initial);
    return (
      <DeductionPicker
        measurementEighths={56 * 8}
        value={d}
        onChange={setD}
        availablePlateIds={new Set(['multi', 'swivel6'])}
        stockLabel={stockLabel}
      />
    );
  }

  it('an off-stock selected plate warns with the rig name — never blocks', () => {
    render(<StockHarness initial={{ ...NO_DEDUCTIONS, topPlate: 'base45' }} stockLabel="Rescue 1" />);
    expect(screen.getByText(/not on Rescue 1 — confirm before deploying/)).toBeInTheDocument();
  });

  it('no stockLabel → the generic "not in inventory" phrasing; plural for two plates', () => {
    render(<StockHarness initial={{ ...NO_DEDUCTIONS, topPlate: 'base45', bottomPlate: 'vbase' }} />);
    expect(screen.getByText(/Selected plates are not in inventory/)).toBeInTheDocument();
  });

  it('in-stock or None selections do not warn', () => {
    render(<StockHarness initial={{ ...NO_DEDUCTIONS, topPlate: 'multi' }} stockLabel="Rescue 1" />);
    expect(screen.queryByText(/confirm before deploying/)).toBeNull();
  });
});
