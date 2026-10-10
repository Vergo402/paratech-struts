import { z } from 'zod';
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

// The cloud inventory row: identity + quantity + the LWW stamp. Stock out on scene is
// not part of it: ADR-041 derives it on every device from the same event log
// (available = quantity − held(log)), so there is no stored counter to sync and nothing
// a stale stock blob could clobber.
export type CloudRow = InventoryItem & { lastWriteAt: number };

/** Relative cloud path (under /orgs/{deptId}) for one inventory row. */
export const inventoryPath = (id: string): string => `inventory/${id}`;
/** The meta-blob relative cloud paths. */
export const BLOB_PATHS = ['apparatus', 'titles', 'checklists', 'apparatusTypes', 'deptPolicies'] as const;
export type BlobPath = (typeof BLOB_PATHS)[number];

/** The wire row: the persisted fields plus the stamp (0 for never-stamped local rows).
 *  Built field by field, so a derived view field (`held`, `available`) on a StockRow
 *  passed in by mistake — or a legacy row's vestigial `available` — never reaches the
 *  cloud. */
export function toCloudRow(item: InventoryItem): CloudRow {
  const row: CloudRow = {
    id: item.id,
    type: item.type,
    model: item.model,
    system: item.system,
    length: item.length,
    plateId: item.plateId,
    apparatus: item.apparatus,
    apparatusId: item.apparatusId,
    quantity: item.quantity,
    lastWriteAt: item.lastWriteAt ?? 0,
  };
  for (const k of Object.keys(row) as (keyof CloudRow)[]) if (row[k] === undefined) delete row[k];
  return row;
}

export const tombstone = (id: string, lastWriteAt: number): Tombstone => ({ id, deleted: true, lastWriteAt });

export const wrapBlob = <T>(value: T, lastWriteAt: number): BlobEnvelope<T> => ({ value, lastWriteAt });

// #481 per-element salvage. A whole-list `z.array(X).catch([])` collapses the ENTIRE synced
// list when ONE element fails to parse, then persists the empty list WITH the remote stamp,
// so local can never win it back by last-write-wins. These combinators parse element by
// element and drop only the bad ones; non-container input still degrades to empty.
const warnDrop = (label: string, key: string | number, err: z.ZodError): void => {
  if (import.meta.env.MODE === 'development') {
    console.warn(`[stateSync] dropped malformed ${label} entry ${key}`, err.issues);
  }
};

export const salvageArray = <T extends z.ZodTypeAny>(element: T, label: string) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items): z.infer<T>[] => {
      const out: z.infer<T>[] = [];
      items.forEach((raw, i) => {
        const r = element.safeParse(raw);
        if (r.success) out.push(r.data as z.infer<T>);
        else warnDrop(label, i, r.error);
      });
      return out;
    });

export const salvageRecord = <T extends z.ZodTypeAny>(value: T, label: string) =>
  z
    .record(z.unknown())
    .catch({})
    .transform((rec): Record<string, z.infer<T>> => {
      const out: Record<string, z.infer<T>> = {};
      for (const [k, raw] of Object.entries(rec)) {
        const r = value.safeParse(raw);
        if (r.success) out[k] = r.data as z.infer<T>;
        else warnDrop(label, k, r.error);
      }
      return out;
    });

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

/** The shared boot skeleton of the five whole-blob LWW stores (#435 dedup):
 *  read one persisted meta row, JSON-parse defensively, unwrap the envelope.
 *  null when the row is absent — each caller keeps its own default + its own
 *  schema parse (the store owns its shape; a wrong-shape value still degrades
 *  through the caller's .catch default, never dead-ends boot). Structurally
 *  typed so this module needs no dependency on the Dexie class. */
export async function readBlobRow(
  db: { meta: { get(key: string): Promise<{ value: string } | undefined> } },
  key: string,
): Promise<{ value: unknown; lastWriteAt: number } | null> {
  const row = await db.meta.get(key);
  if (!row) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.value);
  } catch {
    parsed = undefined;
  }
  return unwrapBlob(parsed);
}
