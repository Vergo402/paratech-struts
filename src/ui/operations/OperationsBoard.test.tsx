// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { OperationsBoard } from './OperationsBoard';
import type { Operation, ShorePoint, ShorePointStatus } from '@core/schema';

const mockOperation = vi.fn((): Operation | null => null);
const mockShorePoints = vi.fn((): ShorePoint[] => []);
const mockCommit = vi.fn().mockResolvedValue({ ok: true });

vi.mock('@ui/hooks', () => ({
  useOperation: () => mockOperation(),
  useShorePoints: () => mockShorePoints(),
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const ACTIVE_OP: Operation = {
  id: 'op-1',
  name: 'Surfside',
  multiBuilding: false,
  status: 'active',
  createdAt: 1000,
};

function makeSP(id: string, status: ShorePointStatus, division = '1'): ShorePoint {
  return {
    id,
    opId: 'op-1',
    division,
    shoreType: 't-shore',
    measurementEighths: 480,
    deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
    status,
  };
}

describe('OperationsBoard', () => {
  beforeEach(() => {
    mockOperation.mockReturnValue(null);
    mockShorePoints.mockReturnValue([]);
    mockCommit.mockClear();
  });

  it('shows empty state when no operation', () => {
    render(<OperationsBoard />);
    expect(screen.getByText('No active operation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Operation' })).toBeInTheDocument();
  });

  it('clicking Start Operation opens the modal', async () => {
    const user = userEvent.setup();
    render(<OperationsBoard />);
    await user.click(screen.getByRole('button', { name: 'Start Operation' }));
    expect(screen.getByRole('dialog', { name: 'Start Operation' })).toBeInTheDocument();
  });

  it('active operation shows header with name', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    expect(screen.getByText('Surfside')).toBeInTheDocument();
  });

  it('renders all 7 status lanes with correct labels', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    const expected = ['Pending', 'In Process', 'Strut Set', 'Cutting', 'Runner', 'Shore Secured', 'Strut Equipment Returned'];
    for (const label of expected) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument();
    }
  });

  it('lane counts reflect shore point distribution', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([
      makeSP('sp-1', 'pending'),
      makeSP('sp-2', 'pending'),
      makeSP('sp-3', 'cutting'),
    ]);
    render(<OperationsBoard />);
    const pendingSection = screen.getByRole('region', { name: 'Pending' });
    expect(within(pendingSection).getByText('2')).toBeInTheDocument();
    const cuttingSection = screen.getByRole('region', { name: 'Cutting' });
    expect(within(cuttingSection).getByText('1')).toBeInTheDocument();
  });

  it('lane collapse toggles card visibility', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    mockShorePoints.mockReturnValue([makeSP('sp-1', 'pending', '2')]);
    render(<OperationsBoard />);
    const pendingSection = screen.getByRole('region', { name: 'Pending' });
    expect(within(pendingSection).getByText('Div 2')).toBeInTheDocument();
    const header = within(pendingSection).getByRole('button', { name: /Pending/ });
    await user.click(header);
    expect(within(pendingSection).queryByText('Div 2')).not.toBeInTheDocument();
    await user.click(header);
    expect(within(pendingSection).getByText('Div 2')).toBeInTheDocument();
  });

  it('Add Shore Point button is present', () => {
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    expect(screen.getByRole('button', { name: '+ Add Shore Point' })).toBeInTheDocument();
  });

  it('edit button opens modal in edit mode', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue(ACTIVE_OP);
    render(<OperationsBoard />);
    await user.click(screen.getByRole('button', { name: 'Edit operation' }));
    expect(screen.getByRole('dialog', { name: 'Edit Operation' })).toBeInTheDocument();
  });
});
