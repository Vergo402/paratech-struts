import type { ShorePoint } from '@core/schema';
import { newId } from '@core/id';

/**
 * The grouped-shore hard-delete + re-add restructure batch (#435 dedup) — the
 * one genuinely shared piece of the two deploy surfaces' twin paths (the
 * 2026-07-10 re-audit found every OTHER twin difference intentional: ack
 * semantics, BOM sourcing, partial-skip, reporting contract). Rebuilding a
 * grouped shore replaces every member in ONE atomic commitMany so a partial
 * shore can never exist; one shared `at` on purpose — the rebuild is a single
 * logical moment. The store's ShorePointDeleted stock guard (#421) vets every
 * member of the batch.
 */
export function restructureBatch(
  members: ShorePoint[],
  rebuilt: ShorePoint[],
  opId: string,
  uid: string,
  at: number,
) {
  return [
    ...members.map((m) => ({
      type: 'ShorePointDeleted' as const,
      id: newId(),
      opId,
      at,
      by: uid,
      spId: m.id,
      hard: true,
    })),
    ...rebuilt.map((p) => ({
      type: 'ShorePointAdded' as const,
      id: newId(),
      opId,
      at,
      by: uid,
      shorePoint: p,
    })),
  ];
}
