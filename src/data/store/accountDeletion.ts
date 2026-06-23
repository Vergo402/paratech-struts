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
// departmentId + accountId are passed IN (captured by the caller BEFORE the auth
// delete) so an async onAuthStateChanged→setGuest can't blank them before we read
// which bucket / which membership entry to drop. A guest (null/guest bucket, no
// accountId) has no member bucket or membership to delete. (A late setGuest may
// re-create a guest SESSION_KEY row after this clears it — harmless: boot re-derives
// the same clean guest state from an absent OR a guest row.)
export async function deleteLocalAccountData(
  departmentId: string | null,
  accountId: string | null,
): Promise<void> {
  try {
    if (departmentId && departmentId !== GUEST_BUCKET) {
      // Close the live handle to this bucket first, or indexedDB.deleteDatabase
      // blocks on the open connection and the bucket survives the reload.
      if (currentBucket() === departmentId) currentDeptDb().close();
      await Dexie.delete(deptDbName(departmentId));
    }
    await globalDb.meta.delete(SESSION_KEY); // identity + dept projection
    await removeMembership(accountId); // ONLY this account's remembered dept
  } catch (err) {
    // Best-effort — the caller reloads to a known guest state regardless (audit W6).
    console.error('deleteLocalAccountData failed:', err);
  }
}

/**
 * Drop one account's entry from the shared, account-keyed memberships map (the row
 * holds every account that has used this device). Blanket-deleting the row would wipe
 * other accounts' remembered department + invite code; scope it to accountId, and
 * delete the row only once it is empty. A guest delete (no accountId) is a no-op.
 */
async function removeMembership(accountId: string | null): Promise<void> {
  if (!accountId) return;
  const row = await globalDb.meta.get(MEMBERSHIPS_KEY);
  if (!row) return;
  let map: Record<string, unknown>;
  try {
    map = JSON.parse(row.value) as Record<string, unknown>;
  } catch {
    return; // unreadable — leave it rather than risk clobbering other accounts
  }
  if (!map || typeof map !== 'object' || !(accountId in map)) return;
  delete map[accountId];
  if (Object.keys(map).length === 0) await globalDb.meta.delete(MEMBERSHIPS_KEY);
  else await globalDb.meta.put({ key: MEMBERSHIPS_KEY, value: JSON.stringify(map) });
}
