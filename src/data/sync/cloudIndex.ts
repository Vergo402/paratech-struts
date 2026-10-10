// Cloud snapshot index (ADR-041, #499) — the ids the cloud currently holds for this
// department's event log, each mapped to its server-stamped `receivedAt` (the canonical
// order key). Firebase-free and dependency-free on purpose: the event listener REPLACES
// it wholesale on every `onValue` snapshot, and the sync service READS it after an upload
// resolves (to pick up the server `receivedAt` for markReceived) and after an upload
// fails (`has(id)` ⇒ the write landed but the ack was lost — treat as synced). It holds
// only the LATEST snapshot: no merge, no history. `clear()` on sync start / sign-out so a
// previous department's ids can never vouch for this one's uploads.

export interface CloudIndexEntry {
  readonly id: string;
  /** Server stamp; absent on legacy pre-ADR-041 cloud events. */
  readonly receivedAt?: number;
}

export interface CloudIndex {
  /** Swap in the latest cloud snapshot (drops everything the previous one held). */
  replace(events: readonly CloudIndexEntry[]): void;
  has(id: string): boolean;
  /** The server stamp for `id`, or undefined if absent from the snapshot or unstamped. */
  receivedAt(id: string): number | undefined;
  size(): number;
  clear(): void;
}

export function createCloudIndex(): CloudIndex {
  let byId = new Map<string, number | undefined>();
  return {
    replace(events) {
      const next = new Map<string, number | undefined>();
      for (const e of events) {
        // a non-finite stamp (NaN, a stray sentinel object) is no stamp
        const stamp = e.receivedAt;
        next.set(e.id, typeof stamp === 'number' && Number.isFinite(stamp) ? stamp : undefined);
      }
      byId = next;
    },
    has: (id) => byId.has(id),
    receivedAt: (id) => byId.get(id),
    size: () => byId.size,
    clear() {
      byId = new Map();
    },
  };
}

/** The app-wide instance: filled by eventListener, read by syncService (wired in Stage 3b). */
export const cloudIndex: CloudIndex = createCloudIndex();
