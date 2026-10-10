import type { FieldShoreEvent, OrgPositions, ShorePoint } from '@core/schema';
import { STATUS_LABELS } from '@core/shorepoint';
import { currentIC } from '@core/org';
import { describeEventLog, spLabelFromPoint } from './describe';

// core/audit — the sync line's drill-in (#499). Pure presentation of THIS device's own
// changes that lost a race (the store's `overridden` list): per lost event a bold
// "<thing> — now <state>" title, one plain line saying what had no effect and (when it is
// cheap to say) who got there first, and the time + who of the winning change. Derived from
// the event type + the CURRENT projected state, never stored. Voice: present tense, sentence
// case, em-dash qualifier.

export type Outcome = 'applied' | 'no-effect';

export interface OverriddenRow {
  id: string;
  title: string;
  line: string;
  /** epoch ms of the change shown in the meta line — the winning peer change when known, else the lost one. */
  at: number;
  /** 'another device' when `at` is the winning peer change, else 'this device'. */
  who: 'another device' | 'this device';
}

export interface OverriddenCtx {
  shorePoints: readonly ShorePoint[];
  positions: OrgPositions;
  /** The canonical event log (any order), used only to find what won. */
  events: readonly FieldShoreEvent[];
  outcomes: ReadonlyMap<string, Outcome>;
}

const WHO = 'Another device';

function icLabel(positions: OrgPositions): string {
  const ic = currentIC(positions);
  return ic ? ic.label || ic.value : 'unassigned';
}

/** The latest APPLIED peer change that explains a lost one, or undefined. */
function winnerFor(lost: FieldShoreEvent, ctx: OverriddenCtx): FieldShoreEvent | undefined {
  const sameTarget = (e: FieldShoreEvent): boolean => {
    switch (lost.type) {
      case 'ShorePointStatusChanged':
      case 'EquipmentDeployed':
      case 'EquipmentReturned':
        return (
          (e.type === 'ShorePointStatusChanged' || e.type === 'EquipmentDeployed' || e.type === 'EquipmentReturned') &&
          e.spId === lost.spId
        );
      case 'CommandTransferAccepted':
      case 'CommandTransferDeclined':
      case 'CommandTransferCancelled':
        return e.type.startsWith('CommandTransfer') && e.type !== 'CommandTransferInitiated';
      default:
        return false;
    }
  };
  let best: FieldShoreEvent | undefined;
  for (const e of ctx.events) {
    if (e.id === lost.id || e.by === lost.by || ctx.outcomes.get(e.id) !== 'applied' || !sameTarget(e)) continue;
    if (!best || e.at >= best.at) best = e;
  }
  return best;
}

function winnerLine(w: FieldShoreEvent, ctx: OverriddenCtx): string {
  switch (w.type) {
    case 'ShorePointStatusChanged':
      return `${WHO} moved it to ${STATUS_LABELS[w.to]} while you were offline.`;
    case 'EquipmentDeployed':
      return `${WHO} deployed equipment while you were offline.`;
    case 'EquipmentReturned':
      return `${WHO} returned equipment to inventory while you were offline.`;
    case 'CommandTransferAccepted':
      return `${icLabel(ctx.positions)} accepted command while you were offline.`;
    case 'CommandTransferDeclined':
      return `${WHO} declined the command transfer while you were offline.`;
    case 'CommandTransferCancelled':
      return `${WHO} cancelled the command transfer while you were offline.`;
    default:
      return '';
  }
}

function yours(e: FieldShoreEvent): string {
  switch (e.type) {
    case 'ShorePointStatusChanged':
      return `Your ${STATUS_LABELS[e.to]} had no effect.`;
    case 'EquipmentDeployed':
      return 'Your deploy had no effect.';
    case 'EquipmentReturned':
      return 'Your return had no effect.';
    case 'CommandTransferCancelled':
      return 'Your cancel had no effect.';
    case 'CommandTransferDeclined':
      return 'Your decline had no effect.';
    case 'CommandTransferAccepted':
      return 'Your accept had no effect.';
    default:
      return 'Your change had no effect.';
  }
}

function titleFor(e: FieldShoreEvent, ctx: OverriddenCtx): string {
  switch (e.type) {
    case 'ShorePointStatusChanged':
    case 'EquipmentDeployed':
    case 'EquipmentReturned': {
      const sp = ctx.shorePoints.find((p) => p.id === e.spId);
      if (!sp) return 'Shore point — no longer on the board';
      // Name the point the way its Quick View header does ("#1 · Alpha"); fall back to the
      // audit-log label when it has no name.
      const name = sp.label?.trim();
      const who = name && sp.seq ? `#${sp.seq} · ${name}` : name || spLabelFromPoint(sp);
      return `${who} — now ${STATUS_LABELS[sp.status]}`;
    }
    case 'CommandTransferAccepted':
    case 'CommandTransferDeclined':
    case 'CommandTransferCancelled':
      return `Incident Commander — ${icLabel(ctx.positions)}`;
    default:
      return describeEventLog([e], e.opId)[0]?.text ?? 'Change';
  }
}

/** One row per lost event, newest first. */
export function describeOverridden(lost: readonly FieldShoreEvent[], ctx: OverriddenCtx): OverriddenRow[] {
  return lost
    .map((e): OverriddenRow => {
      const w = winnerFor(e, ctx);
      const peer = w ? winnerLine(w, ctx) : '';
      return {
        id: e.id,
        title: titleFor(e, ctx),
        line: peer ? `${yours(e)} ${peer}` : yours(e),
        at: w ? w.at : e.at,
        who: w ? 'another device' : 'this device',
      };
    })
    .reverse();
}
