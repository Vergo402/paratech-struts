// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EquipmentRow } from './EquipmentRow';
import type { StockRow } from '@core/schema';

const strut = (over: Partial<StockRow> = {}): StockRow => ({
  id: 'a',
  type: 'strut',
  model: 'LS 203',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 4,
  held: 0,
  available: 4,
  ...over,
});

describe('EquipmentRow', () => {
  it('shows the deployed badge whenever quantity > available (no op gate)', () => {
    render(<EquipmentRow item={strut({ quantity: 4, held: 2, available: 2 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('2 deployed')).toBeInTheDocument();
  });

  it('escalates the chip to "running low" at ≤ a third available (craft.md §4)', () => {
    render(<EquipmentRow item={strut({ quantity: 4, held: 3, available: 1 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('running low')).toBeInTheDocument();
    expect(screen.queryByText(/[0-9] deployed/)).toBeNull();
  });

  it('escalates to the out chip at zero available', () => {
    render(<EquipmentRow item={strut({ quantity: 4, held: 4, available: 0 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('all 4 deployed')).toBeInTheDocument();
  });

  it('over-allocated (negative available): −N in danger style, empty bar, the "needs resolving" chip (#499)', () => {
    const { container } = render(
      <EquipmentRow item={strut({ quantity: 2, held: 3, available: -1 })} onIncrement={() => {}} onDecrement={() => {}} />,
    );
    const count = screen.getByLabelText('1 over-allocated of 2');
    expect(count).toHaveClass('fs-inv-count--out');
    expect(count).toHaveTextContent('\u22121/2');
    expect(screen.getByText('over-allocated — needs resolving')).toHaveClass('fs-inv-chip-out');
    expect(screen.queryByText(/all 2 deployed/)).toBeNull();
    expect(container.querySelector<HTMLElement>('.fs-inv-bar-fill')!.style.width).toBe('0%');
    expect(screen.getByRole('button', { name: /Decrease .* quantity, none available/ })).toBeDisabled();
  });

  it('hides the badge when nothing is deployed', () => {
    render(<EquipmentRow item={strut({ quantity: 4, held: 0, available: 4 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.queryByText(/deployed/)).toBeNull();
  });

  it('disables − at available 0 and gives both buttons item-specific labels', () => {
    render(<EquipmentRow item={strut({ quantity: 2, held: 2, available: 0 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByLabelText('Decrease LS 203 quantity, none available')).toBeDisabled();
    expect(screen.getByLabelText('Increase LS 203 quantity')).toBeEnabled();
  });

  it('fires onIncrement with the item id', () => {
    const onIncrement = vi.fn();
    render(<EquipmentRow item={strut()} onIncrement={onIncrement} onDecrement={() => {}} />);
    screen.getByLabelText('Increase LS 203 quantity').click();
    expect(onIncrement).toHaveBeenCalledWith('a');
  });

  // A rig stocked before LS 812 left the catalog (2026-07-28) still has that row in
  // Dexie/RTDB. The row must keep rendering its model and count — a catalog removal
  // may not blank out real stock a department is holding. Only the collapsed–extended
  // sub-line (a catalog lookup) drops.
  it('renders an item whose model is no longer in the catalog, minus the range sub-line', () => {
    render(
      <EquipmentRow
        item={strut({ model: 'LS 812', quantity: 2, held: 0, available: 2 })}
        onIncrement={() => {}}
        onDecrement={() => {}}
      />,
    );
    expect(screen.getByText('LS 812')).toBeInTheDocument();
    expect(screen.queryByText(/″–/)).toBeNull();
    expect(screen.getByLabelText('Increase LS 812 quantity')).toBeEnabled();
  });
});
