import { useLayoutEffect, useRef, useState } from 'react';
import type { OrgPositions } from '@core/schema';
import { rootPosition } from '@core/org';
import { Button, Modal } from '@ui/primitives';
import { useOrg, useIsIC, useOrgShorePointCounts } from '@ui/hooks';
import { MyRoleSheet } from './MyRoleSheet';
import { RosterStrip } from './RosterStrip';
import { OrgDragLayer } from './OrgDragLayer';
import { OrgConnectors, offsetWithin } from './OrgConnectors';
import { useOrgDragDrop } from './useOrgDragDrop';
import { OrgFullScreen } from './OrgFullScreen';
import { SubTree } from './OrgTree';

/**
 * The org workspace's action cluster — the My-role chip + the full-screen button,
 * hosting their surfaces (MyRoleSheet, the pinch-zoom OrgFullScreen). Lives in the
 * WORKSPACE header row on the Deck (one header row, #434 — OrgChart's own head row
 * with its ghost left span is gone) and above the chart inside the phone org Sheet.
 * Desktop gains full-screen with this move (the accepted mockup's call).
 */
export function OrgWorkspaceActions() {
  const positions = useOrg();
  const [myRoleOpen, setMyRoleOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  return (
    <div className="fs-org-head-actions">
      <button type="button" className="fs-org-myrole" onClick={() => setMyRoleOpen(true)}>
        My role
      </button>
      <button type="button" className="fs-org-fullscreen" aria-label="Full screen" onClick={() => setFullOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 8V4H8M16 8V4H12M4 12V16H8M16 12V16H12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <OrgFullScreen positions={positions} open={fullOpen} onClose={() => setFullOpen(false)} />
      <MyRoleSheet open={myRoleOpen} onClose={() => setMyRoleOpen(false)} />
    </div>
  );
}

/**
 * Org chart (#295/#323) — the Command Deck workspace. Renders the WHOLE structure at
 * once (pan/scroll if wide); the IC reads the entire command picture without
 * descending levels. For the IC it is fully interactive: drag a card to re-assign who
 * it reports to (re-parent / reorder), drag a roster rig onto a card to assign it.
 * Drag is an additive enhancement — the node sheet's Move… buttons stay the keyboard /
 * screen-reader path. Tap any node → the node sheet. The My-role / full-screen
 * actions live in OrgWorkspaceActions (the workspace header row / the phone Sheet).
 */
export function OrgChart({
  onOpenNode,
}: {
  /** Tap a node → the node panel (owned by SitStat so the desktop dock sits beside the board). */
  onOpenNode: (id: string) => void;
}) {
  const positions: OrgPositions = useOrg();
  const root = rootPosition(positions);
  // Live assignment numerals (#434) — per-position shore-point tallies + the queue.
  const spCounts = useOrgShorePointCounts();
  // Command edit gate (ADR-024 follow-up): the IC by ACCOUNT (any device they sign into),
  // by their own device, or a legacy device-ref the binding resolves to them.
  const isIC = useIsIC();

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dnd = useOrgDragDrop({ positions, isIC, containerRef, onOpenNode });

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
      const { x } = offsetWithin(rootEl, canvas);
      scroll.scrollLeft = x + rootEl.offsetWidth / 2 - scroll.clientWidth / 2;
    });
    return () => cancelAnimationFrame(raf);
  }, [rootId]);

  if (!root) return null;

  return (
    <div className="fs-org" ref={containerRef}>
      {isIC && <RosterStrip dnd={dnd} />}

      <div className={`fs-org-scroll${dnd.drag ? ' is-dragging' : ''}`} ref={scrollRef}>
        <div className="fs-org-canvas" ref={canvasRef}>
          <OrgConnectors canvasRef={canvasRef} deps={positions} />
          <div className="fs-org-tree">
            <ul>
              <SubTree
                positions={positions}
                id={root.id}
                rootId={root.id}
                depth={0}
                onOpen={onOpenNode}
                dnd={dnd}
                editable={isIC}
                counts={spCounts.byPosition}
                cuttingQueue={spCounts.cuttingQueue}
              />
            </ul>
          </div>
        </div>
      </div>

      <OrgDragLayer drag={dnd.drag} gapHot={dnd.gapHot} />

      {/* #427 — the drag-merge confirm. A lead-drop of a position card removes the
          source position (and its whole subtree); pre-#427 the drag path committed
          that cascade silently while the NodeSheet's Remove kept its Modal (ADR-016).
          Same doctrine here: destructive → confirm. */}
      <Modal
        open={dnd.confirm !== null}
        onClose={() => dnd.resolveConfirm(false)}
        title={`Remove ${dnd.confirm?.sourceTitle ?? ''}?`}
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => dnd.resolveConfirm(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button variant="primary" destructive onPress={() => dnd.resolveConfirm(true)}>
              Move and remove
            </Button>
          </>
        }
      >
        <p>
          Moving <strong>{dnd.confirm?.resourceLabel}</strong> to <strong>{dnd.confirm?.targetTitle}</strong>{' '}
          removes this position{dnd.confirm?.hasSubtree ? ' and everything under it' : ''}. Assignments here
          are cleared.
        </p>
      </Modal>
    </div>
  );
}
