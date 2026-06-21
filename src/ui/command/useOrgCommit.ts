import { newId } from '@core/id';
import type { FieldShoreEvent } from '@core/schema';
import { useCommit, useDeviceUid, useOperation } from '@ui/hooks';

// The org/My-Role events the Command edit surfaces emit, minus the base fields the
// store stamps. useOrgCommit fills id/opId/at/by so each call site just names the
// event + its payload.
type OrgEvent = Extract<
  FieldShoreEvent,
  {
    type:
      | 'ResourceAssigned'
      | 'ResourceCleared'
      | 'PositionRenamed'
      | 'PositionAdded'
      | 'PositionRemoved'
      | 'PositionReparented'
      | 'PositionReordered'
      | 'MyRoleSet';
  }
>;
type WithoutBase<T> = T extends unknown ? Omit<T, 'id' | 'opId' | 'at' | 'by'> : never;
export type OrgEventInput = WithoutBase<OrgEvent>;

/** Commit an org/My-Role event for the active op — base fields filled in. No-op
 *  (returns undefined) when there's no active op. */
export function useOrgCommit(): (input: OrgEventInput) => Promise<unknown> {
  const op = useOperation();
  const commit = useCommit();
  const getUid = useDeviceUid();
  return async (input: OrgEventInput) => {
    if (!op) return undefined;
    const by = await getUid();
    return commit({ ...input, id: newId(), opId: op.id, at: Date.now(), by } as FieldShoreEvent);
  };
}
