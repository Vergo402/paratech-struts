import { SubTree } from 'fieldshore-v4';

// SubTree — the recursive ICS org-tree renderer shared by the inline chart and the
// full-screen view. We render it READ-ONLY (interactive=false + an inert drag
// controller) inside the real `.fs-org-tree > ul` wrapper the chart uses, with a
// realistic command structure: IC over an Operations Section with Shoring and
// Rescue Groups, a Safety Officer as command staff, and Engine 7 placed beneath
// Shoring. Span-of-control text surfaces when a supervisor runs wide.

// Inert drag controller — no tap, no drag, every hook returns the resting value.
const INERT = {
  drag: null,
  desktop: true,
  startNode: () => {},
  startChip: () => {},
  consumeClick: () => false,
  roleFor: () => null,
  splitFor: () => false,
  hotZoneFor: () => null,
  gapHot: () => false,
};

const res = (label: string) => ({ ref: 'apparatus' as const, value: label, label });

// One keyed-by-id ICS tree. order is sparse (sibling reorder = one event).
const POSITIONS: Record<string, any> = {
  ic: {
    id: 'ic',
    title: 'Incident Commander',
    kind: 'command',
    parentId: null,
    builtIn: true,
    order: 0,
    assignedResources: [res('Battalion 2')],
  },
  safety: {
    id: 'safety',
    title: 'Safety Officer',
    kind: 'command-staff',
    parentId: 'ic',
    builtIn: true,
    order: 0,
    assignedResources: [res('Safety 1')],
  },
  ops: {
    id: 'ops',
    title: 'Operations Section Chief',
    kind: 'section',
    parentId: 'ic',
    builtIn: true,
    order: 100,
    assignedResources: [res('Division Chief')],
  },
  shoring: {
    id: 'shoring',
    title: 'Shoring Group Supervisor',
    kind: 'group',
    parentId: 'ops',
    builtIn: true,
    order: 100,
    assignedResources: [res('Rescue 1')],
  },
  rescue: {
    id: 'rescue',
    title: 'Rescue Group Supervisor',
    kind: 'group',
    parentId: 'ops',
    builtIn: true,
    order: 200,
    assignedResources: [],
  },
  e7: {
    id: 'e7',
    title: 'Crew',
    kind: 'single-resource',
    parentId: 'shoring',
    builtIn: false,
    order: 100,
    assignedResources: [res('Engine 7')],
  },
};

function Tree({ rootId }: { rootId: string }) {
  return (
    <div className="fs-org-tree">
      <ul>
        <SubTree
          positions={POSITIONS}
          id={rootId}
          rootId="ic"
          depth={0}
          onOpen={() => {}}
          dnd={INERT}
          editable={false}
          interactive={false}
        />
      </ul>
    </div>
  );
}

export const FullChart = () => <Tree rootId="ic" />;

export const OperationsBranch = () => <Tree rootId="ops" />;
