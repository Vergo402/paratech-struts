import Dexie from 'dexie';
import { globalDb, deptDbName, GUEST_BUCKET } from './db';
import { currentBucket, currentDeptDb } from './registry';
import { SESSION_KEY, MEMBERSHIPS_KEY } from './session';

// data/store — wipe the signed-in member's LOCAL footprint when their account is
// deleted (the Firebase Auth user is removed by the account seam). This drops this
// device's copy of the member's data and lets boot fall back to a clean guest state.
// KEPT: the device uid (auth.ts — the floor) and onboarding progress. NOT a reload —
// the caller reloads once this resolves.
//
// departmentId is passed IN (captured by the caller BEFORE the auth delete) so an
// async onAuthStateChanged→setGuest can't blank departmentId before we read which
// bucket to drop. A guest (null/guest bucket) has no member bucket to delete.
export async function deleteLocalAccountData(departmentId: string | null): Promise<void> {
  try {
    if (departmentId && departmentId !== GUEST_BUCKET) {
      // Close the live handle to this bucket first, or indexedDB.deleteDatabase
      // blocks on the open connection and the bucket survives the reload.
      if (currentBucket() === departmentId) currentDeptDb().close();
      await Dexie.delete(deptDbName(departmentId));
    }
    await globalDb.meta.delete(SESSION_KEY); // identity + dept projection
    await globalDb.meta.delete(MEMBERSHIPS_KEY); // account-keyed remembered dept
  } catch (err) {
    // Best-effort — the caller reloads to a known guest state regardless (audit W6).
    console.error('deleteLocalAccountData failed:', err);
  }
}
