// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditLogScreen } from './AuditLogScreen';
import { download } from '@ui/util/download';
import { STATUS_LABELS } from '@core/shorepoint';
import { NO_DEDUCTIONS, type FieldShoreEvent, type Member, type ShorePoint } from '@core/schema';
import type { AuditEntry } from '@core/audit';
import type { AuditAccess } from '@ui/hooks';

const sp: ShorePoint = {
  id: 'sp1', opId: 'op1', seq: 7, division: '2', shoreType: 't-shore',
  measurementEighths: 800, deductions: NO_DEDUCTIONS, status: 'pending',
};
const EVENTS: FieldShoreEvent[] = [
  { type: 'OperationCreated', id: 'e0', opId: 'op1', at: 1, by: 'dev1', name: 'Maple St', multiBuilding: false },
  { type: 'ShorePointAdded', id: 'e1', opId: 'op1', at: 2, by: 'dev1', shorePoint: sp },
  { type: 'ShorePointStatusChanged', id: 'e2', opId: 'op1', at: 3, by: 'dev1', spId: 'sp1', from: 'process', to: 'cutting' },
];
const ENTRIES: AuditEntry[] = [
  { id: 'a1', type: 'roleCreated', at: 1, by: 'devA', actor: 'Capt Vergo', roleName: 'Logistics Chief' },
  { id: 'a2', type: 'memberRevoked', at: 2, by: 'devA', actor: 'Capt Vergo', targetUid: 'uX' },
];
const MEMBERS: Record<string, Member> = { uX: { role: 'default', displayName: 'T. Okafor', joinedAt: 1 } };

const mockAccess = vi.fn((): AuditAccess => ({ opId: 'op1', opName: 'Maple St', canIncident: true, canAdministrative: true, loading: false }));
const mockEventLog = vi.fn(() => ({ events: EVENTS, deviceUid: 'dev1' }));
const auditRefresh = vi.fn();
const mockAuditTrail = vi.fn(() => ({ entries: ENTRIES as AuditEntry[] | null, error: false, refresh: auditRefresh }));
const mockUserManager = vi.fn(() => ({ members: MEMBERS as Record<string, Member> | null, membersError: false, refresh: vi.fn() }));
const mockRoles = vi.fn(() => ({}));

vi.mock('@ui/hooks', () => ({
  useAuditAccess: () => mockAccess(),
  useEventLog: () => mockEventLog(),
  useAuditTrail: () => mockAuditTrail(),
  useUserManager: () => mockUserManager(),
  useRoles: () => mockRoles(),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@ui/util/download', () => ({ download: vi.fn() }));

describe('AuditLogScreen', () => {
  beforeEach(() => {
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: true, canAdministrative: true, loading: false });
    mockEventLog.mockReturnValue({ events: EVENTS, deviceUid: 'dev1' });
    mockAuditTrail.mockReturnValue({ entries: ENTRIES, error: false, refresh: auditRefresh });
    mockUserManager.mockReturnValue({ members: MEMBERS, membersError: false, refresh: vi.fn() });
    vi.mocked(download).mockClear();
  });

  it('blocks a viewer with neither entitlement (command-record backstop)', () => {
    mockAccess.mockReturnValue({ opId: null, opName: null, canIncident: false, canAdministrative: false, loading: false });
    render(<AuditLogScreen />);
    expect(screen.getByText('Command record')).toBeInTheDocument();
  });

  it('both entitlements: shows the Incident ⇆ Administrative tabs, Incident first', () => {
    render(<AuditLogScreen />);
    expect(screen.getByText('Incident')).toBeInTheDocument();
    expect(screen.getByText('Administrative')).toBeInTheDocument();
    expect(screen.getByText(/IC \/ Operations/)).toBeInTheDocument(); // the Incident lock
    expect(screen.getByText('Shore point 7 added')).toBeInTheDocument(); // a real event row
    expect(screen.getByText(new RegExp(STATUS_LABELS.cutting))).toBeInTheDocument(); // status row
  });

  it('incident-only: no tab switcher, IC/Operations lock, event rows', () => {
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: true, canAdministrative: false, loading: false });
    render(<AuditLogScreen />);
    expect(screen.queryByText('Administrative')).not.toBeInTheDocument(); // no second tab
    expect(screen.getByText(/IC \/ Operations/)).toBeInTheDocument();
    expect(screen.getByText('Shore point 7 added')).toBeInTheDocument();
  });

  it('administrative-only: Admins-only lock, governance rows with resolved names', () => {
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: false, canAdministrative: true, loading: false });
    render(<AuditLogScreen />);
    expect(screen.queryByText('Incident')).not.toBeInTheDocument(); // no second tab
    expect(screen.getByText(/Admins only/)).toBeInTheDocument();
    expect(screen.getByText('Role “Logistics Chief” created')).toBeInTheDocument();
    expect(screen.getByText('T. Okafor — access revoked')).toBeInTheDocument(); // member name resolved
  });

  it('empty log shows the calm all-clear state', () => {
    mockEventLog.mockReturnValue({ events: [], deviceUid: 'dev1' });
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: true, canAdministrative: false, loading: false });
    render(<AuditLogScreen />);
    expect(screen.getByText('Nothing logged yet')).toBeInTheDocument();
  });

  it('filtering to nothing shows the filtered empty state with a clear action', async () => {
    const user = userEvent.setup();
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: true, canAdministrative: false, loading: false });
    render(<AuditLogScreen />);
    await user.type(screen.getByLabelText('Filter the log'), 'zzz-no-match');
    expect(screen.getByText('No matching entries')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filter' })).toBeInTheDocument();
  });

  it('a row expands its before→after detail inline', async () => {
    const user = userEvent.setup();
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: true, canAdministrative: false, loading: false });
    render(<AuditLogScreen />);
    expect(screen.queryByText(`from ${STATUS_LABELS.process}`)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: new RegExp(STATUS_LABELS.cutting) }));
    expect(screen.getByText(`from ${STATUS_LABELS.process}`)).toBeInTheDocument();
  });

  it('administrative read error (#211) shows the retry state, not "Loading…", and Retry calls refresh()', async () => {
    const user = userEvent.setup();
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: false, canAdministrative: true, loading: false });
    mockAuditTrail.mockReturnValue({ entries: null, error: true, refresh: auditRefresh });
    render(<AuditLogScreen />);
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(screen.getByText('Couldn’t load the trail')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(auditRefresh).toHaveBeenCalledTimes(1);
  });

  it('export builds a CSV of the active view', async () => {
    const user = userEvent.setup();
    mockAccess.mockReturnValue({ opId: 'op1', opName: 'Maple St', canIncident: true, canAdministrative: false, loading: false });
    render(<AuditLogScreen />);
    await user.click(screen.getByRole('button', { name: 'Export this view as CSV' }));
    expect(download).toHaveBeenCalledTimes(1);
    expect(vi.mocked(download).mock.calls[0]![1]).toContain('When,Type,Action,Detail,By');
  });
});
