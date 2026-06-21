import { useStore } from 'zustand';
import { operationStore } from '@data/store';

/** The whole per-device My Role map (uid → positionId). */
export function useMyRoles(): Record<string, string | null> {
  return useStore(operationStore.store, (s) => s.myRoles);
}

/** One device's self-declared ICS position id. null = explicitly cleared / unset;
 *  undefined = no uid yet (still resolving). The caller supplies its uid (useDeviceUid),
 *  keeping this a synchronous store selector — My Role may diverge from the IC's org
 *  assignment by design (the two are separate slices). */
export function useMyRole(uid: string | undefined): string | null | undefined {
  return useStore(operationStore.store, (s) => (uid ? (s.myRoles[uid] ?? null) : undefined));
}
