// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { ShorePoint, ShorePointStatus } from '@core/schema';

// The rollup reads live shore points via the hook; drive it with a fixture so the
// dot heads, the toggle's expanded state, and the lagging alert are exercised
// (the core aggregation is covered by sitstat-rollup.test.ts).
const mockShorePoints = vi.fn((): ShorePoint[] => []);
vi.mock('@ui/hooks', () => ({ useShorePoints: () => mockShorePoints() }));
vi.mock('@ui/operations/ShorePointCard', () => ({
  SHORE_TYPE_LABELS: { 't-shore': 'T-Shore', 'double-t': 'Double-T', '3-post': '3-Post' },
}));

import { SitStatRollup } from './SitStatRollup';

let n = 0;
function sp(over: Partial<ShorePoint> & { division: string; status: ShorePointStatus }): ShorePoint {
  n += 1;
  return {
    id: over.id ?? `sp-${n}`,
    opId: 'op-1',
    seq: over.seq ?? n,
    shoreType: over.shoreType ?? 't-shore',
    measurementEighths: 800,
    deductions: {},
    ...over,
  } as ShorePoint;
}

describe('SitStatRollup', () => {
  it('empty set → the no-points message, no table', () => {
    mockShorePoints.mockReturnValue([]);
    render(<SitStatRollup />);
    // #435: promoted to the crafted EmptyState (headline is a no-period fragment).
    expect(screen.getByText('No shore points yet')).toBeInTheDocument();
    expect(screen.getByText(/division rollup fills in/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('column heads show the abbreviated label and carry the full status name as their accessible name (#488)', () => {
    mockShorePoints.mockReturnValue([sp({ division: '1', status: 'cutting' })]);
    render(<SitStatRollup />);
    const abbrevToFull: Record<string, string> = {
      Pend: 'Pending Equipment',
      Assign: 'Equipment Assigned',
      Set: 'Strut Set',
      Cut: 'Cutting Station',
      Run: 'Runner',
      Secured: 'Wood Shore Secured',
      "Ret'd": 'Strut Equipment Returned',
    };
    for (const [abbr, full] of Object.entries(abbrevToFull)) {
      // Visible abbreviation renders in the header cell.
      expect(screen.getAllByText(abbr).length).toBeGreaterThan(0);
      // ...but the header's accessible name is the full STATUS_LABELS word — the
      // only place the full word lives now that Q1 dropped the legend (#488).
      expect(screen.getByRole('columnheader', { name: full })).toBeInTheDocument();
    }
  });

  it('an expandable Division toggle exposes aria-expanded and reveals its groups', async () => {
    const user = userEvent.setup();
    mockShorePoints.mockReturnValue([
      sp({ id: 'g1', division: '1', status: 'cutting', groupId: 'grp-1' }),
      sp({ id: 'g2', division: '1', status: 'cutting', groupId: 'grp-1' }),
    ]);
    render(<SitStatRollup />);
    const toggle = screen.getByRole('button', { name: /Div 1/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('flags the lagging Division with an accessible alert', () => {
    mockShorePoints.mockReturnValue([
      sp({ division: '1', status: 'pending' }),
      sp({ division: '1', status: 'pending' }),
      sp({ division: '2', status: 'secured' }),
    ]);
    render(<SitStatRollup />);
    expect(screen.getByLabelText('Most points awaiting equipment')).toBeInTheDocument();
  });

  it('renders a bottom All-divisions totals row', () => {
    mockShorePoints.mockReturnValue([sp({ division: '1', status: 'cutting' })]);
    render(<SitStatRollup />);
    const foot = document.querySelector('tfoot');
    expect(foot).not.toBeNull();
    expect(within(foot as HTMLElement).getByText('All divisions')).toBeInTheDocument();
  });
});
