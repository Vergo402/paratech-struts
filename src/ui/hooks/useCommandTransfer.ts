import { useStore } from 'zustand';
import type { PendingTransfer } from '@core/org';
import { operationStore } from '@data/store';

/** The pending command transfer (ADR-021), or null when none is in flight. Drives
 *  both ends of the handshake screen (P8). Synchronous store selector (L-4). */
export function useCommandTransfer(): PendingTransfer | null {
  return useStore(operationStore.store, (s) => s.commandTransfer);
}
