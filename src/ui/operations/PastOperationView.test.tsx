// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { OperationState } from '@core/operation';
import type { Operation, ShorePoint } from '@core/schema';
import { PastOperationView } from './PastOperationView';

const mockArchived = vi.fn<() => { data: OperationState | undefined }>();
const mockCommit = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@ui/hooks', () => ({
  useArchivedOperation: () => mockArchived(),
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const op: Operation = {
  id: 'op1', name: 'Cascade Fire', multiBuilding: false, inlineDeploy: false,
  divisions: [1], status: 'ended', createdAt: 1,
};
const sp = (id: string, over: Partial<ShorePoint> = {}): ShorePoint => ({
  id, opId: 'op1', division: '1', shoreType: 't-shore', measurementEighths: 320,
  deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
  status: 'secured', ...over,
});

beforeEach(() => {
  mockCommit.mockClear();
  mockArchived.mockReturnValue({
    data: {
      operation: op,
      shorePoints: [
        sp('a', { label: 'B-2', status: 'secured', deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'i1' } }),
        sp('b', { status: 'returned' }),
      ],
    },
  });
});

describe('PastOperationView (#238)', () => {
  it('renders the incident name, the read-only banner, and frozen cards (no slides)', () => {
    render(<PastOperationView opId="op1" onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Cascade Fire' })).toBeInTheDocument();
    expect(screen.getByText(/Viewing a closed incident/)).toBeInTheDocument();
    expect(screen.getByText('B-2 · T-Shore')).toBeInTheDocument();
    // Frozen: the secured card's Remove & Return button is gone.
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('re-opens behind a confirm and closes the view (ADR-036)', async () => {
    const onClose = vi.fn();
    render(<PastOperationView opId="op1" onClose={onClose} />);

    await userEvent.click(screen.getByRole('button', { name: 'Re-open this incident' }));
    // Confirm modal appears; commit the re-open.
    await userEvent.click(screen.getByRole('button', { name: 'Re-open' }));

    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'OperationReopened', opId: 'op1', by: 'device-test' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('Cancel in the confirm does not commit', async () => {
    render(<PastOperationView opId="op1" onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Re-open this incident' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCommit).not.toHaveBeenCalled();
  });
});
