// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DeleteShorePointModal } from './DeleteShorePointModal';
import type { ShorePoint } from '@core/schema';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@ui/hooks', () => ({
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const SP: ShorePoint = {
  id: 'sp-1',
  opId: 'op-1',
  division: '1',
  area: 'NW corner',
  shoreType: 't-shore',
  measurementEighths: 388,
  deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
  status: 'pending',
};

describe('DeleteShorePointModal', () => {
  beforeEach(() => {
    mockCommit.mockClear();
  });

  it('renders nothing when shorePoint is null', () => {
    render(<DeleteShorePointModal shorePoint={null} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the point identity in the destructive confirm', () => {
    render(<DeleteShorePointModal shorePoint={SP} onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Delete Shore Point?' })).toBeInTheDocument();
    expect(screen.getByText('Div 1 · NW corner')).toBeInTheDocument();
  });

  it('Cancel closes without committing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DeleteShorePointModal shorePoint={SP} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('Delete commits ShorePointDeleted and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DeleteShorePointModal shorePoint={SP} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockCommit).toHaveBeenCalledTimes(1);
    const event = mockCommit.mock.calls[0]![0];
    expect(event).toMatchObject({ type: 'ShorePointDeleted', spId: 'sp-1', opId: 'op-1', by: 'device-test' });
    expect(onClose).toHaveBeenCalled();
  });
});
