// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ReturnEquipmentModal } from './ReturnEquipmentModal';
import type { ShorePoint } from '@core/schema';

const mockCommit = vi.fn();

vi.mock('@ui/hooks', () => ({
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const SP: ShorePoint = {
  id: 'sp-1',
  opId: 'op-1',
  division: '1',
  shoreType: 't-shore',
  measurementEighths: 388,
  deductions: { headerWood: 'none', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' },
  status: 'secured',
  deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
};

describe('ReturnEquipmentModal (#224 — terminal Remove & Return)', () => {
  beforeEach(() => {
    mockCommit.mockReset();
    mockCommit.mockResolvedValue({ ok: true });
  });

  it('renders nothing when shorePoint is null', () => {
    render(<ReturnEquipmentModal shorePoint={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the strut + apparatus and warns the move is permanent', () => {
    render(<ReturnEquipmentModal shorePoint={SP} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Return equipment to inventory?' })).toBeInTheDocument();
    expect(screen.getByText('Rescue 2')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    // Cancel is the safe default (the modal autofocuses [data-modal-cancel]).
    expect(document.querySelector('[data-modal-cancel]')).toBeTruthy();
  });

  it('Cancel closes without committing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReturnEquipmentModal shorePoint={SP} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it('Confirm Return commits EquipmentReclaimed, reports back, and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onReturned = vi.fn();
    render(<ReturnEquipmentModal shorePoint={SP} onClose={onClose} onReturned={onReturned} />);

    await user.click(screen.getByRole('button', { name: 'Confirm Return' }));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EquipmentReclaimed', spId: 'sp-1', opId: 'op-1', by: 'device-test' }),
    );
    expect(onReturned).toHaveBeenCalledWith(SP);
    expect(onClose).toHaveBeenCalled();
  });

  it('a failed return surfaces the reason and stays open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCommit.mockResolvedValue({ ok: false, reason: 'shore point is not Shore Secured' });
    render(<ReturnEquipmentModal shorePoint={SP} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Confirm Return' }));
    expect(screen.getByRole('alert')).toHaveTextContent('shore point is not Shore Secured');
    expect(onClose).not.toHaveBeenCalled();
  });
});
