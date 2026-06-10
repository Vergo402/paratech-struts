// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StartOperationModal } from './StartOperationModal';
import type { Operation } from '@core/schema';

const mockCommit = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@ui/hooks', () => ({
  useCommit: () => mockCommit,
  useDeviceUid: () => () => Promise.resolve('device-test'),
}));

const MOCK_OP: Operation = {
  id: 'op-1',
  name: 'Surfside',
  multiBuilding: false,
  location: '123 Main St',
  status: 'active',
  createdAt: 1000,
};

describe('StartOperationModal', () => {
  beforeEach(() => {
    mockCommit.mockClear();
  });

  it('renders "Start Operation" title and button when no operation prop', () => {
    render(<StartOperationModal open onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Start Operation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Operation' })).toBeInTheDocument();
  });

  it('submit button disabled when name is empty', () => {
    render(<StartOperationModal open onClose={() => {}} />);
    const btn = screen.getByRole('button', { name: 'Start Operation' });
    expect(btn).toBeDisabled();
    expect(screen.getByText('Enter an operation name')).toBeInTheDocument();
  });

  it('submit button enabled when name is non-empty', async () => {
    const user = userEvent.setup();
    render(<StartOperationModal open onClose={() => {}} />);
    await user.type(screen.getByLabelText('Operation name'), 'Test Op');
    expect(screen.getByRole('button', { name: 'Start Operation' })).toBeEnabled();
  });

  it('cancel dismisses without committing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StartOperationModal open onClose={onClose} />);
    await user.type(screen.getByLabelText('Operation name'), 'Test Op');
    await user.keyboard('{Escape}');
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it('successful create dispatches OperationCreated and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StartOperationModal open onClose={onClose} />);
    await user.type(screen.getByLabelText('Operation name'), 'Cascade Fire');
    await user.click(screen.getByRole('switch'));
    await user.type(screen.getByLabelText('Location / address'), '123 Main');
    await user.click(screen.getByRole('button', { name: 'Start Operation' }));
    expect(mockCommit).toHaveBeenCalledOnce();
    const event = mockCommit.mock.calls[0]![0];
    expect(event.type).toBe('OperationCreated');
    expect(event.name).toBe('Cascade Fire');
    expect(event.multiBuilding).toBe(true);
    expect(event.location).toBe('123 Main');
    expect(event.by).toBe('device-test');
    expect(onClose).toHaveBeenCalled();
  });

  it('edit mode shows "Edit Operation" and "Save", pre-populated', () => {
    render(<StartOperationModal open onClose={() => {}} operation={MOCK_OP} />);
    expect(screen.getByRole('dialog', { name: 'Edit Operation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByLabelText('Operation name')).toHaveValue('Surfside');
    expect(screen.getByLabelText('Location / address')).toHaveValue('123 Main St');
  });

  it('edit with no changes closes without commit', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StartOperationModal open onClose={onClose} operation={MOCK_OP} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('edit dispatches OperationEdited with only changed fields', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<StartOperationModal open onClose={onClose} operation={MOCK_OP} />);
    const nameInput = screen.getByLabelText('Operation name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Surfside 2');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(mockCommit).toHaveBeenCalledOnce();
    const event = mockCommit.mock.calls[0]![0];
    expect(event.type).toBe('OperationEdited');
    expect(event.name).toBe('Surfside 2');
    expect(event.opId).toBe('op-1');
    expect(event).not.toHaveProperty('multiBuilding');
  });

  it('clearing location in edit sends location: null', async () => {
    const user = userEvent.setup();
    render(<StartOperationModal open onClose={() => {}} operation={MOCK_OP} />);
    const locInput = screen.getByLabelText('Location / address');
    await user.clear(locInput);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    const event = mockCommit.mock.calls[0]![0];
    expect(event.type).toBe('OperationEdited');
    expect(event.location).toBeNull();
  });
});
