import { createStore, type StoreApi } from 'zustand/vanilla';

// data/sync — the peer cutting-arrivals counter (#404, OQ#45 / gate M11). Counts
// shore points that entered the `cutting` queue from ANOTHER device (a remote
// ShorePointStatusChanged → cutting, applied by reconcile). The Cutting Station reads
// it for the "N new" header badge — the "someone sent you work" attention-grab that
// M11 deferred until real-time peer sync landed (#369, 2026-06-23). A LOCAL move into
// cutting never bumps it: you don't need to be told about your own action. Cleared
// when the cutter leaves the station (each visit reflects arrivals since the last).
// Firebase-free, no store deps — safe to import in data AND ui/hooks.

export interface PeerCutStoreApi {
  store: StoreApi<{ count: number }>;
  /** Bump the unseen-peer-cut count (no-op for n ≤ 0). */
  add(n: number): void;
  /** Reset to zero — the cutter has seen the queue (Cutting Station unmount). */
  reset(): void;
}

export function createPeerCutStore(): PeerCutStoreApi {
  const store = createStore<{ count: number }>(() => ({ count: 0 }));
  return {
    store,
    add: (n) => {
      if (n > 0) store.setState((s) => ({ count: s.count + n }));
    },
    reset: () => store.setState({ count: 0 }),
  };
}

/** The app's singleton peer-cut counter. */
export const peerCutStore = createPeerCutStore();
