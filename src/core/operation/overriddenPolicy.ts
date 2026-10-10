import type { FieldShoreEvent } from '../schema';

// ADR-041 — which of this device's own no-effect events are worth telling the operator
// about ("Synced — N of your changes had no effect"). A lost race only matters when the
// device's INTENT did not land: a status move, a deploy/return, a command handshake, an
// org assignment, a point add/delete, a re-measure. Idempotent or last-write-wins
// bookkeeping that another device simply did first (a floor or saw added, a hazard
// mitigated, a checklist tick, a rename, a what3words/coords backfill) converges to the
// same board either way and must not nag.

const SIZING_PATCH_KEYS = [
  'measurementEighths',
  'deductions',
  'shoreType',
  'estimatedLoad',
  'division',
  'building',
  'area',
  'side',
] as const;

export function isTellWorthy(e: FieldShoreEvent): boolean {
  switch (e.type) {
    case 'ShorePointStatusChanged':
    case 'EquipmentDeployed':
    case 'EquipmentReturned':
    case 'EquipmentReclaimed':
    case 'ComponentResourced':
    case 'ShorePointAdded':
    case 'ShorePointDeleted':
    case 'ShorePointRestored':
    case 'CommandTransferInitiated':
    case 'CommandTransferAccepted':
    case 'CommandTransferDeclined':
    case 'CommandTransferCancelled':
    case 'ResourceAssigned':
    case 'ResourceCleared':
    case 'PositionAdded':
    case 'PositionRemoved':
    case 'OperationCreated':
    case 'OperationReopened':
    case 'OperationEnded':
      return true;
    case 'ShorePointEdited':
      // A re-measure or re-type that lost (the #220 lock case) is tell-worthy; a label,
      // crew, cut-done, coords or what3words patch is not.
      return SIZING_PATCH_KEYS.some((k) => e.patch[k] !== undefined);
    default:
      return false;
  }
}
