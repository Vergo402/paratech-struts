import type { OrgPosition, OrgPositions } from '../schema/org';

// The seeded default chart (ADR-008): the functional two-Group structure a Level
// IV–V structural collapse runs out of the box. Search/Medical Group Supervisors
// are Level III+ add-ons from the library, NOT seeded. Cutting Station is a
// workstation card under Operations, not a command box.
export const DEFAULT_POSITION_KEYS = [
  'ic',
  'safety',
  'ops',
  'rescue',
  'shoring',
  'staging',
  'cutting',
] as const;
export type DefaultPositionKey = (typeof DEFAULT_POSITION_KEYS)[number];

// DETERMINISTIC ids derived from the opId — NOT randomUUID. Two devices folding the
// same OperationCreated must seed IDENTICAL ids, or a concurrent assign to "the
// Shoring Group" would target different nodes. This is the load-bearing rule of the
// whole no-migration seed (mirrors divisions:[1] but with stable references).
export function defaultPositionId(opId: string, key: DefaultPositionKey): string {
  return `${opId}:pos-${key}`;
}

export function buildDefaultTree(opId: string): OrgPositions {
  const id = (k: DefaultPositionKey) => defaultPositionId(opId, k);
  const list: OrgPosition[] = [
    { id: id('ic'), title: 'Incident Commander', kind: 'command', parentId: null, builtIn: true, order: 0, assignedResources: [] },
    { id: id('safety'), title: 'Safety Officer', kind: 'command-staff', parentId: id('ic'), builtIn: true, order: 0, assignedResources: [] },
    { id: id('ops'), title: 'Operations Section Chief', kind: 'section', parentId: id('ic'), builtIn: true, order: 1, assignedResources: [] },
    { id: id('rescue'), title: 'Rescue Group Supervisor', kind: 'group', parentId: id('ops'), builtIn: true, order: 0, assignedResources: [] },
    { id: id('shoring'), title: 'Shoring Group Supervisor', kind: 'group', parentId: id('ops'), builtIn: true, order: 1, assignedResources: [] },
    { id: id('staging'), title: 'Staging Area Manager', kind: 'staging', parentId: id('ops'), builtIn: true, order: 2, assignedResources: [] },
    { id: id('cutting'), title: 'Cutting Station', kind: 'workstation', parentId: id('ops'), builtIn: true, order: 3, assignedResources: [] },
  ];
  return Object.fromEntries(list.map((p) => [p.id, p]));
}
