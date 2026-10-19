// @vitest-environment jsdom
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager, useMutation, useQuery } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// Offline reads (the core field promise). TanStack v5's default networkMode is 'online': a
// query/mutation PAUSES (fetchStatus 'paused', queryFn never called) while the browser reports
// offline. Nearly every query in this app reads LOCAL Dexie, so with the default config an
// offline reload would leave every history / audit / past-operations screen "loading" forever.
// These tests run the real hooks under the REAL app client (createQueryClient).

const m = vi.hoisted(() => ({
  readShorePointHistory: vi.fn(),
  readEventLog: vi.fn(),
  readRoleHistory: vi.fn(),
  readArchive: vi.fn(),
  readOperation: vi.fn(),
  readRoster: vi.fn(),
  readDeviceOwners: vi.fn(),
  sessionState: { departmentId: 'dept-1' as string | null, identity: { kind: 'guest' } as unknown },
}));

vi.mock('@data/store', async () => {
  const { createStore } = await import('zustand/vanilla');
  return {
    getDeviceUid: async () => 'device-1',
    operationStore: {
      readShorePointHistory: m.readShorePointHistory,
      readEventLog: m.readEventLog,
      readRoleHistory: m.readRoleHistory,
      readArchive: m.readArchive,
      readOperation: m.readOperation,
      outcomes: () => new Map(),
    },
    sessionStore: { store: createStore(() => m.sessionState) },
  };
});
vi.mock('@data/dept', () => ({
  departmentService: { readRoster: m.readRoster, readDeviceOwners: m.readDeviceOwners },
}));

import { createQueryClient } from './queryClient';
import { useShorePointHistory } from '@ui/hooks/useShorePointHistory';
import { useEventLog } from '@ui/hooks/useEventLog';
import { useRoleHistory } from '@ui/hooks/useRoleHistory';
import { useDeviceUidValue } from '@ui/hooks/useDeviceUidValue';
import { usePastOperations, useArchivedOperation } from '@ui/hooks/usePastOperations';
import { useRoster } from '@ui/hooks/useRoster';
import { useDeviceOwners } from '@ui/hooks/useDeviceOwners';

const wrapperFor = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };

beforeEach(() => {
  vi.clearAllMocks();
  m.readShorePointHistory.mockResolvedValue([]);
  m.readEventLog.mockResolvedValue([]);
  m.readRoleHistory.mockResolvedValue([]);
  m.readArchive.mockResolvedValue([]);
  m.readOperation.mockResolvedValue({ id: 'op-1' });
  m.readRoster.mockResolvedValue([{ id: 'a1', displayName: 'Ada' }]);
  m.readDeviceOwners.mockResolvedValue({ 'device-1': 'a1' });
  onlineManager.setOnline(false);
});
afterEach(() => {
  onlineManager.setOnline(true);
});

describe('offline reads under the app QueryClient', () => {
  it('premise: a bare QueryClient (TanStack v5 defaults) pauses a query while offline', async () => {
    const client = new QueryClient();
    const queryFn = vi.fn(async () => 'local');
    const { result } = renderHook(() => useQuery({ queryKey: ['premise'], queryFn }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.fetchStatus).toBe('paused'));
    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('a local-read query resolves while offline (never paused)', async () => {
    const client = createQueryClient();
    const queryFn = vi.fn(async () => 'local');
    const { result } = renderHook(() => useQuery({ queryKey: ['local'], queryFn }), {
      wrapper: wrapperFor(client),
    });
    await waitFor(() => expect(result.current.data).toBe('local'));
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('a local-write mutation runs while offline (never paused)', async () => {
    const client = createQueryClient();
    const mutationFn = vi.fn(async (n: number) => n * 2);
    const { result } = renderHook(() => useMutation({ mutationFn }), { wrapper: wrapperFor(client) });
    let out: number | undefined;
    await act(async () => {
      out = await result.current.mutateAsync(21);
    });
    expect(out).toBe(42);
  });

  describe.each([
    ['useShorePointHistory', () => useShorePointHistory('sp-1'), 'readShorePointHistory'],
    ['useEventLog', () => useEventLog('op-1'), 'readEventLog'],
    ['useRoleHistory', () => useRoleHistory('op-1'), 'readRoleHistory'],
  ] as const)('%s', (_name, useHook, reader) => {
    it('reads the local event log and resolves the device uid while offline', async () => {
      const { result } = renderHook(useHook, { wrapper: wrapperFor(createQueryClient()) });
      await waitFor(() => expect(result.current.deviceUid).toBe('device-1'));
      await waitFor(() => expect(m[reader]).toHaveBeenCalledTimes(1));
    });
  });

  it('useDeviceUidValue resolves while offline', async () => {
    const { result } = renderHook(() => useDeviceUidValue(), { wrapper: wrapperFor(createQueryClient()) });
    await waitFor(() => expect(result.current).toBe('device-1'));
  });

  it('usePastOperations / useArchivedOperation resolve while offline', async () => {
    const client = createQueryClient();
    const list = renderHook(() => usePastOperations(), { wrapper: wrapperFor(client) });
    const one = renderHook(() => useArchivedOperation('op-1'), { wrapper: wrapperFor(client) });
    await waitFor(() => expect(list.result.current.data).toEqual([]));
    await waitFor(() => expect(one.result.current.data).toEqual({ id: 'op-1' }));
  });

  it('network-bound reads (roster, device owners) stay paused offline and fetch on reconnect', async () => {
    const client = createQueryClient();
    const roster = renderHook(() => useRoster(), { wrapper: wrapperFor(client) });
    const owners = renderHook(() => useDeviceOwners(), { wrapper: wrapperFor(client) });

    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(client.getQueryState(['dept-roster', 'dept-1'])?.fetchStatus).toBe('paused');
    expect(client.getQueryState(['device-owners', 'dept-1'])?.fetchStatus).toBe('paused');
    expect(m.readRoster).not.toHaveBeenCalled();
    expect(m.readDeviceOwners).not.toHaveBeenCalled();
    expect(roster.result.current).toEqual([]); // honest degrade: empty, not a hung RTDB get()
    expect(owners.result.current('device-1')).toBeNull();

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(roster.result.current).toEqual([{ id: 'a1', displayName: 'Ada' }]));
    await waitFor(() => expect(owners.result.current('device-1')).toBe('a1'));
  });
});
