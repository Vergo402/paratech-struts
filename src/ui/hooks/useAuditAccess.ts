import { isCommanderOf } from '@core/org';
import { useOperation } from './useOperation';
import { useOrg } from './useOrg';
import { useMyRole } from './useMyRoles';
import { useDeviceUidValue } from './useDeviceUidValue';
import { usePastOperations, useArchivedOperation } from './usePastOperations';
import { usePermissions } from './usePermissions';

// The Audit Log access resolver (#211/#217) — the single source for "which views can
// this user see, and over which operation." Both the Settings gateway (show the link?)
// and the screen (which tabs + which op's log) read it, so the two never diverge.
//
// Target op = the ACTIVE operation if there is one, else the most-recently-ended one
// (the after-action read). The Incident gate is computed over THAT op's org — live for
// the active op, projected for an archived one — so an ex-IC/Operations can still read a
// just-ended incident's log (isCommanderOf, a client gate; the event log is member-
// readable regardless). The Administrative gate is the manageUsers permission.

export interface AuditAccess {
  opId: string | null;
  opName: string | null;
  canIncident: boolean;
  canAdministrative: boolean;
  loading: boolean;
}

export function useAuditAccess(): AuditAccess {
  const uid = useDeviceUidValue();
  const liveOp = useOperation();
  const liveOrg = useOrg();
  const liveMine = useMyRole(uid);
  const past = usePastOperations();
  const perms = usePermissions();

  const isLive = liveOp != null;
  const archivedOpId = !isLive ? (past.data?.[0]?.id ?? null) : null;
  const archived = useArchivedOperation(archivedOpId); // self-disables when null

  const opId = isLive ? liveOp.id : archivedOpId;
  const opName = isLive ? liveOp.name : (past.data?.[0]?.name ?? null);

  let canIncident = false;
  if (opId && uid) {
    canIncident = isLive
      ? isCommanderOf(liveOrg, liveMine ?? null, opId, uid)
      : archived.data
        ? isCommanderOf(archived.data.positions, archived.data.myRoles[uid] ?? null, opId, uid)
        : false;
  }

  const loading = (!isLive && past.isLoading) || (archivedOpId != null && archived.isLoading);

  return { opId, opName, canIncident, canAdministrative: perms.manageUsers, loading };
}
