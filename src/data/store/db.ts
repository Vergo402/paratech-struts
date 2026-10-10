import Dexie, { type Table } from 'dexie';
import type { FieldShoreEvent, InventoryItem } from '@core/schema';

// data/store — the local-first persistence layer (module-boundaries.md). The
// `events` table IS the device's source of truth (ADR-009): every mutation is
// one appended row; current state is projectOperation() over it. Storage is
// IndexedDB via Dexie, not localStorage — the 5 MB cap is real at task-force
// scale (ADR-024).
//
// Primary key is an auto-increment `seq`; `id` is a unique index (a duplicate append —
// e.g. a peer event another tab already stored — fails on it). `seq` was the fold order
// before ADR-041; it is now ONLY the storage key. The canonical fold order
// `(receivedAt ?? +∞, at, id)` lives in memory (core/operation/eventLog), so nothing may
// treat `seq` as chronological. `receivedAt` (the cloud receipt stamp) rides on the row
// as a plain, non-indexed property — no schema version bump.
export type EventRow = FieldShoreEvent & { seq?: number };

export interface MetaRow {
  key: string;
  value: string;
}

export class FieldShoreDB extends Dexie {
  events!: Table<EventRow, number>;
  inventory!: Table<InventoryItem, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'fieldshore') {
    super(name);
    this.version(1).stores({
      events: '++seq, &id, opId, at',
      inventory: '&id, apparatusId',
      meta: '&key',
    });
  }
}

/** Stamp the cloud receipt time onto a stored event row (by its unique `id`). A no-op
 *  when no row has that id. */
export async function stampReceivedAt(db: FieldShoreDB, id: string, receivedAt: number): Promise<void> {
  await db.events.where('id').equals(id).modify({ receivedAt });
}

/** Fresh DB instance — tests pass a unique name for isolation. */
export function createDB(name?: string): FieldShoreDB {
  return new FieldShoreDB(name);
}

// --- per-department bucketing (cloud-sync Increment 1) -----------------------
// The phone holds ONE global DB (device/account meta that survives a department
// switch) + one DB PER DEPARTMENT. Each dept bucket is the local cache the cloud
// sync targets 1:1 to /orgs/{deptId}; a guest / no-department member works in the
// reserved 'guest' bucket. Switching departments swaps the active dept bucket
// (registry.ts) — the two never share a database, so data can't bleed across.
export const GLOBAL_DB_NAME = 'fieldshore-global';
export const GUEST_BUCKET = 'guest';
const DEPT_DB_PREFIX = 'fieldshore-dept-';

/** The Dexie name for a department's bucket (the guest bucket when no active dept). */
export function deptDbName(deptId: string | null | undefined): string {
  return DEPT_DB_PREFIX + (deptId || GUEST_BUCKET);
}

/**
 * True when the active store bucket no longer matches the signed-in member's
 * department — i.e. a departmentId change did NOT reload the stores
 * (ui/dept/switchBucket). Powers the dev-only write-time bucket guard injected by
 * registry.ts. `boundBucket` is the bare bucket key (a deptId or GUEST_BUCKET);
 * a guest's department is null/undefined, which maps to GUEST_BUCKET.
 */
export function isBucketStale(boundBucket: string, sessionDepartmentId: string | null | undefined): boolean {
  return (sessionDepartmentId || GUEST_BUCKET) !== boundBucket;
}

/**
 * The global DB — only its `meta` table is used, holding the device/account rows
 * that must survive a department switch (device uid, session, dept memberships,
 * onboarding). session.ts / auth.ts / onboardingStore.ts bind here.
 */
export const globalDb = createDB(GLOBAL_DB_NAME);

/**
 * The LEGACY single-tenant database name (pre-bucketing). No store binds to it; the
 * boot migration (migrate.ts) opens a throwaway handle to split its rows into the
 * global DB + the active dept bucket, then deletes it (SIM-IV O-1, #399). There is
 * deliberately no module-level singleton — a persistent handle to a soon-deleted DB
 * is exactly the orphaned connection this cleanup removes.
 */
export const LEGACY_DB_NAME = 'fieldshore';
