import type { InventoryItem } from '@core/schema';

// data/sync — pure helpers for non-event state sync (cloud-sync Increment 3).
// Imports NOTHING from data/store, so it's safe for both the registry (push hooks)
// AND the listener (pull/first-merge) to import without a module cycle. The shapes
// here ARE the cloud wire format under /orgs/{deptId}/{inventory|apparatus|titles|checklists}.
//
// LWW MODEL — every synced record carries `lastWriteAt` (epoch ms). A record is
// applied only when its stamp is strictly newer than the local one; the cloud rule
// guards the same monotonically (newData.lastWriteAt >= data.lastWriteAt) so an
// idempotent re-push of an unchanged record is never rejected. State, unlike the
// event log, is OVERWRITE (not append-only) — newest wins.

export interface BlobEnvelope<T = unknown> {
  value: T;
  lastWriteAt: number;
}

export interface Tombstone {
  id: string;
  deleted: true;
  lastWriteAt: number;
}

// The cloud inventory row: identity + quantity, NEVER `available`. `available` is
// owned by the event log (deploy/return replay on every device, operationStore
// commit fromRemote path), so syncing it here would let a stale stock blob clobber
// an event-driven decrement. Peers recompute available = quantity − deployed.
export type CloudRow = Omit<InventoryItem, 'available'> & { lastWriteAt: number };

/** Relative cloud path (under /orgs/{deptId}) for one inventory row. */
export const inventoryPath = (id: string): string => `inventory/${id}`;
/** The meta-blob relative cloud paths. */
export const BLOB_PATHS = ['apparatus', 'titles', 'checklists', 'apparatusTypes', 'deptPolicies'] as const;
export type BlobPath = (typeof BLOB_PATHS)[number];

/** Drop `available` (event-owned); carry the stamp (0 for never-stamped local rows). */
export function toCloudRow(item: InventoryItem): CloudRow {
  const row: Partial<InventoryItem> = { ...item };
  delete row.available;
  return { ...(row as Omit<InventoryItem, 'available'>), lastWriteAt: item.lastWriteAt ?? 0 };
}

export const tombstone = (id: string, lastWriteAt: number): Tombstone => ({ id, deleted: true, lastWriteAt });

export const wrapBlob = <T>(value: T, lastWriteAt: number): BlobEnvelope<T> => ({ value, lastWriteAt });

/** The stamp of any record (row, tombstone, or envelope); 0 when absent/unstamped. */
export const stampOf = (r: { lastWriteAt?: number } | null | undefined): number =>
  typeof r?.lastWriteAt === 'number' ? r.lastWriteAt : 0;

export const isTombstone = (r: unknown): r is Tombstone =>
  !!r && typeof r === 'object' && (r as { deleted?: unknown }).deleted === true;

/**
 * Unwrap a stored meta-blob JSON value. Back-compat: a pre-Increment-3 row stored the
 * bare list/map (no envelope) — treat it as the OLDEST possible (lastWriteAt 0) so the
 * first cloud snapshot pulls a real peer edit down, or pushes this value up if cloud is
 * emptier. A wrapped blob is { value, lastWriteAt }.
 */
export function unwrapBlob(parsed: unknown): { value: unknown; lastWriteAt: number } {
  if (
    parsed &&
    typeof parsed === 'object' &&
    'value' in parsed &&
    'lastWriteAt' in parsed &&
    typeof (parsed as BlobEnvelope).lastWriteAt === 'number'
  ) {
    const p = parsed as BlobEnvelope;
    return { value: p.value, lastWriteAt: p.lastWriteAt };
  }
  return { value: parsed, lastWriteAt: 0 };
}
