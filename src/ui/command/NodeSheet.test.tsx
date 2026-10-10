// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { seedOrgState } from '@core/org';
import type { FieldShoreEvent } from '@core/schema';
import { NodeSheet } from './NodeSheet';

// jsdom has no matchMedia → the bottom-Sheet branch, deterministic (as CommandRail.test).
const positions = seedOrgState('op1', 'dev-1').positions;
const icId = Object.values(positions).find((p) => p.parentId === null)!.id;

const EVENTS = [
  { type: 'CommandTransferInitiated', id: 'h1', opId: 'op1', at: 1, by: 'dev-1', toResource: { ref: 'individual', value: 'Lt. K. Chen', label: 'Lt. K. Chen' } },
  { type: 'CommandTransferCancelled', id: 'h2', opId: 'op1', at: 2, by: 'dev-1' },
  { type: 'CommandTransferAccepted', id: 'h3', opId: 'op1', at: 3, by: 'dev-2' },
] as unknown as FieldShoreEvent[];
let outcomes = new Map<string, 'applied' | 'no-effect'>();

vi.mock('./useOrgCommit', () => ({ useOrgCommit: () => vi.fn() }));
vi.mock('@ui/hooks', () => ({
  useOrg: () => positions,
  useOperation: () => ({ id: 'op1', name: 'Test Op' }),
  useRoleHistory: () => ({ events: EVENTS, outcomes, deviceUid: 'dev-1' }),
  useApparatus: () => ({ roster: [] }),
  useShorePoints: () => [],
  useRoster: () => [],
}));

describe('NodeSheet — role history (#499)', () => {
  it('a change that lost a race reads muted as "<description> — no effect"', () => {
    outcomes = new Map([['h2', 'no-effect']]);
    render(<NodeSheet positionId={icId} isIC={false} onClose={() => {}} />);
    const lost = screen.getByText('Command transfer cancelled — no effect');
    expect(lost).toHaveClass('fs-node-hist-line--no-effect');
    expect(screen.getByText(/Command transfer accepted/)).not.toHaveClass('fs-node-hist-line--no-effect');
    expect(screen.queryByText(/initiated.*no effect/)).toBeNull();
  });
});
