import { newId } from '@core/id';
import { globalDb as defaultDb, type FieldShoreDB } from './db';

// ADR-024 — the per-device anonymous identity. A uid minted once per device
// (crypto.randomUUID, L-10) and persisted in the Dexie `meta` table under this
// key. Every event's `by` field carries it. Real Firebase Auth (email +
// magic-link, ADR-025) arrives in a later session; the guest path keeps this.
export const AUTH_UID_KEY = 'fieldshore_auth_uid';

const cache = new WeakMap<FieldShoreDB, string>();

/** Read the device uid, minting + persisting it on first call. */
export async function getDeviceUid(db: FieldShoreDB = defaultDb): Promise<string> {
  const cached = cache.get(db);
  if (cached) return cached;

  const row = await db.meta.get(AUTH_UID_KEY);
  if (row) {
    cache.set(db, row.value);
    return row.value;
  }

  const uid = newId();
  try {
    await db.meta.add({ key: AUTH_UID_KEY, value: uid });
  } catch {
    // Lost a mint race to a concurrent call — the unique key (&key) rejected
    // our add. The winner's uid is durable; read and use it.
    const winner = await db.meta.get(AUTH_UID_KEY);
    if (winner) {
      cache.set(db, winner.value);
      return winner.value;
    }
    throw new Error('FieldShore: could not persist device uid');
  }
  cache.set(db, uid);
  return uid;
}
