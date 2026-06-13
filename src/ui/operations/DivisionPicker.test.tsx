// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DivisionPicker } from './DivisionPicker';
import type { Operation } from '@core/schema';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
const mockOperation = vi.fn((): Operation | null => null);

vi.mock('@ui/hooks', () => ({
  useOperation: () => mockOperation(),
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const OP: Operation = {
  id: 'op-1',
  name: 'Surfside',
  multiBuilding: false,
  inlineDeploy: false,
  divisions: [1],
  status: 'active',
  createdAt: 1000,
};

describe('DivisionPicker', () => {
  beforeEach(() => {
    mockCommit.mockClear();
    mockOperation.mockReturnValue(OP);
  });

  it('the trigger shows the formatted selected division', () => {
    render(<DivisionPicker value={1} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Division/ })).toHaveTextContent('Div 1 (Ground level)');
  });

  it('lists divisions top-floor-first with v3 labels; row select commits nothing', async () => {
    const user = userEvent.setup();
    mockOperation.mockReturnValue({ ...OP, divisions: [1, 3, -1, 2] });
    const onChange = vi.fn();
    render(<DivisionPicker value={1} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Division/ }));
    const listbox = screen.getByRole('listbox');
    const labels = within(listbox)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(labels).toEqual([
      'Div 3 (+2 floors up)',
      'Div 2 (+1 floor up)',
      'Div 1 (Ground level)✓',
      'Sub Div 1 (Basement)',
    ]);

    await user.click(within(listbox).getByRole('option', { name: 'Div 2 (+1 floor up)' }));
    expect(onChange).toHaveBeenCalledWith(2);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it('"Add floor above" commits DivisionAdded with the next floor and selects it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DivisionPicker value={1} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Division/ }));
    await user.click(screen.getByRole('button', { name: '+ Add floor above' }));

    expect(mockCommit).toHaveBeenCalledTimes(1);
    expect(mockCommit.mock.calls[0]![0]).toMatchObject({
      type: 'DivisionAdded',
      opId: 'op-1',
      by: 'device-test',
      division: 2,
    });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('"Add floor below" commits the next Sub Division', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DivisionPicker value={1} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Division/ }));
    await user.click(screen.getByRole('button', { name: '+ Add floor below' }));

    expect(mockCommit.mock.calls[0]![0]).toMatchObject({ type: 'DivisionAdded', division: -1 });
    expect(onChange).toHaveBeenCalledWith(-1);
  });
});
