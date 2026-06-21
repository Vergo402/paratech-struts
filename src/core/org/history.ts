import type { FieldShoreEvent } from '../schema/event';
import { defaultPositionId } from './defaultTree';

// Role history is FREE (ADR-009): it IS the event log filtered by opId + the org-
// domain event types — no second audit path (the readShorePointHistory pattern).
// This pure filter is what the store's readRoleHistory + useRoleHistory read.

const ORG_EVENT_TYPES: ReadonlySet<FieldShoreEvent['type']> = new Set([
  'PositionAdded',
  'PositionRemoved',
  'PositionRenamed',
  'PositionReparented',
  'PositionReordered',
  'ResourceAssigned',
  'ResourceCleared',
  'MyRoleSet',
  'CommandTransferInitiated',
  'CommandTransferAccepted',
  'CommandTransferDeclined',
  'CommandTransferCancelled',
]);

export function isOrgEvent(e: FieldShoreEvent): boolean {
  return ORG_EVENT_TYPES.has(e.type);
}

// Does an org event name `positionId`? Command-transfer events carry no positionId —
// they are the IC node's history, so they count only when `positionId` IS the IC node
// (deterministic id from the opId). A reparent counts for both the moved node and its
// new parent (a child arriving under me is part of my history).
function namesPosition(e: FieldShoreEvent, positionId: string, icId: string): boolean {
  switch (e.type) {
    case 'PositionAdded':
      return e.position.id === positionId;
    case 'PositionRemoved':
    case 'PositionRenamed':
    case 'PositionReordered':
    case 'ResourceAssigned':
    case 'ResourceCleared':
    case 'MyRoleSet':
      return e.positionId === positionId;
    case 'PositionReparented':
      return e.positionId === positionId || e.newParentId === positionId;
    case 'CommandTransferInitiated':
    case 'CommandTransferAccepted':
    case 'CommandTransferDeclined':
    case 'CommandTransferCancelled':
      return positionId === icId;
    default:
      return false;
  }
}

/**
 * Org-domain events for one operation, in append (chronological) order. Omit
 * `positionId` for the whole command/org timeline (the transfer screen + the
 * op-wide role history); pass one for a single node's history (the node sheet /
 * role-history drawer). Command transfers belong to the IC node. Pure — the store
 * passes db.events.toArray() (already seq/append order, so no sort here).
 */
export function roleHistory(
  events: readonly FieldShoreEvent[],
  opId: string,
  positionId?: string,
): FieldShoreEvent[] {
  const icId = defaultPositionId(opId, 'ic');
  return events.filter(
    (e) => e.opId === opId && isOrgEvent(e) && (positionId == null || namesPosition(e, positionId, icId)),
  );
}
