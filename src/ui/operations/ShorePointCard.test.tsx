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

// The value shelf's number ROW (label + measurement) — read separately from the
// strut sub-line below it. textContent concatenates label + value with no
// separator, e.g. "Strut system48 1/2″".
function valueShelfText(): string {
  return document.querySelector('.fs-spc-value-row')?.textContent ?? '';
}

// The strut + extensions sub-line folded into the bar (card compaction) — empty
// when absent (pending, or the Cutting Station where the bar is cut length only).
function valueEqText(): string {
  return document.querySelector('.fs-spc-value-eq')?.textContent ?? '';
}

describe('ShorePointCard', () => {
  it('renders the "label · type" headline, location, and status badge', () => {
    render(<ShorePointCard shorePoint={makeSP({ area: 'NW corner', label: 'B-2' })} />);
    // Design-system title: label · shore type, one headline (type left the meta row).
    const title = screen.getByText('B-2 · T-Shore');
    expect(title).toHaveClass('fs-spc-title');
    expect(screen.getByText('Div 1 · NW corner')).toBeInTheDocument();
    expect(screen.getByText('Pending Equipment')).toBeInTheDocument();
  });

  it('headline falls back to the bare type when the point has no label', () => {
    render(<ShorePointCard shorePoint={makeSP()} />);
    expect(screen.getByText('T-Shore')).toHaveClass('fs-spc-title');
  });

  it('shows the group badge only when grouped', () => {
    const { rerender } = render(
      <ShorePointCard shorePoint={makeSP({ shoreType: '3-post', groupId: 'g', groupIndex: 2, groupTotal: 3 })} />,
    );
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    rerender(<ShorePointCard shorePoint={makeSP()} />);
    expect(screen.queryByText(/\d \/ \d/)).not.toBeInTheDocument();
  });

  it('pending: shows the Assign Equipment action; no reason line when unset', () => {
    render(<ShorePointCard shorePoint={makeSP()} />);
    expect(screen.getByRole('button', { name: 'Assign Equipment' })).toBeInTheDocument();
    expect(screen.queryByText(/No matching strut/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Waiting for inventory/)).not.toBeInTheDocument();
    // Card compaction: the "No equipment assigned" line is gone (an empty bar +
    // the Assign action already say it); pending bar carries no strut sub-line.
    expect(valueEqText()).toBe('');
  });

  it('appends the assigned resource to the location line', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          area: 'West',
          assignedResource: 'Rescue 2',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Engine 1', inventoryId: 'inv-1' }],
        })}
      />,
    );
    // Building · Div · Area · assigned-apparatus — the source rig (Engine 1) is NOT
    // here (it moved to Details); the assigned resource rides the end of the line.
    expect(screen.getByText('Div 1 · West · Rescue 2')).toHaveClass('fs-spc-where');
    expect(screen.queryByText('Engine 1')).not.toBeInTheDocument();
  });

  it('pending: surfaces both pendingReason copies when set', () => {
    // The copy now rides the waiting callout (S12 §1.1) — both the title and the
    // verbatim PENDING_REASON_COPY description share a substring, so assert the
    // full unique string to disambiguate (the title split is covered below).
    const { rerender } = render(<ShorePointCard shorePoint={makeSP({ pendingReason: 'no-match' })} />);
    expect(
      screen.getByText('No matching strut — nothing fits this opening at this load'),
    ).toBeInTheDocument();
    rerender(<ShorePointCard shorePoint={makeSP({ pendingReason: 'no-inventory' })} />);
    // A no-inventory wait now NAMES the strut(s) that fit (issue: "doesn't tell you
    // what equipment you're waiting for") instead of the generic stock copy.
    expect(screen.getByText(/Needs .+ — none on scene/)).toBeInTheDocument();
  });

  it('waiting PRESENTATION: pending+reason shows the amber Waiting badge + is-waiting hooks', () => {
    const { rerender } = render(<ShorePointCard shorePoint={makeSP({ pendingReason: 'no-inventory' })} />);
    // The badge presents "Waiting" (amber); the operational status stays pending.
    expect(screen.getByText('Waiting')).toHaveClass('fs-badge--status', 'is-waiting');
    expect(screen.queryByText('Pending Equipment')).not.toBeInTheDocument();
    // The card carries BOTH hooks — is-pending (lifecycle) + is-waiting (presentation).
    const card = document.querySelector('.fs-spc')!;
    expect(card.className).toContain('is-pending');
    expect(card.className).toContain('is-waiting');
    // A reasonless pending card presents normally.
    rerender(<ShorePointCard shorePoint={makeSP()} />);
    expect(screen.getByText('Pending Equipment')).toBeInTheDocument();
    expect(document.querySelector('.fs-spc')!.className).not.toContain('is-waiting');
  });

  it('active draws the accent focus border class; caption renders under the controls', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({ status: 'process', deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }] })}
        active
        caption="Slide commits; reverse is always available — no timed undo."
      />,
    );
    expect(document.querySelector('.fs-spc')!.className).toContain('is-active');
    const caption = screen.getByText('Slide commits; reverse is always available — no timed undo.');
    expect(caption).toHaveClass('fs-spc-caption');
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

  it('non-pending: shows the deployed strut in the bar and no pending actions', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
      />,
    );
    // Card compaction: the strut identity rides the value bar sub-line; the source
    // rig moved entirely to Details (not on the card face).
    expect(valueEqText()).toBe('LS 203');
    expect(screen.queryByText('Rescue 2')).not.toBeInTheDocument();
    // No pending-only actions — the slide stack owns the card now (#221).
    expect(screen.queryByRole('button', { name: 'Assign Equipment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign equipment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  // ---- S12 card restyle: value shelf, waiting callout, hazard, removed ----

  it('value shelf: "Strut system" + effective on pending and process', () => {
    const { rerender } = render(<ShorePointCard shorePoint={makeSP()} />);
    // No deductions: effective == raw == 48½″ (388 eighths). The shelf carries the
    // required strut length (raw opening / deductions / load live in Details now).
    expect(screen.getByText('Strut system')).toBeInTheDocument();
    expect(valueShelfText()).toBe('Strut system48 1/2″');
    rerender(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
      />,
    );
    expect(screen.getByText('Strut system')).toBeInTheDocument();
    expect(valueShelfText()).toBe('Strut system48 1/2″');
  });

  it('promotes the pre-cutting Required strut length number at a glance (#351)', () => {
    // pending / process / strutset all read the value big (is-promoted), matching
    // the cutting card's Cut-length treatment; post-cut statuses stay shelf weight.
    for (const status of ['pending', 'process', 'strutset', 'cutting'] as const) {
      const { unmount } = render(<ShorePointCard shorePoint={makeSP({ status })} />);
      expect(document.querySelector('.fs-spc-value')).toHaveClass('is-promoted');
      unmount();
    }
    for (const status of ['runner', 'secured', 'returned'] as const) {
      const { unmount } = render(<ShorePointCard shorePoint={makeSP({ status })} />);
      expect(document.querySelector('.fs-spc-value')).not.toHaveClass('is-promoted');
      unmount();
    }
  });

  it('value bar: shows the effective (deducted) length + the deployed strut sub-line', () => {
    // 4×4 header + 4×4 footer = 7″ = 56 eighths deducted. Raw 48½″ (388),
    // effective 41½″ (332). The bar carries the effective length + the strut.
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'strutset',
          estimatedLoad: 2000,
          deductions: { headerWood: '4x4', footerWood: '4x4', topPlate: 'none', bottomPlate: 'none' },
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
      />,
    );
    expect(valueShelfText()).toBe('Strut system41 1/2″');
    expect(valueEqText()).toBe('LS 203');
  });

  it('value shelf: "Cut length" reads the WOOD cut length while cutting; no strut sub-line', () => {
    // 388 eighths = 48 1/2″. The cut length (#361) deducts the SHORE-TYPE lumber
    // (T-Shore → 4×4 + 4×4 = 7″) AND a flat 1.5″ wedge, NO plates:
    // floor((48.5 − 7 − 1.5) × 8)/8 = 40″ = 320 eighths. Differs from the 41½″
    // strut effective length by the wedge.
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'cutting',
          deductions: { headerWood: '4x4', footerWood: '4x4', topPlate: 'none', bottomPlate: 'none' },
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
      />,
    );
    expect(screen.getByText('Cut length')).toBeInTheDocument();
    expect(valueShelfText()).toBe('Cut length40″');
    // The Cutting Station needs the cut length alone — no strut sub-line here.
    expect(valueEqText()).toBe('');
  });

  it('value shelf: "Set length" reads the WOOD cut length once secured (#361 supersedes SF-1)', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'secured',
          deductions: { headerWood: '4x4', footerWood: '4x4', topPlate: 'none', bottomPlate: 'none' },
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
      />,
    );
    expect(screen.getByText('Set length')).toBeInTheDocument();
    // The wood was SET at its cut length — shore-type lumber + 1.5″ wedge, no
    // plates (#361): 40″, not the 41½″ strut effective length. SF-1's "show the
    // deducted length, not the raw opening" still holds; #361 only refines WHICH
    // deducted number it is (the wood cut, not the strut effective).
    expect(valueShelfText()).toBe('Set length40″');
    // Secured still carries the strut in the bar (not cutting).
    expect(valueEqText()).toBe('LS 203');
  });

  it('waiting callout: title + reason copy for both pending reasons', () => {
    const { rerender } = render(<ShorePointCard shorePoint={makeSP({ pendingReason: 'no-inventory' })} />);
    expect(screen.getByText('Waiting for inventory')).toBeInTheDocument();
    // no-inventory names the needed strut(s); no-match keeps its verbatim copy.
    expect(screen.getByText(/Needs .+ — none on scene/)).toBeInTheDocument();
    rerender(<ShorePointCard shorePoint={makeSP({ pendingReason: 'no-match' })} />);
    expect(screen.getByText('No matching strut')).toBeInTheDocument();
    expect(
      screen.getByText('No matching strut — nothing fits this opening at this load'),
    ).toBeInTheDocument();
    // The Assign action survives the callout (the "No equipment assigned" line was
    // dropped in the card compaction).
    expect(screen.getByRole('button', { name: 'Assign Equipment' })).toBeInTheDocument();
  });

  it('hazard: renders the severity hazard pill after the status badge', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
        hazard="high"
      />,
    );
    expect(screen.getByText('⚠ HIGH hazard in area')).toBeInTheDocument();
  });

  it('removed: shows the slash chip, drops the slides and the Assign action', () => {
    const { container } = render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
        onAdvance={vi.fn()}
        onStepBack={vi.fn()}
        removed
      />,
    );
    expect(screen.getByText('Removed from cut list')).toBeInTheDocument();
    expect(container.querySelector('.fs-spc-slash')).not.toBeNull();
    // The slide stack is suppressed while removed.
    expect(screen.queryByText('Slide to set Strut Set')).not.toBeInTheDocument();
    expect(screen.queryByText('Slide back to Pending Equipment')).not.toBeInTheDocument();
    // A removed pending point shows neither the Assign action nor the stripe button.
    expect(screen.queryByRole('button', { name: 'Assign Equipment' })).not.toBeInTheDocument();
  });

  it('removed (pending): the Assign Equipment action is suppressed', () => {
    render(<ShorePointCard shorePoint={makeSP()} onAssignEquipment={vi.fn()} removed />);
    expect(screen.getByText('Removed from cut list')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign Equipment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign equipment' })).not.toBeInTheDocument();
  });

  it('process: advance + step-back slides commit through the gesture — no button twins (ADR-026)', async () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    const sp = makeSP({
      status: 'process',
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
    });
    render(<ShorePointCard shorePoint={sp} onAdvance={onAdvance} onStepBack={onStepBack} />);

    expect(screen.getByText('Slide to set Strut Set')).toBeInTheDocument();
    expect(screen.getByText('Slide back to Pending Equipment')).toBeInTheDocument();
    // The slide gesture is the ONLY status commit path — no Advance/Step-back buttons.
    expect(screen.queryByRole('button', { name: /Advance|Step back/ })).toBeNull();
    await slideToCommit('Slide to set Strut Set');
    expect(onAdvance).toHaveBeenCalledWith(sp);
    await slideToCommit('Slide back to Pending Equipment');
    expect(onStepBack).toHaveBeenCalledWith(sp);
  });

  it('readOnly (#238 archive): suppresses every interactive affordance, keeps the content', () => {
    // A deployed process card with slides + the apparatus + the value shelf.
    const { rerender } = render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          label: 'B-2',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
        readOnly
      />,
    );
    // No slides, no stripe button.
    expect(screen.queryByText('Slide to set Strut Set')).not.toBeInTheDocument();
    expect(screen.queryByText('Slide back to Pending Equipment')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign equipment' })).toBeNull();
    // Presentational content stays.
    expect(screen.getByText('B-2 · T-Shore')).toBeInTheDocument();
    expect(screen.getByText('LS 203')).toBeInTheDocument();

    // Pending readOnly: no Assign button / Edit / Delete.
    rerender(<ShorePointCard shorePoint={makeSP({ status: 'pending' })} readOnly />);
    expect(screen.queryByRole('button', { name: 'Assign Equipment' })).toBeNull();

    // Secured readOnly: no Remove & Return button, no step-back slide.
    rerender(
      <ShorePointCard
        shorePoint={makeSP({ status: 'secured', deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }] })}
        readOnly
      />,
    );
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
    expect(screen.queryByText('Slide back to Runner')).not.toBeInTheDocument();
  });

  it('process: the group gate disables advance with its visible reason; step-back stays live', async () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'process',
          shoreType: '3-post', // a group of 3 = one physical 3-Post shore (KB-7)
          groupId: 'g',
          groupIndex: 1,
          groupTotal: 3,
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
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
    await slideToCommit('Slide back to Pending Equipment');
    expect(onStepBack).toHaveBeenCalled();
  });

  it('strutset: advance → Cutting + step-back slides both commit through the gesture (#222)', async () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    const sp = makeSP({
      status: 'strutset',
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
    });
    render(<ShorePointCard shorePoint={sp} onAdvance={onAdvance} onStepBack={onStepBack} />);
    expect(screen.getByText('Slide to send to Cutting Station')).toBeInTheDocument();
    expect(screen.getByText('Slide back to Equipment Assigned')).toBeInTheDocument();
    await slideToCommit('Slide to send to Cutting Station');
    expect(onAdvance).toHaveBeenCalledWith(sp);
    await slideToCommit('Slide back to Equipment Assigned');
    expect(onStepBack).toHaveBeenCalledWith(sp);
  });

  it('cutting on the BOARD (no cuttingStation): read-only — the cutter works the station', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'cutting',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
        onAdvance={vi.fn()}
        onStepBack={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Slide/)).not.toBeInTheDocument();
  });

  it('Cutting Station — not cut done: Mark Cut Done + step-back-to-Strut-Set slides commit', async () => {
    const onMarkCutDone = vi.fn();
    const onStepBack = vi.fn();
    const sp = makeSP({
      status: 'cutting',
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
    });
    render(
      <ShorePointCard shorePoint={sp} cuttingStation onMarkCutDone={onMarkCutDone} onStepBack={onStepBack} />,
    );
    expect(screen.queryByText('✓ Cut done')).not.toBeInTheDocument();
    await slideToCommit('Slide to mark Cut Done');
    expect(onMarkCutDone).toHaveBeenCalledWith(sp);
    await slideToCommit('Slide back to Strut Set');
    expect(onStepBack).toHaveBeenCalledWith(sp);
  });

  it('Cutting Station — cut done: shows the marker, Send to Runner + clear-cut-done slides commit', async () => {
    const onAdvance = vi.fn();
    const onClearCutDone = vi.fn();
    const sp = makeSP({
      status: 'cutting',
      cuttingDone: true,
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
    });
    render(
      <ShorePointCard shorePoint={sp} cuttingStation onAdvance={onAdvance} onClearCutDone={onClearCutDone} />,
    );
    expect(screen.getByText('✓ Cut done')).toBeInTheDocument();
    await slideToCommit('Slide to send to Runner');
    expect(onAdvance).toHaveBeenCalledWith(sp);
    await slideToCommit('Slide back — clear Cut Done');
    expect(onClearCutDone).toHaveBeenCalledWith(sp);
  });

  it('Runner on the BOARD (#223): advance → Wood Shore Secured + step-back → Cutting Station both commit', async () => {
    const onAdvance = vi.fn();
    const onStepBack = vi.fn();
    const sp = makeSP({
      status: 'runner',
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
    });
    render(<ShorePointCard shorePoint={sp} onAdvance={onAdvance} onStepBack={onStepBack} />);
    expect(screen.getByText('Slide to set Wood Shore Secured')).toBeInTheDocument();
    expect(screen.getByText('Slide back to Cutting Station')).toBeInTheDocument();
    await slideToCommit('Slide to set Wood Shore Secured');
    expect(onAdvance).toHaveBeenCalledWith(sp);
    await slideToCommit('Slide back to Cutting Station');
    expect(onStepBack).toHaveBeenCalledWith(sp);
  });

  it('Wood Shore Secured on the BOARD (#224): Remove & Return is a BUTTON (not a slide) + step-back → Runner', async () => {
    const onRemoveReturn = vi.fn();
    const onStepBack = vi.fn();
    const sp = makeSP({
      status: 'secured',
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
    });
    render(<ShorePointCard shorePoint={sp} onRemoveReturn={onRemoveReturn} onStepBack={onStepBack} />);
    // Inventory-consequential + terminal → a button that raises the confirm modal,
    // NOT an advance slide.
    expect(screen.queryByText(/Slide to/)).not.toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Remove & Return Equipment/ });
    await userEvent.click(btn);
    expect(onRemoveReturn).toHaveBeenCalledWith(sp);
    expect(screen.getByText('Slide back to Runner')).toBeInTheDocument();
    await slideToCommit('Slide back to Runner');
    expect(onStepBack).toHaveBeenCalledWith(sp);
  });

  it('Returned (#224): terminal — the marker, no slides, no buttons', () => {
    render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'returned',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
        onAdvance={vi.fn()}
        onStepBack={vi.fn()}
        onRemoveReturn={vi.fn()}
      />,
    );
    expect(screen.getByText('✓ Equipment returned')).toBeInTheDocument();
    expect(screen.queryByText(/Slide/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('runner/secured in the Cutting Station sent tail (cuttingStation): read-only', () => {
    const { rerender } = render(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'runner',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
        cuttingStation
        onAdvance={vi.fn()}
        onStepBack={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Slide/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(
      <ShorePointCard
        shorePoint={makeSP({
          status: 'secured',
          deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
        })}
        cuttingStation
        onRemoveReturn={vi.fn()}
        onStepBack={vi.fn()}
      />,
    );
    expect(screen.queryByText(/Slide/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ShorePointCard — created-order number tab (#318)', () => {
  const tab = () => document.querySelector('.fs-spc-tab');

  it('renders #seq and is hidden when seq is absent', () => {
    const { rerender } = render(<ShorePointCard shorePoint={makeSP()} />);
    expect(tab()).toBeNull(); // makeSP has no seq
    rerender(<ShorePointCard shorePoint={makeSP({ seq: 7 })} />);
    expect(tab()!.textContent).toBe('#7');
    expect(tab()).toHaveAttribute('aria-label', 'Shore point number 7');
  });

  it('is a ghost (is-empty) while no strut is assigned', () => {
    render(<ShorePointCard shorePoint={makeSP({ seq: 1 })} />);
    expect(tab()).toHaveClass('fs-spc-tab', 'is-empty');
  });

  it('fills with the deployed strut system: gold / grey / lockstroke', () => {
    const deploy = (model: string) => [{ role: 'strut' as const, model, source: 'Rescue 2', inventoryId: 'inv-1' }];
    const { rerender } = render(
      <ShorePointCard shorePoint={makeSP({ seq: 2, status: 'process', deployedBom: deploy('LS 203') })} />,
    );
    expect(tab()).toHaveClass('is-gold'); // LongShore
    rerender(<ShorePointCard shorePoint={makeSP({ seq: 2, status: 'process', deployedBom: deploy('AT 19-25') })} />);
    expect(tab()).toHaveClass('is-grey'); // AcmeThread
    rerender(<ShorePointCard shorePoint={makeSP({ seq: 2, status: 'process', deployedBom: deploy('LK 19-25') })} />);
    expect(tab()).toHaveClass('is-lockstroke'); // LockStroke (grey-colored, cyan identity)
  });

  it('a 3-digit number renders (Surfside scale)', () => {
    render(<ShorePointCard shorePoint={makeSP({ seq: 147 })} />);
    expect(tab()!.textContent).toBe('#147');
  });
});

// The persistent unrated / over-capacity flag on a DEPLOYED card (2026-07-02 audit
// #7, v3 parity) — its own line below the header, never on the status-badge row.
describe('ShorePointCard — persistent capacity flag', () => {
  const ls406 = (over: Partial<ShorePoint> = {}) =>
    makeSP({
      status: 'process',
      measurementEighths: 468, // 58 1/2″
      deployedBom: [{ role: 'strut', model: 'LS 406', system: 'LongShore', source: 'Eng 1', inventoryId: 'inv-1' }],
      ...over,
    });

  it('shows "⚠ Over capacity" on a deployed shore whose strut share exceeds its rating', () => {
    render(<ShorePointCard shorePoint={ls406({ estimatedLoad: 34000 })} />);
    const flag = document.querySelector('.fs-spc-flag');
    expect(flag).toBeInTheDocument();
    expect(flag!.textContent).toContain('Over capacity');
    expect(flag).toHaveClass('fs-spc-flag--over-capacity');
    // Its OWN line — not inside the meta row that carries the status badge.
    expect(flag!.closest('.fs-spc-meta')).toBeNull();
  });

  it('shows "⚠ Unrated" on a LongShore shore beyond the published chart', () => {
    render(
      <ShorePointCard
        shorePoint={ls406({
          measurementEighths: 195 * 8,
          deployedBom: [{ role: 'strut', model: 'LS 1016', system: 'LongShore', source: 'Eng 1', inventoryId: 'inv-1' }],
        })}
      />,
    );
    const flag = document.querySelector('.fs-spc-flag');
    expect(flag!.textContent).toContain('Unrated');
    expect(flag).toHaveClass('fs-spc-flag--unrated');
  });

  it('shows NO flag on a clean deployed shore or a load-less one', () => {
    const { rerender } = render(<ShorePointCard shorePoint={ls406({ estimatedLoad: 5000 })} />);
    expect(document.querySelector('.fs-spc-flag')).toBeNull();
    rerender(<ShorePointCard shorePoint={ls406()} />); // no load recorded
    expect(document.querySelector('.fs-spc-flag')).toBeNull();
    rerender(<ShorePointCard shorePoint={makeSP()} />); // pending, no strut
    expect(document.querySelector('.fs-spc-flag')).toBeNull();
  });
});
