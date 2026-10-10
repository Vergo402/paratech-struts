// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ShorePoint } from '@core/schema';
import { NO_DEDUCTIONS } from '@core/schema';
import { EndOperationButton } from './EndOperationButton';

const mockCommit = vi.fn();
let shorePoints: ShorePoint[] = [];

vi.mock('@ui/hooks', () => ({
  useOperation: () => ({ id: 'op1', name: 'Test Op' }),
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('dev-1'),
  usePermissions: () => ({ manageOperations: true }),
  useShorePoints: () => shorePoints,
}));

const held = (id: string, source: string, status: ShorePoint['status'] = 'process'): ShorePoint => ({
  id, opId: 'op1', division: '1', shoreType: 't-shore', measurementEighths: 320, deductions: NO_DEDUCTIONS, status,
  deployedBom: [{ role: 'strut', model: 'LS 203', source, inventoryId: `i-${id}` }],
});

beforeEach(() => {
  mockCommit.mockReset();
  mockCommit.mockResolvedValue({ ok: true });
  shorePoints = [];
});

async function openConfirm() {
  const user = userEvent.setup();
  render(<EndOperationButton />);
  await user.click(screen.getByRole('button', { name: 'End Operation' }));
  return { user, dialog: screen.getByRole('dialog', { name: 'End Operation?' }) };
}

describe('EndOperationButton confirm (#499)', () => {
  it('shows the held-equipment warning and an unchecked "back on the rigs" checkbox only when shores still hold gear', async () => {
    shorePoints = [held('a', 'Rescue 1'), held('b', 'Engine 2'), held('c', 'Ladder 5', 'returned')];
    const { dialog } = await openConfirm();
    expect(dialog).toHaveTextContent('This archives every shore point and ends the active operation.');
    expect(dialog).toHaveTextContent(/2 shore points still hold equipment — Engine 2 \(1\), Rescue 1 \(1\)/);
    expect(within(dialog).getByRole('checkbox', { name: 'All equipment is back on the rigs' })).not.toBeChecked();
  });

  it('unchecked: OperationEnded omits stockReleased', async () => {
    shorePoints = [held('a', 'Rescue 1')];
    const { user, dialog } = await openConfirm();
    await user.click(within(dialog).getByRole('button', { name: 'End Operation' }));
    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockCommit.mock.calls[0]![0]).toMatchObject({ type: 'OperationEnded', opId: 'op1' });
    expect(mockCommit.mock.calls[0]![0]).not.toHaveProperty('stockReleased');
  });

  it('checked: OperationEnded carries stockReleased: true', async () => {
    shorePoints = [held('a', 'Rescue 1')];
    const { user, dialog } = await openConfirm();
    await user.click(within(dialog).getByRole('checkbox', { name: 'All equipment is back on the rigs' }));
    await user.click(within(dialog).getByRole('button', { name: 'End Operation' }));
    expect(mockCommit.mock.calls[0]![0]).toMatchObject({ type: 'OperationEnded', stockReleased: true });
  });

  it('nothing held: no warning, no checkbox, no stockReleased', async () => {
    shorePoints = [held('a', 'Rescue 1', 'returned')];
    const { user, dialog } = await openConfirm();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    expect(dialog).not.toHaveTextContent(/still hold equipment/);
    await user.click(within(dialog).getByRole('button', { name: 'End Operation' }));
    expect(mockCommit.mock.calls[0]![0]).not.toHaveProperty('stockReleased');
  });
});
