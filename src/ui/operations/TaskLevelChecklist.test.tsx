// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TaskLevelChecklist } from './TaskLevelChecklist';

const useChecklists = vi.fn();
const useCommandSelf = vi.fn();

vi.mock('@ui/hooks', () => ({
  useChecklists: (...a: unknown[]) => useChecklists(...a),
  useChecklistTemplate: () => ({}),
  useCommandSelf: () => useCommandSelf(),
  useDeviceUidValue: () => 'dev-1',
}));
vi.mock('@ui/primitives', () => ({ NestedChecklist: () => <div data-testid="tree" /> }));

describe('TaskLevelChecklist instance key (#550)', () => {
  beforeEach(() => {
    useChecklists.mockReset().mockReturnValue({ attestations: {}, check: vi.fn(), uncheck: vi.fn() });
  });

  it('keys by the account id for a signed-in member', () => {
    useCommandSelf.mockReturnValue({ self: { accountId: 'acct-1', deviceUid: 'dev-1' }, selfKey: 'acct-1' });
    const { queryByTestId } = render(<TaskLevelChecklist />);
    expect(useChecklists).toHaveBeenCalledWith('task-level', 'acct-1');
    expect(queryByTestId('tree')).not.toBeNull();
  });

  it('keys by the device uid for a guest', () => {
    useCommandSelf.mockReturnValue({ self: { accountId: null, deviceUid: 'dev-1' }, selfKey: 'dev-1' });
    render(<TaskLevelChecklist />);
    expect(useChecklists).toHaveBeenCalledWith('task-level', 'dev-1');
  });

  it('renders nothing until a key resolves', () => {
    useCommandSelf.mockReturnValue({ self: { accountId: null, deviceUid: null }, selfKey: null });
    const { queryByTestId } = render(<TaskLevelChecklist />);
    expect(useChecklists).toHaveBeenCalledWith('task-level', '');
    expect(queryByTestId('tree')).toBeNull();
  });
});
