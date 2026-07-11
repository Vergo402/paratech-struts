import { useEffect } from 'react';
import type { FieldShoreEvent, ShorePoint } from '@core/schema';
import { newId } from '@core/id';
import { convertToWords, w3wEnabled, useCommitMany, useDeviceUid } from '@ui/hooks';

/**
 * Shore point location capture (#441). The device's GPS fix is taken where the
 * inputter stands when the point is created (or on the card's Capture-location
 * action) and fanned to every member of the add — one 3m square per physical
 * shore/group. The what3words conversion rides behind it when online.
 *
 * Doctrine: NOTHING here blocks shore point work. Capture runs after the add
 * commits; every failure (permission denied, no fix, offline, no w3w key) is
 * swallowed — a point without coords/words is normal, and the quiet card button
 * plus the backfill hook pick up the slack later.
 */

type CommitMany = (events: FieldShoreEvent[]) => Promise<{ ok: boolean }>;

const GPS_TIMEOUT_MS = 15_000;

function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: 30_000 },
    );
  });
}

function patchEvents(
  spIds: string[],
  opId: string,
  by: string,
  patch: { coords?: { lat: number; lng: number }; w3w?: string },
): FieldShoreEvent[] {
  const at = Date.now();
  return spIds.map((spId) => ({ type: 'ShorePointEdited', id: newId(), opId, at, by, spId, patch }));
}

/**
 * Fire-and-forget: GPS fix → coords patch on every id → (online + key) words patch.
 * The coords patch lands FIRST and independently, so an offline or failed words
 * conversion still leaves the position saved for the backfill to convert later.
 */
export async function captureLocation(spIds: string[], opId: string, commitMany: CommitMany, by: string): Promise<void> {
  if (spIds.length === 0) return;
  let coords: { lat: number; lng: number };
  try {
    coords = await currentPosition();
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[locationCapture] no GPS fix:', err);
    return; // no fix — the card's Capture-location button remains the retry path
  }
  const saved = await commitMany(patchEvents(spIds, opId, by, { coords }));
  if (!saved.ok) return;
  if (!w3wEnabled() || !navigator.onLine) return; // words pending — backfill converts later
  try {
    const w3w = await convertToWords(coords);
    await commitMany(patchEvents(spIds, opId, by, { w3w }));
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[locationCapture] words conversion failed:', err);
  }
}

// Backfill bookkeeping — one attempt per point per connectivity period. A new
// 'online' event clears the ledger so a previously-failed conversion retries.
const attempted = new Set<string>();

/**
 * Converts coords-but-no-words shore points once connectivity and a key allow.
 * Mounted by the Operations board; groups share coords, so members are batched
 * per identical fix into one conversion call (gentle on the key's rate limit).
 */
export function useW3wBackfill(opId: string | undefined, shorePoints: ShorePoint[]): void {
  const commitMany = useCommitMany();
  const getUid = useDeviceUid();

  useEffect(() => {
    if (!opId || !w3wEnabled()) return;

    let cancelled = false;
    const run = async () => {
      if (!navigator.onLine) return;
      const pending = shorePoints.filter((sp) => sp.coords && !sp.w3w && !sp.deletedAt && !attempted.has(sp.id));
      if (pending.length === 0) return;
      pending.forEach((sp) => attempted.add(sp.id));
      // One conversion per distinct fix — grouped members share the same coords.
      const byFix = new Map<string, { coords: { lat: number; lng: number }; ids: string[] }>();
      for (const sp of pending) {
        const key = `${sp.coords!.lat},${sp.coords!.lng}`;
        const entry = byFix.get(key) ?? { coords: sp.coords!, ids: [] };
        entry.ids.push(sp.id);
        byFix.set(key, entry);
      }
      const uid = await getUid();
      for (const { coords, ids } of byFix.values()) {
        if (cancelled) return;
        try {
          const w3w = await convertToWords(coords);
          if (cancelled) return;
          await commitMany(patchEvents(ids, opId, uid, { w3w }));
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[locationCapture] backfill conversion failed:', err);
        }
      }
    };

    void run();
    const onOnline = () => {
      attempted.clear(); // new connectivity — previously-failed conversions get one more try
      void run();
    };
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, [opId, shorePoints, commitMany, getUid]);
}
