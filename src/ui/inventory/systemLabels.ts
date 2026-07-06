import type { System } from '@core/schema';

/** The single user-facing name per strut system (craft.md §8). The v3 color-code
 *  wrappers ("Gold (LongShore)") never surface in copy; CSV tokens are unaffected. */
export const SYSTEM_LABELS: Record<System, string> = {
  LongShore: 'LongShore',
  AcmeThread: 'Acme thread',
  LockStroke: 'LockStroke',
};
