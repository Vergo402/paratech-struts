// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EquipmentRow } from './EquipmentRow';
import type { InventoryItem } from '@core/schema';

const strut = (over: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 'a',
  type: 'strut',
  model: 'LS 203',
  system: 'LongShore',
  apparatus: 'Rescue 2',
  apparatusId: 'app-r2',
  quantity: 4,
  available: 4,
  ...over,
});

describe('EquipmentRow', () => {
  it('shows the deployed badge whenever quantity > available (no op gate)', () => {
    render(<EquipmentRow item={strut({ quantity: 4, available: 2 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('2 deployed')).toBeInTheDocument();
  });

  it('escalates the chip to "running low" at ≤ a third available (craft.md §4)', () => {
    render(<EquipmentRow item={strut({ quantity: 4, available: 1 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('running low')).toBeInTheDocument();
    expect(screen.queryByText(/[0-9] deployed/)).toBeNull();
  });

  it('escalates to the out chip at zero available', () => {
    render(<EquipmentRow item={strut({ quantity: 4, available: 0 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('all 4 deployed')).toBeInTheDocument();
  });

  it('hides the badge when nothing is deployed', () => {
    render(<EquipmentRow item={strut({ quantity: 4, available: 4 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.queryByText(/deployed/)).toBeNull();
  });

  it('disables − at available 0 and gives both buttons item-specific labels', () => {
    render(<EquipmentRow item={strut({ quantity: 2, available: 0 })} onIncrement={() => {}} onDecrement={() => {}} />);
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
        item={strut({ model: 'LS 812', quantity: 2, available: 2 })}
        onIncrement={() => {}}
        onDecrement={() => {}}
      />,
    );
    expect(screen.getByText('LS 812')).toBeInTheDocument();
    expect(screen.queryByText(/″–/)).toBeNull();
    expect(screen.getByLabelText('Increase LS 812 quantity')).toBeEnabled();
  });
});
