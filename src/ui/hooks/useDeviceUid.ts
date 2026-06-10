import { getDeviceUid } from '@data/store';

/** Returns the async device-uid getter (boundary-legal @data import). */
export function useDeviceUid(): () => Promise<string> {
  return getDeviceUid;
}
