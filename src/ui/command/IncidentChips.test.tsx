// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Hazards } from '@core/hazard';
import type { Operation } from '@core/schema';
import { seedOrgState, defaultPositionId } from '@core/org';
import type { OrgPositions } from '@core/org';

const mockOperation = vi.fn((): Operation | null => null);
const mockOrg = vi.fn((): OrgPositions => seedOrgState('op-1', 'dev-1').positions);
const mockHazards = vi.fn((): Hazards => ({}));
const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@ui/hooks', () => ({
  useOperation: () => mockOperation(),
  useOrg: () => mockOrg(),
  useHazards: () => mockHazards(),
}));

import { SafetyOfficerChip, HazardChip, IncidentChipStrip } from './IncidentChips';

const OP: Operation = {
  id: 'op-1',
  name: 'Test Op',
  multiBuilding: false,
  inlineDeploy: false,
  divisions: [1],
  saws: ['A'],
  status: 'active',
  createdAt: 1000,
  currentPeriod: 1,
  periods: [{ number: 1, startedAt: 1000 }],
};

beforeEach(() => {
  mockOperation.mockReturnValue(OP);
  mockOrg.mockReturnValue(seedOrgState('op-1', 'dev-1').positions);
  mockHazards.mockReturnValue({});
  mockNavigate.mockReset();
});

describe('SafetyOfficerChip (#487)', () => {
  it('renders "Unassigned" (locked rule C-6: always renders, assigned or not)', () => {
    render(<SafetyOfficerChip />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('renders the assigned Safety Officer label when the org has one', () => {
    const positions = seedOrgState('op-1', 'dev-1').positions;
    const safetyId = defaultPositionId('op-1', 'safety');
    positions[safetyId] = {
      ...positions[safetyId]!,
      assignedResources: [{ ref: 'individual', value: 'FF Alvarez', label: 'FF Alvarez' }],
    };
    mockOrg.mockReturnValue(positions);
    render(<SafetyOfficerChip />);
    expect(screen.getByText('FF Alvarez')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('navigates to /command by default when tapped', async () => {
    const user = userEvent.setup();
    render(<SafetyOfficerChip />);
    await user.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/command' });
  });

  it('fires a supplied onPress instead of navigating', async () => {
    const onPress = vi.fn();
    const user = userEvent.setup();
    render(<SafetyOfficerChip onPress={onPress} />);
    await user.click(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('N2 — has a meaningful accessible name (unassigned)', () => {
    render(<SafetyOfficerChip />);
    expect(screen.getByRole('button', { name: 'Safety Officer: unassigned — opens Command' })).toBeInTheDocument();
  });

  it('N2 — has a meaningful accessible name (assigned)', () => {
    const positions = seedOrgState('op-1', 'dev-1').positions;
    const safetyId = defaultPositionId('op-1', 'safety');
    positions[safetyId] = {
      ...positions[safetyId]!,
      assignedResources: [{ ref: 'individual', value: 'FF Alvarez', label: 'FF Alvarez' }],
    };
    mockOrg.mockReturnValue(positions);
    render(<SafetyOfficerChip />);
    expect(screen.getByRole('button', { name: 'Safety Officer: FF Alvarez — opens Command' })).toBeInTheDocument();
  });
});

const HIGH: Hazards = {
  h1: { id: 'h1', type: 'structural', location: 'Div 2', severity: 'high', reportedBy: 'u1', reportedAt: 2000 },
};
const LOW_AND_MITIGATED: Hazards = {
  h1: { id: 'h1', type: 'fall', location: 'Roof', severity: 'low', reportedBy: 'u1', reportedAt: 1000 },
  h2: {
    id: 'h2',
    type: 'structural',
    location: 'Div 2',
    severity: 'high',
    reportedBy: 'u1',
    reportedAt: 500,
    mitigatedBy: 'u2',
    mitigatedAt: 3000,
  },
};

describe('HazardChip (#490)', () => {
  it('renders nothing at zero open hazards', () => {
    mockHazards.mockReturnValue({});
    const { container } = render(<HazardChip />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every hazard is mitigated', () => {
    mockHazards.mockReturnValue({
      h1: { id: 'h1', type: 'fall', location: 'Roof', severity: 'low', reportedBy: 'u1', reportedAt: 1000, mitigatedBy: 'u2', mitigatedAt: 2000 },
    });
    const { container } = render(<HazardChip />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "1 open · HIGH" with one open high hazard (R2 — count of open hazards, not a count of that severity)', () => {
    mockHazards.mockReturnValue(HIGH);
    render(<HazardChip />);
    expect(screen.getByText('1 open · HIGH')).toBeInTheDocument();
  });

  it('picks the highest OPEN severity, ignoring a mitigated higher one', () => {
    mockHazards.mockReturnValue(LOW_AND_MITIGATED);
    render(<HazardChip />);
    expect(screen.getByText('1 open · LOW')).toBeInTheDocument();
  });

  it('appends the top hazard location only when showLocation is set', () => {
    mockHazards.mockReturnValue(HIGH);
    const { rerender } = render(<HazardChip />);
    expect(screen.queryByText('Div 2')).not.toBeInTheDocument();
    rerender(<HazardChip showLocation />);
    expect(screen.getByText('Div 2')).toBeInTheDocument();
  });

  it('is purely informational — rendering never throws or requires acknowledgment (Principle 10)', () => {
    mockHazards.mockReturnValue(HIGH);
    expect(() => render(<HazardChip />)).not.toThrow();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('navigates to /command by default when tapped', async () => {
    mockHazards.mockReturnValue(HIGH);
    const user = userEvent.setup();
    render(<HazardChip />);
    await user.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/command' });
  });

  it('N2 — has a meaningful accessible name stating both the open count and the worst severity', () => {
    mockHazards.mockReturnValue(HIGH);
    render(<HazardChip />);
    expect(screen.getByRole('button', { name: '1 open hazards, highest HIGH — opens Command' })).toBeInTheDocument();
  });
});

describe('IncidentChipStrip', () => {
  it('always renders the Safety chip; hides the Hazard chip at zero open hazards', () => {
    mockHazards.mockReturnValue({});
    render(<IncidentChipStrip />);
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.queryByText(/HIGH|MED|LOW/)).not.toBeInTheDocument();
  });

  it('shows both chips when a hazard is open', () => {
    mockHazards.mockReturnValue(HIGH);
    render(<IncidentChipStrip />);
    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('1 open · HIGH')).toBeInTheDocument();
  });
});
