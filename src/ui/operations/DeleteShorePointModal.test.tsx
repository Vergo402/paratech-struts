// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DeleteShorePointModal } from './DeleteShorePointModal';
import type { ShorePoint } from '@core/schema';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockCommitMany = vi.fn().mockResolvedValue({ ok: true });
const mockShorePoints = vi.fn((): ShorePoint[] => []);
vi.mock('@ui/hooks', () => ({
  useCommit: () => mockCommit,
  useCommitMany: () => mockCommitMany,
  useShorePoints: () => mockShorePoints(),
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
    mockCommitMany.mockClear();
    mockShorePoints.mockReturnValue([]);
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

  it('deleting one strut of a grouped shore removes the whole shore in one batch (audit W5)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const m = (id: string, i: number): ShorePoint => ({
      ...SP,
      id,
      shoreType: '3-post',
      groupId: 'g1',
      groupIndex: i,
      groupTotal: 3,
    });
    const members = [m('sp-1', 1), m('sp-2', 2), m('sp-3', 3)];
    mockShorePoints.mockReturnValue(members);
    render(<DeleteShorePointModal shorePoint={members[1]!} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toHaveTextContent(/removes all\s*3\s*struts/);
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(mockCommit).not.toHaveBeenCalled();
    expect(mockCommitMany).toHaveBeenCalledTimes(1);
    const events = mockCommitMany.mock.calls[0]![0] as { type: string; spId: string }[];
    expect(events).toHaveLength(3);
    expect(events.every((e) => e.type === 'ShorePointDeleted')).toBe(true);
    expect([...events].map((e) => e.spId).sort()).toEqual(['sp-1', 'sp-2', 'sp-3']);
    expect(onClose).toHaveBeenCalled();
  });

  it('a rejected grouped delete (#421 deployed member) shows the error and keeps the modal open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockCommitMany.mockResolvedValueOnce({
      ok: false,
      reason: 'cannot delete a shore point holding deployed equipment — return it first',
    });
    const m = (id: string, i: number): ShorePoint => ({
      ...SP, id, shoreType: '3-post', groupId: 'g1', groupIndex: i, groupTotal: 3,
    });
    const members = [m('sp-1', 1), m('sp-2', 2), m('sp-3', 3)];
    mockShorePoints.mockReturnValue(members);
    render(<DeleteShorePointModal shorePoint={members[0]!} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/deployed equipment/);
    expect(onClose).not.toHaveBeenCalled(); // modal stays open

    // Cancel clears the error for the next open
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
