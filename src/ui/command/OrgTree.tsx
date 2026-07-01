import type { OrgPosition, OrgPositions } from '@core/schema';
import { childrenOf, leaderOf, kindLabel, spanOfControl, spanLevel } from '@core/org';
import type { OrgDragApi } from './useOrgDragDrop';

// The org-tree renderer, shared by the inline chart (OrgChart) and the full-screen
// zoom view (OrgFullScreen). Lives in its own module so neither importer forms a
// cycle (OrgChart renders OrgFullScreen, which renders the same tree read-only).

// Inert drag controller for the read-only full-screen view — no tap, no drag.
export const READ_ONLY_DND: OrgDragApi = {
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

// Six-dot grab handle (the FloatingPanel grip idiom) — the desktop drag affordance.
function GripDots() {
  return (
    <svg className="fs-org-grip-glyph" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {[4, 8, 12].map((cy) => (
        <g key={cy}>
          <circle cx="6" cy={cy} r="1" fill="currentColor" />
          <circle cx="10" cy={cy} r="1" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

// One org node card — a button that opens the node sheet (read for all). For the IC it
// is also a drag source: a grab handle on desktop, press-and-hold on phone. The root
// (IC) never drags (the root can't move) but stays a valid drop target. Gold for the
// IC root; the ICS type kicker shows on single resources only (the title already names
// the type for groups/sections). Drag feedback: dimmed source, valid-target ring, the
// supervisor/subordinate dotted split, and the hovered zone emphasis.
function OrgNode({
  pos,
  isRoot,
  editable,
  span,
  onOpen,
  dnd,
  interactive = true,
}: {
  pos: OrgPosition;
  isRoot?: boolean;
  editable: boolean;
  /** Direct-report count (command-staff excluded) — drives the span-of-control badge. */
  span?: number;
  onOpen: () => void;
  dnd: OrgDragApi;
  /** False in the full-screen view: a static card — no tap, no drag, no grip. */
  interactive?: boolean;
}) {
  const leader = leaderOf(pos);
  const isResource = pos.kind === 'single-resource';
  const canDrag = interactive && editable && !isRoot;
  const role = dnd.roleFor(pos.id);
  const hot = dnd.hotZoneFor(pos.id);
  const cls = [
    'fs-org-node',
    interactive ? 'fs-org-node--press' : '',
    isRoot ? 'is-ic' : '',
    leader ? 'is-filled' : 'is-unassigned',
    isResource ? 'is-resource' : '',
    pos.kind === 'workstation' ? 'is-workstation' : '',
    role === 'source' ? 'is-lifted' : '',
    role === 'valid' ? 'is-valid' : '',
    role === 'blocked' ? 'is-blocked' : '',
    dnd.splitFor(pos.id) ? 'is-splitting' : '',
    hot === 'top' ? 'is-hot-top' : '',
    hot === 'bottom' ? 'is-hot-bottom' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Meta badges (#373): extra-resource count, geographic locator, span-of-control.
  const level = span != null ? spanLevel(span) : 'ok';
  const extra = pos.assignedResources.length - 1;
  const badges = (
    <>
      {extra > 0 && (
        <span className="fs-org-badge is-count">
          +{extra} resource{extra > 1 ? 's' : ''}
        </span>
      )}
      {pos.kind === 'division' && pos.floor != null && (
        <span className="fs-org-badge is-loc">
          Div {pos.floor}
          {pos.side ? ` · ${pos.side} side` : ''}
        </span>
      )}
      {level !== 'ok' && (
        <span className={`fs-org-badge ${level === 'over' ? 'is-span-over' : 'is-span-caution'}`}>
          Span {span} · {level === 'over' ? 'over' : 'caution'}
        </span>
      )}
    </>
  );
  const hasBadges = extra > 0 || (pos.kind === 'division' && pos.floor != null) || level !== 'ok';

  const body = (
    <>
      <span className="fs-org-node-dot" aria-hidden="true" />
      <span className="fs-org-node-body">
        <span className="fs-org-node-eyebrow">{kindLabel(pos.kind)}</span>
        <span className="fs-org-node-title">{pos.title}</span>
        {!isResource && (
          <span className={`fs-org-node-leader${leader ? '' : ' is-unassigned'}`}>{leader ? leader.label : 'Unassigned'}</span>
        )}
        {hasBadges && <span className="fs-org-node-meta">{badges}</span>}
      </span>
    </>
  );

  if (!interactive) {
    return (
      <div className={cls} data-org-node={pos.id} data-org-parent={pos.parentId ?? ''}>
        {body}
      </div>
    );
  }

  const handleClick = () => {
    if (dnd.consumeClick()) return; // swallow the click that trails a drag
    onOpen();
  };

  return (
    <button
      type="button"
      className={cls}
      data-org-node={pos.id}
      data-org-parent={pos.parentId ?? ''}
      onPointerDown={canDrag && !dnd.desktop ? (e) => dnd.startNode(e, pos.id, false) : undefined}
      onClick={handleClick}
    >
      {body}
      {canDrag && dnd.desktop && (
        <span
          className="fs-org-grip"
          aria-hidden="true"
          title="Drag to move"
          onPointerDown={(e) => {
            e.stopPropagation();
            dnd.startNode(e, pos.id, true);
          }}
        >
          <GripDots />
        </span>
      )}
    </button>
  );
}

// A subtree node + ALL its descendants (the whole tree renders at once — no
// tap-to-descend; descending a level at a time loses the reader). Command Staff
// (Safety Officer …) render as a childless side cluster excluded from the span.
export function SubTree({
  positions,
  id,
  rootId,
  depth,
  onOpen,
  dnd,
  editable,
  interactive = true,
}: {
  positions: OrgPositions;
  id: string;
  rootId: string;
  depth: number;
  onOpen: (id: string) => void;
  dnd: OrgDragApi;
  editable: boolean;
  interactive?: boolean;
}) {
  const pos = positions[id];
  if (!pos) return null;
  const kids = childrenOf(positions, id);
  const staff = kids.filter((k) => k.kind === 'command-staff');
  const reports = kids.filter((k) => k.kind !== 'command-staff');
  const span = spanOfControl(positions, id);
  // Stack a group's children vertically (indented spine) ONLY at the bottom-most
  // parent→single-resource relationship: below the Operations groups row (depth ≥ 2)
  // AND when every child is a single resource (apparatus/crew). A group whose children
  // are structural positions (sub-groups, units, divisions) stays in a HORIZONTAL row
  // so it can branch, even when those children are currently childless.
  const stacked = depth >= 2 && reports.length > 0 && reports.every((r) => r.kind === 'single-resource');

  return (
    <li className={stacked ? 'fs-org-li--stackparent' : undefined}>
      <div className="fs-org-top">
        <OrgNode pos={pos} isRoot={id === rootId} editable={editable} span={span} onOpen={() => onOpen(id)} dnd={dnd} interactive={interactive} />
        {staff.length > 0 && (
          <div className="fs-org-staff" aria-label="Command staff">
            {staff.map((s) => (
              <OrgNode key={s.id} pos={s} editable={editable} onOpen={() => onOpen(s.id)} dnd={dnd} interactive={interactive} />
            ))}
          </div>
        )}
      </div>
      {reports.length > 0 && (
        <ul className={`fs-org-reports${stacked ? ' fs-org-reports--stack' : ''}`}>
          {reports.map((r) => (
            <SubTree key={r.id} positions={positions} id={r.id} rootId={rootId} depth={depth + 1} onOpen={onOpen} dnd={dnd} editable={editable} interactive={interactive} />
          ))}
        </ul>
      )}
    </li>
  );
}
