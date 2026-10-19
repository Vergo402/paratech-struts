import { QueryClient } from '@tanstack/react-query';

// The app's one QueryClient (main.tsx mounts it; queryClient.test.tsx exercises this same factory).
//
// networkMode 'always': TanStack v5's default ('online') PAUSES a query or mutation while the
// browser reports offline — its queryFn never runs. Nearly every query in this app is a read of
// LOCAL Dexie (event logs, history, past operations, the device uid) and every write is
// local-first, so the default would leave those screens loading forever with no signal: the
// opposite of the offline-first promise. The default is therefore 'always' for both.
//
// Anything that genuinely needs the network opts back in per query with `networkMode: 'online'`
// (today: useRoster and useDeviceOwners, the two RTDB one-shot reads). There, pausing once the
// browser reports offline is right: no RTDB get() is started just to hang, and it refetches on
// reconnect. (TanStack's onlineManager starts "online" and flips only on the window offline/online
// events, so a cold launch with no signal still fires the read once; both readers degrade to []/{}.)
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { networkMode: 'always' },
      mutations: { networkMode: 'always' },
    },
  });
}
