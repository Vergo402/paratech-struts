import { newId } from '@core/id';
import type { FieldShoreEvent } from '@core/schema';
import { useCommit, useDeviceUid, useOperation, useSession } from '@ui/hooks';

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
      | 'MyRoleSet'
      | 'CommandTransferInitiated'
      | 'CommandTransferAccepted'
      | 'CommandTransferDeclined'
      | 'CommandTransferCancelled';
  }
>;
type WithoutBase<T> = T extends unknown ? Omit<T, 'id' | 'opId' | 'at' | 'by'> : never;
export type OrgEventInput = WithoutBase<OrgEvent>;

/** Commit an org/My-Role event for the active op — base fields filled in. No-op
 *  (returns undefined) when there's no active op. */
// Only these self/command events carry the account (schema-declared) — MyRoleSet keys
// My Role by it, the transfer guard/accept verify by it. Type-scoped so `account` can
// NEVER leak onto ResourceAssigned/Position* (the store reuses the raw event object for
// both the durable append and the sync enqueue — we can't rely on Zod stripping it).
const CARRIES_ACCOUNT = new Set(['MyRoleSet', 'CommandTransferInitiated', 'CommandTransferAccepted']);

export function useOrgCommit(): (input: OrgEventInput) => Promise<unknown> {
  const op = useOperation();
  const commit = useCommit();
  const getUid = useDeviceUid();
  const { identity } = useSession();
  return async (input: OrgEventInput) => {
    if (!op) return undefined;
    const by = await getUid();
    // A member's self/command events ride their ACCOUNT so the position follows them
    // across devices; `by` stays the per-device uid (provenance). Guests omit it.
    const account =
      identity.kind === 'member' && CARRIES_ACCOUNT.has(input.type)
        ? { account: { id: identity.accountId, label: identity.displayName } }
        : {};
    return commit({ ...input, ...account, id: newId(), opId: op.id, at: Date.now(), by } as FieldShoreEvent);
  };
}
