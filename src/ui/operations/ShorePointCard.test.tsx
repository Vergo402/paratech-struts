// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getSlide, slideToCommit } from '@ui/primitives/Slider.testkit';
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
    // No pending-only actions — the slide stack owns the card now (#221).
    expect(screen.queryByRole('button', { name: 'Assign Equipment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign equipment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByText(/No equipment assigned/)).not.toBeInTheDocument();
  });

  it('process: advance + step-back slides commit through the gesture — no button twins (ADR-026)', async () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    const sp = makeSP({
      status: 'process',
      deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
    });
    render(<ShorePointCard shorePoint={sp} onAdvance={onAdvance} onStepBack={onStepBack} />);

    expect(screen.getByText('Slide to set Strut Set')).toBeInTheDocument();
    expect(screen.getByText('Slide back to Pending')).toBeInTheDocument();
    // The slide gesture is the ONLY status commit path — no Advance/Step-back buttons.
    expect(screen.queryByRole('button', { name: /Advance|Step back/ })).toBeNull();
    await slideToCommit('Slide to set Strut Set');
    expect(onAdvance).toHaveBeenCalledWith(sp);
    await slideToCommit('Slide back to Pending');
    expect(onStepBack).toHaveBeenCalledWith(sp);
  });

  it('process: the group gate disables advance with its visible reason; step-back stays live', async () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          groupId: 'g',
          groupIndex: 1,
          groupTotal: 3,
          deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
        })}
        onAdvance={onAdvance}
        onStepBack={onStepBack}
        advanceDisabledReason="Waiting on group — 2 of 3 still Pending"
      />,
    );
    const advance = getSlide('Slide to set Strut Set');
    expect(advance).toHaveClass('fs-slide--disabled');
    // The gate reason survives the button removal — visible under the track.
    expect(screen.getByText('Waiting on group — 2 of 3 still Pending')).toBeInTheDocument();
    await slideToCommit(advance);
    expect(onAdvance).not.toHaveBeenCalled();
    await slideToCommit('Slide back to Pending');
    expect(onStepBack).toHaveBeenCalled();
  });

  it('strutset: step-back slide only — advance to Cutting is workflow #222', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'strutset',
          deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
        })}
        onStepBack={vi.fn()}
      />,
    );
    expect(screen.getByText('Slide back to In Process')).toBeInTheDocument();
    expect(screen.queryByText(/Slide to set/)).not.toBeInTheDocument();
  });

  it('later states (secured/returned): no slides at all this slice', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'secured',
          deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
        })}
      />,
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
