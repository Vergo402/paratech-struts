// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonnelImportFlow } from './PersonnelImportFlow';
import { ADMIN_PERMISSIONS, DEFAULT_PERMISSIONS, type Apparatus, type Role } from '@core/schema';

const roles: Role[] = [
  { id: 'admin', name: 'Admin', builtIn: true, permissions: ADMIN_PERMISSIONS },
  { id: 'default', name: 'Default', builtIn: true, permissions: DEFAULT_PERMISSIONS },
];
const roster: Apparatus[] = [{ id: 'rig-e2', name: 'Engine 2', type: 'Engine' }];

const onProvision = vi.fn();
const onClose = vi.fn();

function csvFile(text: string): File {
  return new File([text], 'roster.csv', { type: 'text/csv' });
}

async function pickFile(text: string) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const user = userEvent.setup({ applyAccept: false });
  await user.upload(input, csvFile(text));
  await screen.findByText('roster.csv');
}

function renderFlow() {
  return render(
    <PersonnelImportFlow
      open
      onClose={onClose}
      roles={roles}
      roster={roster}
      actorIsAdmin
      onProvision={onProvision}
    />,
  );
}

beforeEach(() => {
  onProvision.mockReset().mockResolvedValue({ ok: true, uid: 'u1' });
  onClose.mockReset();
});

const GOOD_CSV = [
  'Name,Email,Rank,Apparatus,Badge,Phone,Certs,Role',
  'Dana Kim,dkim@fd.example,Lieutenant,Engine 2,312,,FF2,Default',
  'Marcus Reyes,reyes@fd.example,,,,,,',
].join('\n');

const MIXED_CSV = [
  'Name,Email,Rank,Apparatus,Badge,Phone,Certs,Role',
  'Dana Kim,dkim@fd.example,,,,,,',
  'Bad Email,not-an-email,,,,,,',
  'Bad Rig,rig@fd.example,,Ladder 9,,,,',
].join('\n');

describe('PersonnelImportFlow (#439 CSV bulk add)', () => {
  it('walks the 4 steps and creates each row sequentially with its derived starter', async () => {
    const user = userEvent.setup();
    renderFlow();
    expect(screen.getByText('Download a blank template')).toBeInTheDocument();
    await pickFile(GOOD_CSV);
    await user.click(screen.getByRole('button', { name: 'Continue' })); // → 2 (map)
    expect(screen.getByText('Map your columns')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' })); // → 3 (check)
    expect(screen.getByText('2 will be added')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' })); // → 4 (review)
    expect(screen.getByText('2 ready')).toBeInTheDocument();
    // the review list previews the derived starters
    expect(screen.getByText(/Dana Kim · dkim@fd.example · Engine 2 · kim123!/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add 2 members' }));
    await screen.findByText('Import complete');
    expect(onProvision).toHaveBeenCalledTimes(2);
    expect(onProvision).toHaveBeenNthCalledWith(1, expect.objectContaining({
      displayName: 'Dana Kim', email: 'dkim@fd.example', starterPassword: 'kim123!',
      role: 'default', apparatusId: 'rig-e2', rank: 'Lieutenant', badge: '312', certifications: 'FF2',
    }));
    expect(onProvision).toHaveBeenNthCalledWith(2, expect.objectContaining({
      displayName: 'Marcus Reyes', starterPassword: 'reyes123!', role: 'default',
    }));
    // the distribution sheet: name + starter per created account
    expect(screen.getByText('2 accounts created.')).toBeInTheDocument();
    expect(screen.getByText('kim123!')).toBeInTheDocument();
    expect(screen.getByText('reyes123!')).toBeInTheDocument();
    expect(screen.getByText(/Read each starter password to its owner in person/)).toBeInTheDocument();
  });

  it('flags bad rows in step 3, and skipped rows are excluded from the commit', async () => {
    const user = userEvent.setup();
    renderFlow();
    await pickFile(MIXED_CSV);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('1 will be added')).toBeInTheDocument();
    expect(screen.getByText('2 to fix')).toBeInTheDocument();
    expect(screen.getByText(/doesn't look like an email address/)).toBeInTheDocument();
    expect(screen.getByText(/unknown apparatus "Ladder 9"/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' })); // → 4
    // skip both flagged rows
    const skips = screen.getAllByRole('button', { name: /Skip this row instead/ });
    for (const b of skips) await user.click(b);
    await user.click(screen.getByRole('button', { name: 'Add 1 member' }));
    await screen.findByText('Import complete');
    expect(onProvision).toHaveBeenCalledTimes(1);
    expect(onProvision).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Dana Kim' }));
  });

  it('a per-row failure lands in the honest failed list — earlier rows stay created', async () => {
    const user = userEvent.setup();
    onProvision
      .mockResolvedValueOnce({ ok: true, uid: 'u1' })
      .mockResolvedValueOnce({ ok: false, reason: 'An account with that email already exists — they can join with the invite code instead.' });
    renderFlow();
    await pickFile(GOOD_CSV);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Add 2 members' }));
    await screen.findByText('Import complete');
    expect(screen.getByText('1 account created · 1 failed.')).toBeInTheDocument();
    expect(screen.getByText('kim123!')).toBeInTheDocument(); // Dana's hand-over row survives
    expect(screen.getByText(/Marcus Reyes — An account with that email already exists/)).toBeInTheDocument();
    // both the header cancel and the body action read Done on the results screen
    expect(screen.getAllByRole('button', { name: 'Done' }).length).toBeGreaterThan(0);
  });
});
