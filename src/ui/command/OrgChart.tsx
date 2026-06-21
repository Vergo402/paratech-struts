import { useState } from 'react';
import type { OrgPosition, OrgPositions } from '@core/schema';
import { rootPosition, childrenOf, pathToRoot, leaderOf, spanOfControl, spanLevel, currentIC } from '@core/org';
import { useOrg, useDeviceUidValue } from '@ui/hooks';
import { useMediaQuery } from '@ui/primitives';
import { NodeSheet } from './NodeSheet';
import { MyRoleSheet } from './MyRoleSheet';

// One org node card — a button that opens the node sheet. Gold for the IC root;
// muted "Unassigned" when no leader; a span caution as text; a quiet reports count.
function OrgNode({
  pos,
  isIC,
  spanText,
  reportsCount,
  onOpen,
}: {
  pos: OrgPosition;
  isIC?: boolean;
  spanText?: string;
  reportsCount?: number;
  onOpen: () => void;
}) {
  const leader = leaderOf(pos);
  const cls = `fs-org-node fs-org-node--press${isIC ? ' is-ic' : ''}${leader ? ' is-filled' : ''}${
    pos.kind === 'workstation' ? ' is-workstation' : ''
  }`;
  return (
    <button type="button" className={cls} onClick={onOpen}>
      <span className="fs-org-node-eyebrow">{pos.title}</span>
      <span className={`fs-org-node-leader${leader ? '' : ' is-unassigned'}`}>{leader ? leader.label : 'Unassigned'}</span>
      {spanText && <span className="fs-org-node-span">{spanText}</span>}
      {reportsCount ? (
        <span className="fs-org-node-reports">
          {reportsCount} {reportsCount === 1 ? 'subordinate' : 'subordinates'}
        </span>
      ) : null}
    </button>
  );
}

// A subtree node + its reports to `maxDepth` tiers; Command Staff render as a
// childless side cluster excluded from the span (NIMS). Every node opens the sheet.
function SubTree({
  positions,
  id,
  rootId,
  depth,
  maxDepth,
  onOpen,
}: {
  positions: OrgPositions;
  id: string;
  rootId: string;
  depth: number;
  maxDepth: number;
  onOpen: (id: string) => void;
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
          isIC={id === rootId}
          spanText={spanText}
          reportsCount={!expand ? reports.length : undefined}
          onOpen={() => onOpen(id)}
        />
        {staff.length > 0 && (
          <div className="fs-org-staff" aria-label="Command staff">
            {staff.map((s) => (
              <OrgNode key={s.id} pos={s} onOpen={() => onOpen(s.id)} />
            ))}
          </div>
        )}
      </div>
      {expand && (
        <ul className="fs-org-reports">
          {reports.map((r) => (
            <SubTree key={r.id} positions={positions} id={r.id} rootId={rootId} depth={depth + 1} maxDepth={maxDepth} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Org chart (#295) — the Command Deck workspace. Renders the focused node to a
 * surface-aware depth (2 tiers desktop / 1 tier phone, descend via the node sheet),
 * gold IC, Command Staff to the side, span caution. Tap any node → the node sheet
 * (read for all; edit for the IC). My Role lets any device declare its own position.
 */
export function OrgChart() {
  const positions: OrgPositions = useOrg();
  const root = rootPosition(positions);
  const isDeck = useMediaQuery('(min-width: 1024px)');
  const uid = useDeviceUidValue();
  const ic = currentIC(positions);
  // Pre-auth IC-gate (pragmatic, ADR-021): this device may restructure if it holds
  // the IC device-ref, or no device owns the IC. Real auth verifies later.
  const isIC = uid != null && (!ic || ic.ref !== 'device' || ic.value === uid);

  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [myRoleOpen, setMyRoleOpen] = useState(false);

  const focus = (focusId && positions[focusId]) || root;
  if (!focus || !root) return null;
  const path = pathToRoot(positions, focus.id);
  const maxDepth = isDeck ? 2 : 1;

  return (
    <div className="fs-org">
      <div className="fs-org-head">
        {path.length > 1 ? (
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
        ) : (
          <span />
        )}
        <button type="button" className="fs-org-myrole" onClick={() => setMyRoleOpen(true)}>
          My role
        </button>
      </div>

      <div className="fs-org-scroll">
        <div className="fs-org-tree">
          <ul>
            <SubTree positions={positions} id={focus.id} rootId={root.id} depth={0} maxDepth={maxDepth} onOpen={setOpenNodeId} />
          </ul>
        </div>
      </div>

      {openNodeId && (
        <NodeSheet
          key={openNodeId}
          positionId={openNodeId}
          isIC={isIC}
          onClose={() => setOpenNodeId(null)}
          onDescend={setFocusId}
        />
      )}
      <MyRoleSheet open={myRoleOpen} onClose={() => setMyRoleOpen(false)} />
    </div>
  );
}
