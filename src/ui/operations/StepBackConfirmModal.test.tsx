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
  deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: 'inv-1' }],
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

  it('Return & Step Back commits EquipmentReturned, then reports back and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onReturned = vi.fn();
    render(<StepBackConfirmModal shorePoint={SP} onClose={onClose} onReturned={onReturned} />);

    await user.click(screen.getByRole('button', { name: 'Return & Step Back' }));
    expect(mockCommit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'EquipmentReturned', spId: 'sp-1', opId: 'op-1', by: 'device-test' }),
    );
    expect(onReturned).toHaveBeenCalledWith(SP, 1);
    expect(onClose).toHaveBeenCalled();
  });

  it('a grouped shore un-deploys EVERY member together (married cradle-to-grave)', async () => {
    const user = userEvent.setup();
    const onReturned = vi.fn();
    // Three struts of one physical 3-Post, all Equipment Assigned (same groupId).
    const members: ShorePoint[] = [1, 2, 3].map((i) => ({
      ...SP,
      id: `sp-${i}`,
      groupId: 'g1',
      groupIndex: i,
      groupTotal: 3,
      deployedBom: [{ role: 'strut', model: 'LS 203', source: 'Rescue 2', inventoryId: `inv-${i}` }],
    }));
    render(
      <StepBackConfirmModal shorePoint={members[0]!} groupMembers={members} onClose={vi.fn()} onReturned={onReturned} />,
    );

    // Copy pluralizes; the action returns ALL three.
    expect(screen.getByRole('dialog', { name: 'Return 3 struts to inventory?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Return All & Step Back' }));

    expect(mockCommit).toHaveBeenCalledTimes(3);
    for (const id of ['sp-1', 'sp-2', 'sp-3']) {
      expect(mockCommit).toHaveBeenCalledWith(expect.objectContaining({ type: 'EquipmentReturned', spId: id }));
    }
    expect(onReturned).toHaveBeenCalledWith(members[0], 3);
  });

  it('a failed return surfaces the reason and stays open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCommit.mockResolvedValue({ ok: false, reason: 'shore point is not Equipment Assigned' });
    render(<StepBackConfirmModal shorePoint={SP} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Return & Step Back' }));
    expect(screen.getByRole('alert')).toHaveTextContent('shore point is not Equipment Assigned');
    expect(onClose).not.toHaveBeenCalled();
  });
});
