// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InventorySummary } from './InventorySummary';
import type { StockRow } from '@core/schema';
import type { Apparatus } from '@core/schema';

const roster: Apparatus[] = [
  { id: 'app-1', name: 'Rescue 1', type: 'Rescue' },
  { id: 'app-2', name: 'Engine 2', type: 'Engine' },
];

const items: StockRow[] = [
  { id: 'i1', type: 'strut', model: 'AT 25-36', system: 'AcmeThread', apparatus: 'Rescue 1', apparatusId: 'app-1', quantity: 4, held: 4, available: 0 },
  { id: 'i2', type: 'strut', model: 'LS 304', system: 'LongShore', apparatus: 'Engine 2', apparatusId: 'app-2', quantity: 2, held: 0, available: 2 },
  { id: 'i3', type: 'plate', plateId: 'rigid6', apparatus: 'Rescue 1', apparatusId: 'app-1', quantity: 2, held: 0, available: 2 },
];

describe('InventorySummary', () => {
  it('renders apparatus names', () => {
    render(<InventorySummary items={items} roster={roster} />);
    expect(screen.getByText('Rescue 1')).toBeDefined();
    expect(screen.getByText('Engine 2')).toBeDefined();
  });

  it('marks a depleted item with is-depleted', () => {
    render(<InventorySummary items={items} roster={roster} />);
    // i1 has available=0 → is-depleted on its row
    const count = screen.getByLabelText('0 of 4 available');
    expect(count.closest('.fs-inv-summary-row')?.classList.contains('is-depleted')).toBe(true);
  });

  it('marks an over-allocated item (negative available) with is-over-allocated and a −N count (#499)', () => {
    const over: StockRow[] = [{ ...items[0]!, id: 'i9', quantity: 2, held: 3, available: -1 }];
    render(<InventorySummary items={over} roster={roster} />);
    const count = screen.getByLabelText('1 over-allocated of 2');
    expect(count).toHaveTextContent('\u22121/2');
    expect(count.closest('.fs-inv-summary-row')?.classList.contains('is-over-allocated')).toBe(true);
  });

  it('shows the system sub-label (Acme thread / LongShore / Plate)', () => {
    render(<InventorySummary items={items} roster={roster} />);
    expect(screen.getByText('Acme thread')).toBeDefined(); // AcmeThread strut
    expect(screen.getByText('LongShore')).toBeDefined(); // LongShore strut
    expect(screen.getByText('Plate')).toBeDefined(); // base plate
  });

  it('shows empty state when no items', () => {
    render(<InventorySummary items={[]} roster={roster} />);
    expect(screen.getByText('No inventory on file')).toBeDefined();
  });
});
