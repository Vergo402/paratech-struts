import type { FieldShoreEvent, ShorePoint, DeployedBom, OrgResourceRef } from '@core/schema';
import { STATUS_LABELS } from '@core/shorepoint';
import { divisionLabel } from '@core/operation';
import { buildDefaultTree } from '@core/org';

// core/audit — pure presentation of the two append-only trails the Audit Log reads
// (#211): the operations EVENT log (Incident view) and the governance AUDIT node
// (Administrative view). No React, no data layer — fed the raw rows, returns display
// rows. Each event/entry carries only `by` (the per-device uid) + `at`; role-at-time
// is NOT persisted on events (event.ts), so attribution is best-effort current
// resolution at the UI, never fabricated here.

export type AuditTone = 'info' | 'good' | 'warn' | 'danger' | 'accent' | 'neutral';

export interface AuditRow {
  id: string;
  at: number; //      epoch ms
  by: string; //      the acting device uid (compared to the viewer's uid for "You")
  actor?: string; //  best-effort display name: a device's roster label (Incident) or
  //                  the denormalized admin name (Administrative); undefined → degrade
  badge: string; //   short action-type label, e.g. "Status"
  tone: AuditTone;
  text: string; //    the one-line action
  detail?: string; // optional second line, shown when the row is expanded
}

// The governance audit entry written by departmentService.appendAudit — a coarse,
// non-Zod shape (rules validate only id/type/at/by; the rest is denormalized detail).
export interface AuditEntry {
  id: string;
  type: string;
  at: number;
  by: string;
  actor?: string; //     the acting admin's display name (denormalized at write)
  targetUid?: string;
  roleId?: string;
  roleName?: string;
  reassigned?: number;
}

// ---- shared label resolution (built from the event list itself) ----------------

function spLabelFromPoint(sp: ShorePoint): string {
  const grp = sp.groupIndex && sp.groupTotal ? ` (${sp.groupIndex}/${sp.groupTotal})` : '';
  if (sp.seq) return `Shore point ${sp.seq}${grp}`;
  const loc = [sp.building, divisionLabel(sp.division), sp.area].filter(Boolean).join(' ');
  return (sp.label?.trim() || loc || 'a shore point') + grp;
}

function resName(r: OrgResourceRef): string {
  return r.label || r.value;
}

function bomSummary(bom: DeployedBom): string {
  const n = { strut: 0, plate: 0, extension: 0 };
  for (const c of bom) {
    if (c.role === 'strut') n.strut++;
    else if (c.role === 'extension') n.extension++;
    else n.plate++;
  }
  const parts: string[] = [];
  if (n.strut) parts.push(`${n.strut} strut${n.strut === 1 ? '' : 's'}`);
  if (n.plate) parts.push(`${n.plate} plate${n.plate === 1 ? '' : 's'}`);
  if (n.extension) parts.push(`${n.extension} extension${n.extension === 1 ? '' : 's'}`);
  return parts.join(', ');
}

interface Ctx {
  sp: (id: string) => string;
  pos: (id: string) => string;
  haz: (id: string) => string;
  who: (uid: string) => string | undefined;
}

function buildCtx(events: FieldShoreEvent[], opId: string): Ctx {
  const sp = new Map<string, string>();
  const pos = new Map<string, string>();
  const haz = new Map<string, string>();
  const who = new Map<string, string>(); // device uid → its roster label (best-effort actor)
  // Seed the default ICS tree titles (deterministic, no migration) so events that
  // reference a seeded node (never re-added) still resolve to a spelled-out title.
  for (const p of Object.values(buildDefaultTree(opId))) pos.set(p.id, p.title);
  for (const e of events) {
    if (e.type === 'ShorePointAdded') sp.set(e.shorePoint.id, spLabelFromPoint(e.shorePoint));
    else if (e.type === 'PositionAdded') pos.set(e.position.id, e.position.title);
    else if (e.type === 'PositionRenamed') pos.set(e.positionId, e.title);
    else if (e.type === 'HazardLogged') haz.set(e.hazard.id, e.hazard.location);
    // A device that was assigned to a position carries a roster label — the only
    // name an event log holds for `by` (events store no actor name; role-at-time
    // isn't persisted). Last assignment wins.
    else if (e.type === 'ResourceAssigned' && e.resource.ref === 'device') who.set(e.resource.value, e.resource.label);
  }
  return {
    sp: (id) => sp.get(id) ?? 'a shore point',
    pos: (id) => pos.get(id) ?? 'a position',
    haz: (id) => haz.get(id) ?? 'a hazard',
    who: (uid) => who.get(uid),
  };
}

type Described = Pick<AuditRow, 'badge' | 'tone' | 'text' | 'detail'>;

// One event → its display row. Exhaustive over the FieldShoreEvent union; the
// `default` is a typed-`never` backstop so a new event type fails the build here.
function describeOne(e: FieldShoreEvent, c: Ctx): Described {
  switch (e.type) {
    case 'OperationCreated':
      return { badge: 'Operation', tone: 'neutral', text: `Operation “${e.name}” started` };
    case 'OperationEdited':
      return { badge: 'Operation', tone: 'neutral', text: 'Operation details updated' };
    case 'OperationEnded':
      return { badge: 'Operation', tone: 'neutral', text: 'Operation ended' };
    case 'OperationReopened':
      return { badge: 'Operation', tone: 'neutral', text: 'Operation re-opened' };
    case 'DivisionAdded':
      return { badge: 'Structure', tone: 'neutral', text: `Division added: ${divisionLabel(String(e.division))}` };
    case 'SawAdded':
      return { badge: 'Cutting', tone: 'info', text: `Saw ${e.sawId} added to the Cutting Station` };
    case 'ShorePointAdded':
      return {
        badge: 'Shore point',
        tone: 'neutral',
        text: `${c.sp(e.shorePoint.id)} added`,
        detail: [e.shorePoint.shoreType, [e.shorePoint.building, divisionLabel(e.shorePoint.division), e.shorePoint.area].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
      };
    case 'ShorePointEdited':
      return { badge: 'Shore point', tone: 'neutral', text: `${c.sp(e.spId)} edited`, detail: Object.keys(e.patch).join(', ') || undefined };
    case 'ShorePointDeleted':
      return { badge: 'Shore point', tone: 'neutral', text: `${c.sp(e.spId)} ${e.hard ? 'removed' : 'deleted'}` };
    case 'ShorePointRestored':
      return { badge: 'Shore point', tone: 'neutral', text: `${c.sp(e.spId)} restored` };
    case 'ShorePointStatusChanged':
      return {
        badge: 'Status',
        tone: 'info',
        text: `${c.sp(e.spId)} → ${STATUS_LABELS[e.to]}`,
        detail: `from ${STATUS_LABELS[e.from]}`,
      };
    case 'CuttingClaimed':
      return { badge: 'Cutting', tone: 'info', text: `Saw ${e.sawId} claimed the cut on ${c.sp(e.spId)}` };
    case 'StrutDeployed':
      return { badge: 'Equipment', tone: 'good', text: `Strut deployed to ${c.sp(e.spId)}` };
    case 'StrutReturned':
      return { badge: 'Equipment', tone: 'good', text: `Strut returned from ${c.sp(e.spId)}` };
    case 'EquipmentDeployed':
      return { badge: 'Equipment', tone: 'good', text: `Equipment deployed to ${c.sp(e.spId)}`, detail: bomSummary(e.deployedBom) || undefined };
    case 'EquipmentReturned':
      return { badge: 'Equipment', tone: 'good', text: `Equipment returned from ${c.sp(e.spId)}` };
    case 'EquipmentReclaimed':
      return { badge: 'Equipment', tone: 'good', text: `Equipment returned (final) from ${c.sp(e.spId)}` };
    case 'ComponentResourced':
      return { badge: 'Equipment', tone: 'good', text: `Re-sourced a component on ${c.sp(e.spId)}`, detail: `now from ${e.source}` };
    case 'PositionAdded':
      return { badge: 'Org', tone: 'warn', text: `Position added: ${e.position.title}` };
    case 'PositionRemoved':
      return { badge: 'Org', tone: 'warn', text: `Position removed: ${c.pos(e.positionId)}` };
    case 'PositionRenamed':
      return { badge: 'Org', tone: 'warn', text: `Position renamed to “${e.title}”` };
    case 'PositionReparented':
      return { badge: 'Org', tone: 'warn', text: `${c.pos(e.positionId)} moved under ${c.pos(e.newParentId)}` };
    case 'PositionReordered':
      return { badge: 'Org', tone: 'warn', text: `${c.pos(e.positionId)} reordered` };
    case 'ResourceAssigned':
      return { badge: 'Org', tone: 'warn', text: `${resName(e.resource)} assigned to ${c.pos(e.positionId)}` };
    case 'ResourceCleared':
      return {
        badge: 'Org',
        tone: 'warn',
        text: e.resource ? `${resName(e.resource)} cleared from ${c.pos(e.positionId)}` : `Assignments cleared from ${c.pos(e.positionId)}`,
      };
    case 'MyRoleSet':
      return { badge: 'Org', tone: 'warn', text: e.positionId ? `Set own ICS position: ${c.pos(e.positionId)}` : 'Cleared own ICS position' };
    case 'CommandTransferInitiated':
      return { badge: 'Command', tone: 'accent', text: `Command transfer initiated → ${resName(e.toResource)}` };
    case 'CommandTransferAccepted':
      return { badge: 'Command', tone: 'accent', text: 'Command transfer accepted' };
    case 'CommandTransferDeclined':
      return { badge: 'Command', tone: 'accent', text: 'Command transfer declined' };
    case 'CommandTransferCancelled':
      return { badge: 'Command', tone: 'accent', text: 'Command transfer cancelled' };
    case 'HazardLogged':
      return {
        badge: 'Hazard',
        tone: 'danger',
        text: `Hazard logged: ${e.hazard.location}`,
        detail: `${e.hazard.type} · ${e.hazard.severity}${e.hazard.notes ? ` · ${e.hazard.notes}` : ''}`,
      };
    case 'HazardMitigated':
      return { badge: 'Hazard', tone: 'danger', text: `Hazard mitigated: ${c.haz(e.hazardId)}` };
    case 'HazardReopened':
      return { badge: 'Hazard', tone: 'danger', text: `Hazard reopened: ${c.haz(e.hazardId)}` };
    case 'ChecklistItemChecked':
      return { badge: 'Checklist', tone: 'info', text: 'Checklist item attested', detail: e.role || undefined };
    case 'ChecklistItemUnchecked':
      return { badge: 'Checklist', tone: 'info', text: 'Checklist item un-attested', detail: e.role || undefined };
    case 'BriefingStarted':
      return { badge: 'Checklist', tone: 'info', text: 'Briefing started' };
    case 'BriefingEnded':
      return { badge: 'Checklist', tone: 'info', text: 'Briefing ended' };
    default: {
      const _exhaustive: never = e;
      void _exhaustive;
      return { badge: 'Event', tone: 'neutral', text: 'Logged event' };
    }
  }
}

/** The Incident view rows for ONE operation's event log, in the given (append) order. */
export function describeEventLog(events: FieldShoreEvent[], opId: string): AuditRow[] {
  const c = buildCtx(events, opId);
  return events.map((e) => ({ id: e.id, at: e.at, by: e.by, actor: c.who(e.by), ...describeOne(e, c) }));
}

// ---- governance (Administrative view) ------------------------------------------

export interface AuditNames {
  /** uid → display name (from the members map); degrades to "a member". */
  member?: (uid: string) => string | undefined;
  /** roleId → name (from the roles map); degrades to the stored roleName / id. */
  role?: (roleId: string) => string | undefined;
}

function describeEntry(e: AuditEntry, names?: AuditNames): Described {
  const member = (uid?: string) => (uid ? names?.member?.(uid) ?? 'a member' : 'a member');
  const role = (id?: string, name?: string) => name ?? (id ? names?.role?.(id) ?? id : 'a role');
  switch (e.type) {
    case 'roleAssigned':
      return { badge: 'Member', tone: 'neutral', text: `${member(e.targetUid)} assigned role: ${role(e.roleId, e.roleName)}` };
    case 'memberRevoked':
      return { badge: 'Member', tone: 'danger', text: `${member(e.targetUid)} — access revoked` };
    case 'memberReactivated':
      return { badge: 'Member', tone: 'good', text: `${member(e.targetUid)} — access restored` };
    case 'roleCreated':
      return { badge: 'Role', tone: 'accent', text: `Role “${role(e.roleId, e.roleName)}” created` };
    case 'roleEdited':
      return { badge: 'Role', tone: 'accent', text: `Role “${role(e.roleId, e.roleName)}” updated` };
    case 'roleDeleted':
      return {
        badge: 'Role',
        tone: 'neutral',
        text: `Role deleted${e.reassigned ? ` (${e.reassigned} reassigned to Default)` : ''}`,
      };
    default:
      return { badge: 'Admin', tone: 'neutral', text: `Governance action: ${e.type}` };
  }
}

/** The Administrative view rows for the department's governance audit trail. */
export function describeAuditLog(entries: AuditEntry[], names?: AuditNames): AuditRow[] {
  return entries.map((e) => ({ id: e.id, at: e.at, by: e.by, actor: e.actor, ...describeEntry(e, names) }));
}
