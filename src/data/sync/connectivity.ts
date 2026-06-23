import { syncService } from './syncService';
import { syncStatusStore } from './syncStatus';

// data/sync — online/offline detection (cloud-sync Increment 2, extended in Increment 4).
// Tracks a reactive online flag for the sync banner (syncStatusStore) AND, on reconnect,
// kicks the best-effort work that was waiting on a connection: flush queued events, and
// auto-complete a queued department join (Increment 4). Factory + singleton mirror the
// other sync seams; window access + the online getter are injected so unit tests stay
// window-free. Both 'online' and 'offline' are wired (Increment 2 only watched 'online').

export interface Connectivity {
  start(): void;
  stop(): void;
}

export function createConnectivity(deps: {
  onOnline: () => void;
  onOffline?: () => void;
  setOnline?: (online: boolean) => void;
  isOnline?: () => boolean;
  addListener?: (type: 'online' | 'offline', fn: () => void) => void;
  removeListener?: (type: 'online' | 'offline', fn: () => void) => void;
}): Connectivity {
  const add = deps.addListener ?? ((t, fn) => window.addEventListener(t, fn));
  const remove = deps.removeListener ?? ((t, fn) => window.removeEventListener(t, fn));
  const setOnline = deps.setOnline ?? ((o) => syncStatusStore.setOnline(o));
  const isOnline = deps.isOnline ?? (() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  let onlineHandler: (() => void) | null = null;
  let offlineHandler: (() => void) | null = null;

  return {
    start() {
      if (onlineHandler) return; // idempotent
      setOnline(isOnline()); // seed the reactive flag at boot
      onlineHandler = () => {
        setOnline(true);
        deps.onOnline();
      };
      offlineHandler = () => {
        setOnline(false);
        deps.onOffline?.();
      };
      add('online', onlineHandler);
      add('offline', offlineHandler);
    },
    stop() {
      if (onlineHandler) remove('online', onlineHandler);
      if (offlineHandler) remove('offline', offlineHandler);
      onlineHandler = null;
      offlineHandler = null;
    },
  };
}

/**
 * The app's singleton. On reconnect: (1) flush queued events; (2) retry a queued
 * department join and, if it completes, reload onto the new bucket (the established
 * switch mechanism, ui/dept/switchBucket = window.location.assign('/operations') —
 * inlined here to keep data/* from importing ui/*). departmentService is lazily
 * imported so this module stays firebase-free at load.
 */
export const connectivity = createConnectivity({
  onOnline: () => {
    void syncService.flush();
    void import('../dept/departmentService').then(async ({ departmentService }) => {
      const joined = await departmentService.retryPendingJoin();
      if (joined) window.location.assign('/operations');
    });
  },
});
