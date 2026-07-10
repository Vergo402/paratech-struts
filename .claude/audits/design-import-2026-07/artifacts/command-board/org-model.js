/* ============================================================
   FieldShore — Org Chart redesign mockup · DATA MODEL
   NIMS/ICS structure (ADR-008). Keyed-by-id positions, derived
   tree, span-of-control, and a tiny pub/sub so the desktop and
   phone views stay in lock-step off one shared model.
   ============================================================ */

// ICS taxonomy — drives rendering + the span count (ADR-008 / schema/org.ts).
export const KIND = {
  command: 'command', //          Incident Commander (the single root)
  commandStaff: 'command-staff', //  Safety / PIO / Liaison — side cluster, excluded from span
  section: 'section', //          Operations / Planning / Logistics / Finance Section Chief
  branch: 'branch', //            Branch Director (span relief)
  division: 'division', //        geographic — Division Supervisor (numbered by floor)
  group: 'group', //              functional — Rescue / Shoring / Search Group Supervisor
  unit: 'unit', //                Unit Leader
  staging: 'staging', //          Staging Area Manager
  workstation: 'workstation', //  Cutting Station — a card like Staging, NOT a command box
  strikeTeam: 'strike-team', //   Strike Team Leader (5 same-type)
  taskForce: 'task-force', //     Task Force Leader (mixed)
  single: 'single-resource', //   a single apparatus/crew placed directly
};

// Human label for a kind eyebrow (titles already spell out the role; the eyebrow
// names the ICS class so the IC reads structure at a glance).
export const KIND_LABEL = {
  'command': 'Incident Command',
  'command-staff': 'Command Staff',
  'section': 'Section',
  'branch': 'Branch',
  'division': 'Division — geographic',
  'group': 'Group — functional',
  'unit': 'Unit',
  'staging': 'Operations',
  'workstation': 'Workstation',
  'strike-team': 'Strike Team',
  'task-force': 'Task Force',
  'single-resource': 'Single Resource',
};

let _uid = 1000;
export const newId = (p = 'pos') => `${p}-${++_uid}`;

function res(label, sub, ref = 'apparatus') {
  return { ref, value: label, label, sub: sub || null };
}

// ── The seeded incident: a mid-incident Level IV structural collapse, positions
//    filled (NIMS-correct two-Group default grown with a Search Group + a 2nd-floor
//    Division as the second face opened). Operations runs 6 direct reports → the
//    span-of-control caution fires (doctrine: approaching the 1:7 limit, add a Branch).
export function seedIncident() {
  const P = {};
  const add = (p) => { P[p.id] = { side: null, floor: null, assignedResources: [], builtIn: false, ...p }; };

  add({ id: 'ic', title: 'Incident Commander', kind: KIND.command, parentId: null, order: 0, builtIn: true,
        assignedResources: [res('BC Reyes', 'Car 1', 'individual')] });

  add({ id: 'safety', title: 'Safety Officer', kind: KIND.commandStaff, parentId: 'ic', order: 0, builtIn: true,
        assignedResources: [res('Capt. Nolan', 'Engine 4', 'individual')] });
  add({ id: 'pio', title: 'Public Information Officer', kind: KIND.commandStaff, parentId: 'ic', order: 1,
        assignedResources: [] }); // an unassigned command-staff slot

  add({ id: 'ops', title: 'Operations Section Chief', kind: KIND.section, parentId: 'ic', order: 1, builtIn: true,
        assignedResources: [res('Capt. Vega', 'Rescue 1', 'individual')] });

  // Functional Groups
  add({ id: 'rescue', title: 'Rescue Group Supervisor', kind: KIND.group, parentId: 'ops', order: 0, builtIn: true,
        assignedResources: [res('Lt. Okafor', 'Rescue 1', 'individual')] });
  add({ id: 'rescue-r2', title: 'Rescue 2', kind: KIND.single, parentId: 'rescue', order: 0,
        assignedResources: [res('Rescue 2', '4 crew')] });
  add({ id: 'rescue-e7', title: 'Engine 7', kind: KIND.single, parentId: 'rescue', order: 1,
        assignedResources: [res('Engine 7', '3 crew')] });

  add({ id: 'shoring', title: 'Shoring Group Supervisor', kind: KIND.group, parentId: 'ops', order: 1, builtIn: true,
        assignedResources: [res('Lt. Briggs', 'Truck 3', 'individual')] });
  add({ id: 'shoring-t3', title: 'Truck 3', kind: KIND.single, parentId: 'shoring', order: 0,
        assignedResources: [res('Truck 3', '4 crew')] });
  add({ id: 'shoring-e12', title: 'Engine 12', kind: KIND.single, parentId: 'shoring', order: 1,
        assignedResources: [res('Engine 12', '3 crew')] });

  add({ id: 'search', title: 'Search Group Supervisor', kind: KIND.group, parentId: 'ops', order: 2,
        assignedResources: [res('Lt. Hale', 'Squad 2', 'individual')] });
  add({ id: 'search-k9', title: 'K-9 Unit 2', kind: KIND.single, parentId: 'search', order: 0,
        assignedResources: [res('K-9 Unit 2', 'canine')] });

  // Operations workstations / staging (under Operations, NOT command boxes)
  add({ id: 'staging', title: 'Staging Area Manager', kind: KIND.staging, parentId: 'ops', order: 3, builtIn: true,
        assignedResources: [res('FF Dunn', null, 'individual'), res('Engine 19'), res('Engine 22'), res('Medic 4')] });
  add({ id: 'cutting', title: 'Cutting Station', kind: KIND.workstation, parentId: 'ops', order: 4, builtIn: true,
        assignedResources: [res('FF Castro', null, 'individual')] });

  // Second work face — a numbered Division (floor 2, C side)
  add({ id: 'div2', title: 'Division 2 Supervisor', kind: KIND.division, parentId: 'ops', order: 5,
        floor: 2, side: 'C', assignedResources: [res('Capt. Ng', 'Truck 8', 'individual')] });
  add({ id: 'div2-t8', title: 'Truck 8', kind: KIND.single, parentId: 'div2', order: 0,
        assignedResources: [res('Truck 8', '4 crew')] });

  return P;
}

// Roster: rigs checked in but not yet placed — draggable onto a node to assign.
export const ROSTER = [
  res('Engine 30', '3 crew'), res('Ladder 5', '4 crew'), res('Medic 9', '2 crew'),
  res('Rescue 4', '4 crew'), res('Battalion 2', 'chief'), res('Squad 6', '5 crew'),
];

// Sample role history (K-13 — new in v4) keyed by position id.
export const HISTORY = {
  ic: [
    { who: 'BC Reyes · Car 1', at: '13:02', note: 'Assumed command' },
    { who: 'Capt. Vega · Rescue 1', at: '12:41', note: 'Initial IC — transferred' },
  ],
  ops: [{ who: 'Capt. Vega · Rescue 1', at: '13:05', note: 'Assigned Operations' }],
  shoring: [{ who: 'Lt. Briggs · Truck 3', at: '13:11', note: 'Assigned Shoring Group' }],
};

/* ── tree helpers ─────────────────────────────────────────── */
export const rootOf = (P) => Object.values(P).find((p) => p.parentId === null);

export function childrenOf(P, id) {
  return Object.values(P).filter((p) => p.parentId === id)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
export function leaderOf(p) { return p.assignedResources[0] || null; }

export function isAncestorOrSelf(P, ancestorId, nodeId) {
  let cur = nodeId, guard = 0;
  while (cur != null && guard++ < 999) { if (cur === ancestorId) return true; cur = P[cur]?.parentId ?? null; }
  return false;
}
export function subtreeIds(P, id) {
  const out = [], q = [id], seen = new Set([id]);
  while (q.length) for (const c of childrenOf(P, q.shift())) if (!seen.has(c.id)) { seen.add(c.id); out.push(c.id); q.push(c.id); }
  return out;
}
// NIMS span: command-staff excluded (NIMS 2017 p.23). Optimal 5, acceptable 3–7.
export function spanOf(P, id) { return childrenOf(P, id).filter((c) => c.kind !== KIND.commandStaff && c.kind !== KIND.single).length; }
export function spanLevel(n) { return n > 7 ? 'over' : n >= 6 ? 'caution' : 'ok'; }

/* ── the live store: mutations + pub/sub ──────────────────── */
export function createStore() {
  let P = seedIncident();
  const subs = new Set();
  const emit = () => subs.forEach((f) => f(P));

  return {
    get positions() { return P; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },

    reparent(id, newParentId) {
      const p = P[id], np = P[newParentId];
      if (!p || p.parentId === null || !np) return;
      if (isAncestorOrSelf(P, id, newParentId)) return; // no cycles
      p.parentId = newParentId;
      p.order = nextOrder(P, newParentId);
      emit();
    },
    reorder(id, parentId, index) {
      const p = P[id]; if (!p) return;
      if (p.parentId !== parentId) p.parentId = parentId;
      const sibs = childrenOf(P, parentId).filter((s) => s.id !== id);
      const before = sibs[index - 1], after = sibs[index];
      p.order = before && after ? (before.order + after.order) / 2
        : after ? after.order - 1 : before ? before.order + 1 : 0;
      emit();
    },
    assign(id, resource) {
      const p = P[id]; if (!p) return;
      if (p.assignedResources.some((r) => r.label === resource.label)) return;
      p.assignedResources = [...p.assignedResources, { ...resource }];
      emit();
    },
    clear(id, label) {
      const p = P[id]; if (!p) return;
      p.assignedResources = label ? p.assignedResources.filter((r) => r.label !== label) : [];
      emit();
    },
    addChild(parentId, title, kind) {
      const id = newId();
      P[id] = { id, title, kind, parentId, order: nextOrder(P, parentId), builtIn: false, side: null, floor: null, assignedResources: [] };
      emit();
      return id;
    },
    rename(id, title) { if (P[id]) { P[id].title = title; emit(); } },
    remove(id) {
      const p = P[id]; if (!p || p.builtIn) return;
      const drop = new Set([id, ...subtreeIds(P, id)]);
      P = Object.fromEntries(Object.entries(P).filter(([k]) => !drop.has(k)));
      emit();
    },
    reset() { P = seedIncident(); emit(); },
  };
}
function nextOrder(P, parentId) {
  const sibs = childrenOf(P, parentId);
  return sibs.length ? sibs[sibs.length - 1].order + 1 : 0;
}
