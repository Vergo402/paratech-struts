// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockJoinByCode = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@ui/hooks', () => ({
  useDepartment: () => ({ department: null, role: null, joinByCode: mockJoinByCode }),
}));
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useNavigate: () => mockNavigate,
}));
vi.mock('./switchBucket', () => ({ reloadIntoActiveBucket: vi.fn() }));
vi.mock('./QrScannerSheet', () => ({ QrScannerSheet: () => null }));

import { JoinDepartmentScreen } from './JoinDepartmentScreen';
import { reloadIntoActiveBucket } from './switchBucket';

const mockReload = vi.mocked(reloadIntoActiveBucket);

const OK = { ok: true, department: { id: 'd1', name: 'Hamden Fire Rescue', role: 'default' } };

beforeEach(() => {
  mockNavigate.mockReset();
  mockReload.mockReset();
  mockJoinByCode.mockReset().mockResolvedValue(OK);
});

describe('JoinDepartmentScreen (workflow #232 — join by invite code)', () => {
  it('joins with the code and shows the confirmation Sheet (role badge)', async () => {
    const user = userEvent.setup();
    render(<JoinDepartmentScreen />);
    await user.type(screen.getByLabelText('Enter it by hand'), 'HAMD-4F2K');
    await user.click(screen.getByRole('button', { name: 'Join department' }));
    expect(mockJoinByCode).toHaveBeenCalledWith('HAMD-4F2K');
    expect(await screen.findByText('Joined Hamden Fire Rescue')).toBeInTheDocument();
  });

  it('Continue switches onto the joined department (reloads its bucket)', async () => {
    const user = userEvent.setup();
    render(<JoinDepartmentScreen />);
    await user.type(screen.getByLabelText('Enter it by hand'), 'HAMD-4F2K');
    await user.click(screen.getByRole('button', { name: 'Join department' }));
    await user.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(mockReload).toHaveBeenCalled();
  });

  it('shows a bad-code reason inline and opens no Sheet', async () => {
    mockJoinByCode.mockResolvedValue({ ok: false, reason: "That code didn't match a department." });
    const user = userEvent.setup();
    render(<JoinDepartmentScreen />);
    await user.type(screen.getByLabelText('Enter it by hand'), 'NOPE-0000');
    await user.click(screen.getByRole('button', { name: 'Join department' }));
    expect(await screen.findByText("That code didn't match a department.")).toBeInTheDocument();
    expect(screen.queryByText(/^Joined /)).not.toBeInTheDocument();
  });
});
