import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OrgPositions } from '@core/schema';
import { rootPosition } from '@core/org';
import { claimOverlay, releaseOverlay, isTopOverlay } from '@ui/primitives';
import { useOrgShorePointCounts } from '@ui/hooks';
import { SubTree, READ_ONLY_DND } from './OrgTree';
import { OrgConnectors } from './OrgConnectors';
import { zoomAt, panBy, fitTransform, IDENTITY, type Transform } from './pinchZoom';

const NOOP = () => {};

/**
 * Full-screen org chart (phone) — opens over the Command sheet so the IC can read the
 * whole command picture when it's too wide for the cramped sheet. Pinch to zoom, drag
 * to pan; the chart is READ-ONLY here (no tap-to-open, no drag-to-reparent) so the
 * pan/zoom gesture never collides with node interactions — editing stays in the inline
 * chart. Radix Dialog supplies the focus trap, Esc, inert background, and focus return;
 * the overlay claim (mirroring Modal/Sheet) stacks it above the sheet it opened from.
 */
export function OrgFullScreen({ positions, open, onClose }: { positions: OrgPositions; open: boolean; onClose: () => void }) {
  const root = rootPosition(positions);
  const spCounts = useOrgShorePointCounts();
  const contentRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const connectorsRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  const claimRef = useRef(() => closeRef.current());

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const claim = claimRef.current;
    claimOverlay(claim, { container: () => contentRef.current, opener: openerRef.current });
    return () => releaseOverlay(claim);
  }, [open]);

  // Transform state, with a synchronous ref so consecutive pointer moves compose.
  const [t, setT] = useState<Transform>(IDENTITY);
  const tRef = useRef(t);
  const setBoth = (next: Transform) => {
    tRef.current = next;
    setT(next);
  };

  // Active pointers (viewport-relative) + the live pinch baseline (distance + midpoint).
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; midX: number; midY: number } | null>(null);

  // Fit the whole chart on open. The Radix dialog content isn't laid out in the same
  // synchronous pass, so defer the measure — retry until the canvas reports a size
  // (offsetWidth/Height are the pre-transform layout size), capped so a never-measured
  // canvas can't spin. setTimeout (not rAF) so it still fires when the tab is hidden.
  // Falls back to identity; the user can still pinch. The panel's fade-in masks the snap.
  useLayoutEffect(() => {
    if (!open) return;
    pointers.current.clear();
    pinch.current = null;
    let timer = 0;
    let tries = 0;
    const fit = () => {
      const vp = viewportRef.current;
      const canvas = canvasRef.current;
      if (!vp || !canvas) return;
      const r = vp.getBoundingClientRect();
      if ((canvas.offsetWidth === 0 || r.width === 0) && tries++ < 20) {
        timer = window.setTimeout(fit, 16);
        return;
      }
      setBoth(fitTransform(canvas.offsetWidth, canvas.offsetHeight, r.width, r.height));
    };
    timer = window.setTimeout(fit, 0);
    return () => clearTimeout(timer);
  }, [open]);

  const xy = (e: React.PointerEvent) => {
    const r = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      viewportRef.current?.setPointerCapture(e.pointerId); // best-effort (jsdom/synthetic lack it)
    } catch {
      /* no active pointer to capture */
    }
    pointers.current.set(e.pointerId, xy(e));
    const [a, b] = [...pointers.current.values()];
    if (pointers.current.size === 2 && a && b) {
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
    } else {
      pinch.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = xy(e);
    pointers.current.set(e.pointerId, next);
    const [a, b] = [...pointers.current.values()];
    if (pointers.current.size >= 2 && pinch.current && a && b) {
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const base = pinch.current;
      const factor = base.dist > 0 ? dist / base.dist : 1;
      const zoomed = zoomAt(tRef.current, factor, midX, midY);
      setBoth(panBy(zoomed, midX - base.midX, midY - base.midY)); // two-finger drag also pans
      pinch.current = { dist, midX, midY };
    } else if (pointers.current.size === 1) {
      setBoth(panBy(tRef.current, next.x - prev.x, next.y - prev.y));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fs-scrim" />
        <Dialog.Content
          ref={contentRef}
          className="fs-org-full"
          aria-label="Org chart — full screen"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => {
            if (!isTopOverlay(claimRef.current)) e.preventDefault();
          }}
          onCloseAutoFocus={(e) => {
            if (openerRef.current?.isConnected) {
              e.preventDefault();
              openerRef.current.focus();
            }
          }}
        >
          <Dialog.Title className="fs-org-full-title">Org chart — full screen</Dialog.Title>
          <div
            className="fs-org-full-viewport"
            ref={viewportRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div
              className="fs-org-full-canvas"
              ref={canvasRef}
              style={{ transform: `translate3d(${t.x}px, ${t.y}px, 0) scale(${t.scale})`, transformOrigin: '0 0' }}
            >
              <div className="fs-org fs-org--readonly">
                <div className="fs-org-canvas" ref={connectorsRef}>
                  <OrgConnectors canvasRef={connectorsRef} deps={positions} />
                  <div className="fs-org-tree">
                    <ul>
                      {root && (
                        <SubTree
                          positions={positions}
                          id={root.id}
                          rootId={root.id}
                          depth={0}
                          onOpen={NOOP}
                          dnd={READ_ONLY_DND}
                          editable={false}
                          interactive={false}
                          counts={spCounts.byPosition}
                          cuttingQueue={spCounts.cuttingQueue}
                        />
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              className="fs-org-full-close"
              aria-label="Close full screen"
              // Keep the pointerdown from reaching the sheet's document-level
              // pointer-down-outside listener (which would dismiss it). The click
              // still fires, so Dialog.Close closes only this overlay.
              onPointerDown={(e) => e.stopPropagation()}
            >
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
