import { describe, it, expect } from 'vitest';
import type { OrgPositions, OrgResourceRef } from '@core/schema';
import { planDrop, dropActionText } from './planDrop';

// The drop planner (#422/#427/#428) — the event-choice logic, unit-tested without
// PointerEvents. Fixture: IC root → Shoring Group (led by Lt Kim) + an empty
// Ventilation Group + a single-resource card for Engine 4 (with one child).

const rig = (value: string, label = value): OrgResourceRef => ({ ref: 'apparatus', value, label });

const P: OrgPositions = {
  root: { id: 'root', title: 'Incident Commander', kind: 'command', parentId: null, builtIn: true, order: 0, assignedResources: [rig('bc1', 'Battalion 1')] },
  shoring: { id: 'shoring', title: 'Shoring Group', kind: 'group', parentId: 'root', builtIn: false, order: 1, assignedResources: [{ ref: 'individual', value: 'Lt Kim', label: 'Lt Kim' }] },
  vent: { id: 'vent', title: 'Ventilation Group', kind: 'group', parentId: 'root', builtIn: false, order: 2, assignedResources: [] },
  e4card: { id: 'e4card', title: 'Engine 4', kind: 'single-resource', parentId: 'root', builtIn: false, order: 3, assignedResources: [rig('e4', 'Engine 4')] },
  e4child: { id: 'e4child', title: 'Crew A', kind: 'single-resource', parentId: 'e4card', builtIn: false, order: 0, assignedResources: [] },
};

describe('dropActionText (#422 honest labels)', () => {
  it('an EMPTY seat reads Supervisor of X (append lands leader at index 0)', () => {
    expect(dropActionText({ type: 'lead', id: 'vent' }, P)).toBe('Supervisor of Ventilation Group');
  });
  it('a STAFFED seat reads Add to X\'s staff — never a false Supervisor promise', () => {
    expect(dropActionText({ type: 'lead', id: 'shoring' }, P)).toBe("Add to Shoring Group's staff");
  });
  it('child + gap labels unchanged', () => {
    expect(dropActionText({ type: 'child', id: 'shoring' }, P)).toBe('Subordinate of Shoring Group');
    expect(dropActionText({ type: 'gap', parentId: 'root', index: 0 }, P)).toBe('Reorder');
    expect(dropActionText(null, P)).toBe('Drag onto a card…');
  });
});

describe('planDrop — chip drops move the rig (#428)', () => {
  it('a lead-drop assigns to the target and CLEARS the old command home', () => {
    const plan = planDrop({ type: 'lead', id: 'vent' }, { kind: 'chip', resource: rig('e4', 'Engine 4') }, P)!;
    expect(plan.confirm).toBeUndefined();
    expect(plan.events).toEqual([
      { type: 'ResourceAssigned', positionId: 'vent', resource: rig('e4', 'Engine 4') },
      { type: 'ResourceCleared', positionId: 'e4card', resource: rig('e4', 'Engine 4') }, // the old home
    ]);
  });

  it('a chip with NO prior home emits no clears', () => {
    const plan = planDrop({ type: 'lead', id: 'vent' }, { kind: 'chip', resource: rig('l3', 'Ladder 3') }, P)!;
    expect(plan.events).toEqual([{ type: 'ResourceAssigned', positionId: 'vent', resource: rig('l3', 'Ladder 3') }]);
  });

  it('a lead-drop on the resource\'s OWN position never clears the target it just joined', () => {
    const plan = planDrop({ type: 'lead', id: 'e4card' }, { kind: 'chip', resource: rig('e4', 'Engine 4') }, P)!;
    expect(plan.events.filter((e) => e.type === 'ResourceCleared')).toHaveLength(0);
  });

  it('a child-drop mints the new node, assigns, then clears the old home', () => {
    const plan = planDrop({ type: 'child', id: 'shoring' }, { kind: 'chip', resource: rig('e4', 'Engine 4') }, P)!;
    expect(plan.events.map((e) => e.type)).toEqual(['PositionAdded', 'ResourceAssigned', 'ResourceCleared']);
    const cleared = plan.events[2] as { positionId: string };
    expect(cleared.positionId).toBe('e4card');
  });
});

describe('planDrop — node lead-drops confirm before removing (#427)', () => {
  it('a single-resource card merge returns confirm + the assign/remove events', () => {
    const plan = planDrop({ type: 'lead', id: 'shoring' }, { kind: 'node', id: 'e4card' }, P)!;
    expect(plan.confirm).toEqual({
      sourceId: 'e4card',
      sourceTitle: 'Engine 4',
      targetTitle: 'Shoring Group',
      resourceLabel: 'Engine 4',
      hasSubtree: true, // Crew A hangs under it — the cascade the confirm warns about
    });
    expect(plan.events).toEqual([
      { type: 'ResourceAssigned', positionId: 'shoring', resource: rig('e4', 'Engine 4') },
      { type: 'PositionRemoved', positionId: 'e4card' },
    ]);
  });

  it('a childless card still confirms, with hasSubtree false', () => {
    const noKids: OrgPositions = { ...P, e4child: { ...P.e4child!, parentId: 'root' } };
    const plan = planDrop({ type: 'lead', id: 'vent' }, { kind: 'node', id: 'e4card' }, noKids)!;
    expect(plan.confirm?.hasSubtree).toBe(false);
  });

  it('a BUILT-IN card falls back to a child-drop (no removal, no confirm)', () => {
    const withBuiltIn: OrgPositions = {
      ...P,
      safety: { id: 'safety', title: 'Safety Officer', kind: 'single-resource', parentId: 'root', builtIn: true, order: 4, assignedResources: [rig('s1', 'Safety 1')] },
    };
    const plan = planDrop({ type: 'lead', id: 'shoring' }, { kind: 'node', id: 'safety' }, withBuiltIn)!;
    expect(plan.confirm).toBeUndefined();
    expect(plan.events.map((e) => e.type)).toEqual(['PositionReparented', 'PositionReordered']);
  });
});

describe('planDrop — reorder + reparent unchanged', () => {
  it('a gap drop reparents (when the parent changes) then reorders', () => {
    const plan = planDrop({ type: 'gap', parentId: 'shoring', index: 0 }, { kind: 'node', id: 'vent' }, P)!;
    expect(plan.events.map((e) => e.type)).toEqual(['PositionReparented', 'PositionReordered']);
  });
  it('a same-parent gap drop only reorders', () => {
    const plan = planDrop({ type: 'gap', parentId: 'root', index: 0 }, { kind: 'node', id: 'vent' }, P)!;
    expect(plan.events.map((e) => e.type)).toEqual(['PositionReordered']);
  });
  it('a chip can never gap-drop', () => {
    expect(planDrop({ type: 'gap', parentId: 'root', index: 0 }, { kind: 'chip', resource: rig('e4') }, P)).toBeNull();
  });
  it('a node child-drop reparents + reorders', () => {
    const plan = planDrop({ type: 'child', id: 'shoring' }, { kind: 'node', id: 'vent' }, P)!;
    expect(plan.events.map((e) => e.type)).toEqual(['PositionReparented', 'PositionReordered']);
  });
});
