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
    render(<EquipmentRow item={strut({ quantity: 4, available: 1 })} onIncrement={() => {}} onDecrement={() => {}} />);
    expect(screen.getByText('3 deployed')).toBeInTheDocument();
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
});
