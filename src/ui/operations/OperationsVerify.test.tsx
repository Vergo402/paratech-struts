// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { STATUS_ORDER } from '@core/shorepoint';
import { DivisionRail, VerifyBanner } from './OperationsVerify';

// Minimal ShorePoint — the verify surface reads id/seq/shoreType/division/area/
// assignedResource/measurementEighths/status. Cast past the full schema (these
// components are pure presentational and touch none of the rest).
function sp(over: Partial<ShorePoint> & { id: string }): ShorePoint {
  return {
    opId: 'op-1',
    division: '2',
    shoreType: 't-shore',
    measurementEighths: 480,
    status: 'strutset',
    ...over,
  } as ShorePoint;
}

const emptyByStatus = (): Record<ShorePointStatus, ShorePoint[]> =>
  STATUS_ORDER.reduce((m, s) => ({ ...m, [s]: [] }), {} as Record<ShorePointStatus, ShorePoint[]>);

describe('VerifyBanner', () => {
  it('renders nothing when no point is flagged', () => {
    const { container } = render(<VerifyBanner flagged={[]} onReview={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the single flagged point and Review opens it', async () => {
    const user = userEvent.setup();
    const point = sp({ id: 'sp-3', seq: 3, division: '2', area: 'Side C' });
    const onReview = vi.fn();
    render(<VerifyBanner flagged={[point]} onReview={onReview} />);
    expect(screen.getByText('Safety check needed')).toBeInTheDocument();
    // Title (#3 · T-Shore) + location (Div 2 · Side C) read out of the one flagged point.
    expect(screen.getByText(/#3 · T-Shore · Div 2 · Side C/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Review' }));
    expect(onReview).toHaveBeenCalledWith(point);
  });

  it('counts when more than one point is flagged', () => {
    render(<VerifyBanner flagged={[sp({ id: 'a' }), sp({ id: 'b' }), sp({ id: 'c' })]} onReview={() => {}} />);
    expect(screen.getByText(/3 shore points flagged/)).toBeInTheDocument();
  });
});

describe('DivisionRail', () => {
  it('shows the rollup (secured of total) and the flagged safety card', async () => {
    const user = userEvent.setup();
    const byStatus = emptyByStatus();
    byStatus.secured = [sp({ id: 's1', status: 'secured' }), sp({ id: 's2', status: 'secured' })];
    byStatus.strutset = [sp({ id: 'f1', status: 'strutset', seq: 3, division: '2', area: 'Side C' })];
    const flagged = [byStatus.strutset[0]!];
    const onOpen = vi.fn();
    render(<DivisionRail flagged={flagged} byStatus={byStatus} total={3} onOpen={onOpen} />);

    // Rollup: 2 of 3 secured (the big number specifically — counts repeat elsewhere).
    expect(document.querySelector('.fs-vr-big b')).toHaveTextContent('2');
    expect(screen.getByText(/of 3 shore points secured/)).toBeInTheDocument();
    // Safety card names the flagged point + Open routes to it.
    expect(screen.getByText('Safety check')).toBeInTheDocument();
    expect(screen.getByText(/#3 · T-Shore/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(onOpen).toHaveBeenCalledWith(flagged[0]);
  });

  it('omits the safety card when nothing is flagged', () => {
    const byStatus = emptyByStatus();
    byStatus.secured = [sp({ id: 's1', status: 'secured' })];
    render(<DivisionRail flagged={[]} byStatus={byStatus} total={1} onOpen={() => {}} />);
    expect(screen.queryByText('Safety check')).not.toBeInTheDocument();
    expect(screen.getByText(/of 1 shore points secured/)).toBeInTheDocument();
  });
});
