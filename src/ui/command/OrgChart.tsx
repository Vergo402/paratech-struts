import { useState } from 'react';
import type { OrgPosition, OrgPositions } from '@core/schema';
import { rootPosition, childrenOf, leaderOf, spanOfControl, spanLevel, currentIC } from '@core/org';
import { useOrg, useDeviceUidValue } from '@ui/hooks';
import { NodeSheet } from './NodeSheet';
import { MyRoleSheet } from './MyRoleSheet';

// One org node card — a button that opens the node sheet. Gold for the IC root;
// muted "Unassigned" when no leader; a span caution as text.
function OrgNode({
  pos,
  isIC,
  spanText,
  onOpen,
}: {
  pos: OrgPosition;
  isIC?: boolean;
  spanText?: string;
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
    </button>
  );
}

// A subtree node + ALL its descendants (the whole tree renders at once — no
// tap-to-descend; descending a level at a time loses the reader). Command Staff
// (Safety Officer …) render as a childless side cluster excluded from the span.
function SubTree({
  positions,
  id,
  rootId,
  onOpen,
}: {
  positions: OrgPositions;
  id: string;
  rootId: string;
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

  return (
    <li>
      <div className="fs-org-top">
        <OrgNode pos={pos} isIC={id === rootId} spanText={spanText} onOpen={() => onOpen(id)} />
        {staff.length > 0 && (
          <div className="fs-org-staff" aria-label="Command staff">
            {staff.map((s) => (
              <OrgNode key={s.id} pos={s} onOpen={() => onOpen(s.id)} />
            ))}
          </div>
        )}
      </div>
      {reports.length > 0 && (
        <ul className="fs-org-reports">
          {reports.map((r) => (
            <SubTree key={r.id} positions={positions} id={r.id} rootId={rootId} onOpen={onOpen} />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Org chart (#295) — the Command Deck workspace. Renders the WHOLE structure at
 * once (pan/scroll if wide); the IC reads the entire command picture without
 * descending levels. Gold IC, Command Staff to the side, span caution. Tap any node
 * → the node sheet (read for all; edit for the IC). My Role lets any device declare
 * its own position.
 */
export function OrgChart() {
  const positions: OrgPositions = useOrg();
  const root = rootPosition(positions);
  const uid = useDeviceUidValue();
  const ic = currentIC(positions);
  // Pre-auth IC-gate (pragmatic, ADR-021): this device may restructure if it holds
  // the IC device-ref, or no device owns the IC. Real auth verifies later.
  const isIC = uid != null && (!ic || ic.ref !== 'device' || ic.value === uid);

  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [myRoleOpen, setMyRoleOpen] = useState(false);

  if (!root) return null;

  return (
    <div className="fs-org">
      <div className="fs-org-head">
        <span />
        <button type="button" className="fs-org-myrole" onClick={() => setMyRoleOpen(true)}>
          My role
        </button>
      </div>

      <div className="fs-org-scroll">
        <div className="fs-org-tree">
          <ul>
            <SubTree positions={positions} id={root.id} rootId={root.id} onOpen={setOpenNodeId} />
          </ul>
        </div>
      </div>

      {openNodeId && <NodeSheet key={openNodeId} positionId={openNodeId} isIC={isIC} onClose={() => setOpenNodeId(null)} />}
      <MyRoleSheet open={myRoleOpen} onClose={() => setMyRoleOpen(false)} />
    </div>
  );
}
