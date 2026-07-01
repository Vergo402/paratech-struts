import { useLayoutEffect, useRef, useState } from 'react';
import type { OrgPositions } from '@core/schema';
import { rootPosition, currentIC } from '@core/org';
import { useOrg, useDeviceUidValue } from '@ui/hooks';
import { NodeSheet } from './NodeSheet';
import { MyRoleSheet } from './MyRoleSheet';
import { RosterStrip } from './RosterStrip';
import { OrgDragLayer } from './OrgDragLayer';
import { OrgConnectors } from './OrgConnectors';
import { useOrgDragDrop } from './useOrgDragDrop';
import { OrgFullScreen } from './OrgFullScreen';
import { SubTree } from './OrgTree';

/**
 * Org chart (#295/#323) — the Command Deck workspace. Renders the WHOLE structure at
 * once (pan/scroll if wide); the IC reads the entire command picture without
 * descending levels. For the IC it is fully interactive: drag a card to re-assign who
 * it reports to (re-parent / reorder), drag a roster rig onto a card to assign it.
 * Drag is an additive enhancement — the node sheet's Move… buttons stay the keyboard /
 * screen-reader path. Tap any node → the node sheet. My Role lets any device declare
 * its own position.
 */
export function OrgChart({ allowFullScreen = false }: { allowFullScreen?: boolean } = {}) {
  const positions: OrgPositions = useOrg();
  const root = rootPosition(positions);
  const uid = useDeviceUidValue();
  const ic = currentIC(positions);
  // Pre-auth IC-gate (pragmatic, ADR-021): this device may restructure if it holds
  // the IC device-ref, or no device owns the IC. Real auth verifies later.
  const isIC = uid != null && (!ic || ic.ref !== 'device' || ic.value === uid);

  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [myRoleOpen, setMyRoleOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dnd = useOrgDragDrop({ positions, isIC, containerRef, onOpenNode: setOpenNodeId });

  const rootId = root?.id;
  // Center-on-IC (#373): open the chart scrolled so the Incident Commander sits in the
  // middle, not jammed at the left edge. Once, after first layout (root id is stable
  // for an operation — we deliberately don't re-center on every structural edit).
  useLayoutEffect(() => {
    const scroll = scrollRef.current;
    const canvas = canvasRef.current;
    if (!scroll || !canvas || !rootId) return;
    const raf = requestAnimationFrame(() => {
      const rootEl = canvas.querySelector<HTMLElement>(`[data-org-node="${rootId}"]`);
      if (!rootEl) return;
      let x = 0;
      for (let n: HTMLElement | null = rootEl; n && n !== canvas; n = n.offsetParent as HTMLElement | null) x += n.offsetLeft;
      scroll.scrollLeft = x + rootEl.offsetWidth / 2 - scroll.clientWidth / 2;
    });
    return () => cancelAnimationFrame(raf);
  }, [rootId]);

  if (!root) return null;

  return (
    <div className="fs-org" ref={containerRef}>
      <div className="fs-org-head">
        <span />
        <div className="fs-org-head-actions">
          {allowFullScreen && (
            <button type="button" className="fs-org-fullscreen" aria-label="Full screen" onClick={() => setFullOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 8V4H8M16 8V4H12M4 12V16H8M16 12V16H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button type="button" className="fs-org-myrole" onClick={() => setMyRoleOpen(true)}>
            My role
          </button>
        </div>
      </div>

      {isIC && <RosterStrip dnd={dnd} />}

      <div className={`fs-org-scroll${dnd.drag ? ' is-dragging' : ''}`} ref={scrollRef}>
        <div className="fs-org-canvas" ref={canvasRef}>
          <OrgConnectors canvasRef={canvasRef} deps={positions} />
          <div className="fs-org-tree">
            <ul>
              <SubTree positions={positions} id={root.id} rootId={root.id} depth={0} onOpen={setOpenNodeId} dnd={dnd} editable={isIC} />
            </ul>
          </div>
        </div>
      </div>

      <OrgDragLayer drag={dnd.drag} gapHot={dnd.gapHot} />

      {allowFullScreen && <OrgFullScreen positions={positions} open={fullOpen} onClose={() => setFullOpen(false)} />}

      {openNodeId && <NodeSheet key={openNodeId} positionId={openNodeId} isIC={isIC} onClose={() => setOpenNodeId(null)} />}
      <MyRoleSheet open={myRoleOpen} onClose={() => setMyRoleOpen(false)} />
    </div>
  );
}
