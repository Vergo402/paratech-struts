// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StepBackConfirmModal } from './StepBackConfirmModal';
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
  status: 'process',
  deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' },
};

describe('StepBackConfirmModal (#221 step 3-R — the one reversal that confirms)', () => {
  beforeEach(() => {
    mockCommit.mockReset();
    mockCommit.mockResolvedValue({ ok: true });
  });

  it('renders nothing when shorePoint is null', () => {
    render(<StepBackConfirmModal shorePoint={null} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names the strut and its apparatus in the destructive confirm', () => {
    render(<StepBackConfirmModal shorePoint={SP} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Return LS 203 to inventory?' })).toBeInTheDocument();
    expect(screen.getByText('Rescue 2')).toBeInTheDocument();
    // Cancel is the safe default (the modal autofocuses [data-modal-cancel]).
    expect(document.querySelector('[data-modal-cancel]')).toBeTruthy();
  });

  it('Cancel closes without committing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StepBackConfirmModal shorePoint={SP} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it('Return & Step Back commits StrutReturned, then reports back and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onReturned = vi.fn();
    render(<StepBackConfirmModal shorePoint={SP} onClose={onClose} onReturned={onReturned} />);

    await user.click(screen.getByRole('button', { name: 'Return & Step Back' }));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'StrutReturned', spId: 'sp-1', opId: 'op-1', by: 'device-test' }),
    );
    expect(onReturned).toHaveBeenCalledWith(SP);
    expect(onClose).toHaveBeenCalled();
  });

  it('a failed return surfaces the reason and stays open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCommit.mockResolvedValue({ ok: false, reason: 'shore point is not In Process' });
    render(<StepBackConfirmModal shorePoint={SP} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Return & Step Back' }));
    expect(screen.getByRole('alert')).toHaveTextContent('shore point is not In Process');
    expect(onClose).not.toHaveBeenCalled();
  });
});
