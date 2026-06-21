import type { OrgPositionKind } from '../schema/org';

// The position library — the catalog the IC adds from to GROW the chart (Type V→I,
// USAR structural collapse). Each item knows which parent `kind`s it may attach
// under (`addableUnder`), which keeps the tree NIMS-sane (no Section under a Group)
// while the free-form "Custom position" escape hatch allows anything. Title law
// (NIMS 2017 Table 2): Chief = Section · Director = Branch · Supervisor = Division/
// Group · Leader = Unit/Strike-Team/Task-Force; "Sector" is pre-NIMS, never used.
export interface LibraryPosition {
  key: string;
  title: string;
  kind: OrgPositionKind;
  addableUnder: OrgPositionKind[];
  group: string; // catalog section header in the Add-position sheet
}

export const POSITION_LIBRARY: readonly LibraryPosition[] = [
  // Command Staff — advise the IC, no reports, EXCLUDED from the IC's span.
  { key: 'pio', title: 'Public Information Officer', kind: 'command-staff', addableUnder: ['command'], group: 'Command staff' },
  { key: 'liaison', title: 'Liaison Officer', kind: 'command-staff', addableUnder: ['command'], group: 'Command staff' },
  { key: 'asst-safety', title: 'Assistant Safety Officer', kind: 'command-staff', addableUnder: ['command'], group: 'Command staff' },

  // Command — deputy holds full IC authority when the IC is unavailable.
  { key: 'deputy-ic', title: 'Deputy Incident Commander', kind: 'command', addableUnder: ['command'], group: 'Command' },

  // General Staff — Section Chiefs report to the IC.
  { key: 'planning', title: 'Planning Section Chief', kind: 'section', addableUnder: ['command'], group: 'General staff' },
  { key: 'logistics', title: 'Logistics Section Chief', kind: 'section', addableUnder: ['command'], group: 'General staff' },
  { key: 'finance', title: 'Finance and Administration Section Chief', kind: 'section', addableUnder: ['command'], group: 'General staff' },

  // Operations sub-structure.
  { key: 'branch', title: 'Branch Director', kind: 'branch', addableUnder: ['section'], group: 'Operations' },
  { key: 'division', title: 'Division Supervisor', kind: 'division', addableUnder: ['section', 'branch'], group: 'Operations' },
  { key: 'rescue-group', title: 'Rescue Group Supervisor', kind: 'group', addableUnder: ['section', 'branch', 'division'], group: 'Operations' },
  { key: 'shoring-group', title: 'Shoring Group Supervisor', kind: 'group', addableUnder: ['section', 'branch', 'division'], group: 'Operations' },
  { key: 'search-group', title: 'Search Group Supervisor', kind: 'group', addableUnder: ['section', 'branch', 'division'], group: 'Operations' },
  { key: 'medical-group', title: 'Medical Group Supervisor', kind: 'group', addableUnder: ['section', 'branch', 'division'], group: 'Operations' },
  { key: 'hazmat-group', title: 'Hazmat Group Supervisor', kind: 'group', addableUnder: ['section', 'branch', 'division'], group: 'Operations' },
  { key: 'heavy-rigging-group', title: 'Heavy Rigging Group Supervisor', kind: 'group', addableUnder: ['section', 'branch', 'division'], group: 'Operations' },
  { key: 'debris-group', title: 'Debris Removal Group Supervisor', kind: 'group', addableUnder: ['section', 'branch', 'division'], group: 'Operations' },
  { key: 'staging', title: 'Staging Area Manager', kind: 'staging', addableUnder: ['section', 'branch'], group: 'Operations' },
  { key: 'cutting-station', title: 'Cutting Station', kind: 'workstation', addableUnder: ['section', 'branch', 'group'], group: 'Operations' },

  // Resources — assigned under a Group/Division (or a Section/Branch).
  { key: 'strike-team', title: 'Strike Team Leader', kind: 'strike-team', addableUnder: ['group', 'division', 'branch', 'section'], group: 'Resources' },
  { key: 'task-force', title: 'Task Force Leader', kind: 'task-force', addableUnder: ['group', 'division', 'branch', 'section'], group: 'Resources' },
  { key: 'single-resource', title: 'Single Resource', kind: 'single-resource', addableUnder: ['group', 'division', 'branch', 'section', 'strike-team', 'task-force'], group: 'Resources' },

  // Section units (added at larger incidents).
  { key: 'resources-unit', title: 'Resources Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'situation-unit', title: 'Situation Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'documentation-unit', title: 'Documentation Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'demobilization-unit', title: 'Demobilization Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'communications-unit', title: 'Communications Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'supply-unit', title: 'Supply Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'facilities-unit', title: 'Facilities Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'ground-support-unit', title: 'Ground Support Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'medical-unit', title: 'Medical Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'time-unit', title: 'Time Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'procurement-unit', title: 'Procurement Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
  { key: 'cost-unit', title: 'Cost Unit Leader', kind: 'unit', addableUnder: ['section', 'branch'], group: 'Units' },
];

// The standard positions that may be added beneath a node of the given kind. The
// Add-position sheet shows these grouped by `group`, plus a "Custom position" entry.
export function libraryItemsAddableUnder(kind: OrgPositionKind): LibraryPosition[] {
  return POSITION_LIBRARY.filter((it) => it.addableUnder.includes(kind));
}

export function libraryItem(key: string): LibraryPosition | undefined {
  return POSITION_LIBRARY.find((it) => it.key === key);
}
