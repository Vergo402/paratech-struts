import { syncService } from './syncService';

// data/sync — online/offline detection (cloud-sync Increment 2). When the device
// comes back online, kick a flush so events queued while offline upload. Factory +
// singleton mirror the other sync seams; window access is injected so unit tests
// stay window-free. Only the actionable 'online' event is wired.

export interface Connectivity {
  start(): void;
  stop(): void;
}

export function createConnectivity(deps: {
  onOnline: () => void;
  addListener?: (type: 'online', fn: () => void) => void;
  removeListener?: (type: 'online', fn: () => void) => void;
}): Connectivity {
  const add = deps.addListener ?? ((t, fn) => window.addEventListener(t, fn));
  const remove = deps.removeListener ?? ((t, fn) => window.removeEventListener(t, fn));
  let handler: (() => void) | null = null;

  return {
    start() {
      if (handler) return; // idempotent
      handler = () => deps.onOnline();
      add('online', handler);
    },
    stop() {
      if (handler) remove('online', handler);
      handler = null;
    },
  };
}

/** The app's singleton — reconnect kicks a best-effort flush of the queued events. */
export const connectivity = createConnectivity({ onOnline: () => void syncService.flush() });
