// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShorePointCard } from './ShorePointCard';
import type { ShorePoint } from '@core/schema';

function makeSP(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: 'sp-1',
    opId: 'op-1',
    division: '1',
    shoreType: 't-shore',
    measurementEighths: 388, // 48 1/2″
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status: 'pending',
    ...over,
  };
}

describe('ShorePointCard', () => {
  it('renders identity, measurement, type, and status badge', () => {
    render(<ShorePointCard shorePoint={makeSP({ area: 'NW corner', label: 'B-2' })} />);
    expect(screen.getByText('B-2')).toBeInTheDocument();
    expect(screen.getByText('Div 1 · NW corner')).toBeInTheDocument();
    expect(screen.getByText('T-Shore')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows the group badge only when grouped', () => {
    const { rerender } = render(
      <ShorePointCard shorePoint={makeSP({ groupId: 'g', groupIndex: 2, groupTotal: 3 })} />,
    );
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    rerender(<ShorePointCard shorePoint={makeSP()} />);
    expect(screen.queryByText(/\d \/ \d/)).not.toBeInTheDocument();
  });

  it('pending: shows "No equipment assigned" + Assign Equipment; no reason line when unset', () => {
    render(<ShorePointCard shorePoint={makeSP()} />);
    expect(screen.getByText(/No equipment assigned/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign Equipment' })).toBeInTheDocument();
    expect(screen.queryByText(/No matching strut/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Waiting for inventory/)).not.toBeInTheDocument();
  });

  it('pending: surfaces both pendingReason copies when set', () => {
    const { rerender } = render(<ShorePointCard shorePoint={makeSP({ pendingReason: 'no-match' })} />);
    expect(screen.getByText(/No matching strut/)).toBeInTheDocument();
    rerender(<ShorePointCard shorePoint={makeSP({ pendingReason: 'no-inventory' })} />);
    expect(screen.getByText(/Waiting for inventory/)).toBeInTheDocument();
  });

  it('pending: tap-to-expand reveals Edit and Delete, and the callbacks fire', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const sp = makeSP();
    render(<ShorePointCard shorePoint={sp} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    const head = screen.getByRole('button', { expanded: false });
    await user.click(head);
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onEdit).toHaveBeenCalledWith(sp);
    expect(onDelete).toHaveBeenCalledWith(sp);
  });

  it('the stripe is a labeled button on pending and fires onAssignEquipment', async () => {
    const user = userEvent.setup();
    const onAssign = vi.fn();
    const sp = makeSP();
    render(<ShorePointCard shorePoint={sp} onAssignEquipment={onAssign} />);
    await user.click(screen.getByRole('button', { name: 'Assign equipment' }));
    expect(onAssign).toHaveBeenCalledWith(sp);
  });

  it('non-pending: shows the deployed strut identity and no pending actions', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
        })}
      />,
    );
    expect(screen.getByText('LS 203')).toBeInTheDocument();
    expect(screen.getByText('from Rescue 2')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); // no assign/edit/delete/expand
    expect(screen.queryByText(/No equipment assigned/)).not.toBeInTheDocument();
  });
});
