import { useState } from 'react';
import type { OrgPosition, OrgPositions } from '@core/schema';
import { rootPosition, childrenOf, pathToRoot, leaderOf, spanOfControl, spanLevel } from '@core/org';
import { useOrg } from '@ui/hooks';
import { useMediaQuery } from '@ui/primitives';

// One org node card (read view). Gold for the IC root; muted "Unassigned" when no
// leader. A node carrying a span caution/over shows it as text (never color alone).
// `onDescend` (a node with children below the rendered depth) makes it a button that
// re-roots the chart — the K-12 budget: one slice at a time, never an infinite canvas.
function OrgNode({
  pos,
  isIC,
  spanText,
  descendCount,
  onDescend,
}: {
  pos: OrgPosition;
  isIC?: boolean;
  spanText?: string;
  descendCount?: number;
  onDescend?: () => void;
}) {
  const leader = leaderOf(pos);
  const body = (
    <>
      <span className="fs-org-node-eyebrow">{pos.title}</span>
      <span className={`fs-org-node-leader${leader ? '' : ' is-unassigned'}`}>
        {leader ? leader.label : 'Unassigned'}
      </span>
      {spanText && <span className="fs-org-node-span">{spanText}</span>}
      {onDescend && (
        <span className="fs-org-node-descend">
          {descendCount} {descendCount === 1 ? 'report' : 'reports'} ›
        </span>
      )}
    </>
  );
  const cls = `fs-org-node${isIC ? ' is-ic' : ''}${leader ? ' is-filled' : ''}${
    pos.kind === 'workstation' ? ' is-workstation' : ''
  }`;
  return onDescend ? (
    <button type="button" className={`${cls} fs-org-node--press`} onClick={onDescend}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

// One subtree node + its reports, rendered to `maxDepth` tiers below the focus.
// Command Staff (Safety Officer …) render as a childless SIDE cluster excluded from
// the span (NIMS). A node at the depth floor that still has reports gets a descend
// affordance instead of expanding (tap-to-descend).
function SubTree({
  positions,
  id,
  depth,
  maxDepth,
  isIC,
  onDescend,
}: {
  positions: OrgPositions;
  id: string;
  depth: number;
  maxDepth: number;
  isIC?: boolean;
  onDescend: (id: string) => void;
}) {
  const pos = positions[id];
  if (!pos) return null;
  const kids = childrenOf(positions, id);
  const staff = kids.filter((k) => k.kind === 'command-staff');
  const reports = kids.filter((k) => k.kind !== 'command-staff');
  const span = spanOfControl(positions, id);
  const level = spanLevel(span);
  const spanText =
    reports.length > 0 && level !== 'ok' ? `Span ${span} · ${level === 'over' ? 'over' : 'caution'}` : undefined;
  const expand = reports.length > 0 && depth < maxDepth;

  return (
    <li>
      <div className="fs-org-top">
        <OrgNode
          pos={pos}
          isIC={isIC}
          spanText={spanText}
          descendCount={!expand && reports.length > 0 ? reports.length : undefined}
          onDescend={!expand && reports.length > 0 ? () => onDescend(id) : undefined}
        />
        {staff.length > 0 && (
          <div className="fs-org-staff" aria-label="Command staff">
            {staff.map((s) => (
              <OrgNode key={s.id} pos={s} />
            ))}
          </div>
        )}
      </div>
      {expand && (
        <ul className="fs-org-reports">
          {reports.map((r) => (
            <SubTree
              key={r.id}
              positions={positions}
              id={r.id}
              depth={depth + 1}
              maxDepth={maxDepth}
              onDescend={onDescend}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Org chart READ view (#295) — the Command Deck workspace default. Renders the
 * focused node to a surface-aware depth (2 tiers on desktop so the default tree
 * shows IC → Operations → the Groups; 1 tier on phone, descend by tap), with the
 * gold IC accent, Command Staff to the side, and the span-of-control caution. The
 * K-12 budget holds: deeper structure is reached by tap-to-descend, never a wider
 * canvas. Editing / assignment / reparent are P7; this is read + descend only.
 */
export function OrgChart() {
  const positions: OrgPositions = useOrg();
  const root = rootPosition(positions);
  const isDeck = useMediaQuery('(min-width: 1024px)');
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const focus = (focusId && positions[focusId]) || root;
  if (!focus || !root) return null;

  const path = pathToRoot(positions, focus.id);
  const maxDepth = isDeck ? 2 : 1;

  return (
    <div className="fs-org">
      {path.length > 1 && (
        <nav className="fs-org-crumbs" aria-label="Org chart path">
          {path.map((p, i) =>
            i === path.length - 1 ? (
              <span key={p.id} className="fs-org-crumb is-current">
                {p.title}
              </span>
            ) : (
              <button
                key={p.id}
                type="button"
                className="fs-org-crumb"
                onClick={() => setFocusId(p.id === root.id ? undefined : p.id)}
              >
                {p.title} ›
              </button>
            ),
          )}
        </nav>
      )}

      <div className="fs-org-scroll">
        <div className="fs-org-tree">
          <ul>
            <SubTree
              positions={positions}
              id={focus.id}
              depth={0}
              maxDepth={maxDepth}
              isIC={focus.id === root.id}
              onDescend={setFocusId}
            />
          </ul>
        </div>
      </div>
    </div>
  );
}
