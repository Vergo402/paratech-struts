import type { OrgPositions } from '@core/schema';
import { childrenOf, leaderOf, nextChildOrder, orderForSlot, positionsForResource } from '@core/org';
import { newId } from '@core/id';
import type { OrgEventInput } from './useOrgCommit';
import type { DragSource, DropTarget } from './useOrgDragDrop';

// The drop planner — ONE pure function that decides which core events a drag
// commits (pre-Phase-J audit #422/#427/#428 hardening). Extracted from the
// hook's commitDrop so the event-choice logic is unit-testable without
// PointerEvents, and so a destructive plan can be parked behind a confirm
// instead of committing on pointerup.
//
//   #422 — the ghost labels are honest (see dropActionText): a top-half drop on
//     an EMPTY seat makes the resource the supervisor (append lands at index 0 =
//     leader); on a STAFFED seat it reads "Add to X's staff" and appends. Same
//     events either way — the deception was the label, not the append.
//   #427 — a single-resource CARD dropped on a lead zone merges into the target
//     and REMOVES the source position (subtree cascade). That destructive step
//     now returns `confirm` for the chart to gate behind a Modal (ADR-016).
//   #428 — a roster-chip drop is a MOVE: the rig's other command homes are
//     cleared (ResourceCleared per old home) after the new assignment lands, so
//     one apparatus can never sit under two positions.

export interface DropConfirm {
  sourceId: string;
  sourceTitle: string;
  targetTitle: string;
  resourceLabel: string;
  hasSubtree: boolean;
}

export interface DropPlan {
  events: OrgEventInput[];
  /** Present when the plan removes the source position — commit only after the
   *  user confirms (the chart renders the destructive Modal). */
  confirm?: DropConfirm;
}

export function planDrop(target: DropTarget, source: DragSource, positions: OrgPositions): DropPlan | null {
  if (target.type === 'gap') {
    if (source.kind !== 'node') return null;
    const events: OrgEventInput[] = [];
    const order = orderForSlot(positions, target.parentId, target.index, source.id);
    if (positions[source.id]?.parentId !== target.parentId) {
      events.push({ type: 'PositionReparented', positionId: source.id, newParentId: target.parentId });
    }
    events.push({ type: 'PositionReordered', positionId: source.id, order });
    return { events };
  }

  if (target.type === 'lead') {
    if (source.kind === 'chip') {
      // Assign first, then clear the old homes (#428) — the rig is never home-less.
      const events: OrgEventInput[] = [{ type: 'ResourceAssigned', positionId: target.id, resource: source.resource }];
      for (const old of positionsForResource(positions, source.resource)) {
        if (old.id === target.id) continue;
        events.push({ type: 'ResourceCleared', positionId: old.id, resource: source.resource });
      }
      return { events };
    }
    const node = positions[source.id];
    if (!node) return null;
    if (node.builtIn) {
      // Protected built-in can't be removed — fall back to a child-drop.
      return {
        events: [
          { type: 'PositionReparented', positionId: source.id, newParentId: target.id },
          { type: 'PositionReordered', positionId: source.id, order: nextChildOrder(positions, target.id) },
        ],
      };
    }
    // Merge: move the card's resources onto the target, then remove the now-empty
    // card. Removal cascades to the card's whole subtree — confirm first (#427).
    const resources = node.assignedResources.length ? node.assignedResources : leaderOf(node) ? [leaderOf(node)!] : [];
    const events: OrgEventInput[] = resources.map((r) => ({
      type: 'ResourceAssigned' as const,
      positionId: target.id,
      resource: r,
    }));
    events.push({ type: 'PositionRemoved', positionId: source.id });
    return {
      events,
      confirm: {
        sourceId: source.id,
        sourceTitle: node.title,
        targetTitle: positions[target.id]?.title ?? '',
        resourceLabel: leaderOf(node)?.label ?? node.title,
        hasSubtree: childrenOf(positions, source.id).length > 0,
      },
    };
  }

  // child drop
  if (source.kind === 'chip') {
    const id = newId();
    const events: OrgEventInput[] = [
      {
        type: 'PositionAdded',
        position: {
          id,
          title: source.resource.label,
          kind: 'single-resource',
          parentId: target.id,
          builtIn: false,
          order: nextChildOrder(positions, target.id),
          assignedResources: [],
        },
      },
      { type: 'ResourceAssigned', positionId: id, resource: source.resource },
    ];
    for (const old of positionsForResource(positions, source.resource)) {
      events.push({ type: 'ResourceCleared', positionId: old.id, resource: source.resource }); // #428
    }
    return { events };
  }
  return {
    events: [
      { type: 'PositionReparented', positionId: source.id, newParentId: target.id },
      { type: 'PositionReordered', positionId: source.id, order: nextChildOrder(positions, target.id) },
    ],
  };
}

/** The ghost's action line — honest about what the drop will do (#422). */
export function dropActionText(target: DropTarget | null, positions: OrgPositions): string {
  if (!target) return 'Drag onto a card…';
  if (target.type === 'gap') return 'Reorder';
  const title = positions[target.id]?.title ?? '';
  if (target.type === 'lead') {
    const occupied = (positions[target.id]?.assignedResources.length ?? 0) > 0;
    return occupied ? `Add to ${title}'s staff` : `Supervisor of ${title}`;
  }
  return `Subordinate of ${title}`;
}
