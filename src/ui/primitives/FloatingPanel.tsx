import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { clampPanelPosition, nextZ, type Pos } from './floatingPanelGeometry';

/**
 * FloatingPanel — a free-floating, pointer-draggable companion panel that hovers
 * OVER the board (floating-panel.md / ADR-037). The 16th interaction primitive,
 * sanctioned as a desktop (≥768px) companion mode distinct from the edge-docked
 * SideDrawer (ADR-019) — recorded as a deliberate deviation from the locked
 * 15-primitive set. FLAG FOR THE PHASE J DOCTRINE AUDIT (sibling of #346).
 *
 * Why it exists: on the Operations board the Details + Available-Inventory
 * companions were permanent docked columns that starved the shore-card board.
 * As floating panels the board owns the full width and the user drags a panel
 * aside to read the cards underneath. Surface split: the Operations board mounts
 * this at ≥768px and the modal SideDrawer below — phone stays the floor.
 *
 * Positioning: position:fixed, so the panel stays put in the viewport while the
 * board scrolls beneath it (a docked/absolute panel would scroll away with a tall
 * board). It is clamped to a bounds element (`boundsSelector`, the scroll pane) so
 * it never covers the fixed header or bottom nav — viewport fallback if absent.
 *
 * Posture: NON-MODAL (role="dialog" + accessible name, no aria-modal) — the board
 * stays live, so there is no scrim and NO focus trap (side-drawer.md a11y floor:
 * focus into the panel on open, but Tab can leave). Esc closes + restores the
 * opener via a LOCAL listener (not the overlay stack), so a layered modal/sheet/
 * picker keeps its own Esc and the board is never inerted. Drag is pointer-only;
 * a keyboard reposition is deferred (the panel never blocks the board, ADR-037).
 *
 * Drag: hand-rolled Pointer Events on the header handle (the Slider/Sheet idiom —
 * setPointerCapture + touch-action:none), transform-based move, clamped to the
 * bounds. Position is session-only React state (localStorage deferred — pixel
 * geometry goes stale on resize). Click-to-front via a monotonic z counter.
 */
export interface FloatingPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Cascade index so a second panel doesn't open exactly stacked on the first. */
  cascadeIndex?: number;
  /** CSS selector for the element whose rect bounds the panel (the scroll pane).
   *  Absent → the panel is clamped to the full viewport. */
  boundsSelector?: string;
}

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

function GripGlyph() {
  return (
    <svg className="fs-fp-grip" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="4" r="1" fill="currentColor" />
      <circle cx="10" cy="4" r="1" fill="currentColor" />
      <circle cx="6" cy="8" r="1" fill="currentColor" />
      <circle cx="10" cy="8" r="1" fill="currentColor" />
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const GAP = 16;

function measureBounds(selector?: string): Bounds {
  const el = selector ? (document.querySelector(selector) as HTMLElement | null) : null;
  if (el) {
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }
  return { left: 0, top: 0, width: window.innerWidth || 0, height: window.innerHeight || 0 };
}

export function FloatingPanel({ open, onClose, title, children, cascadeIndex = 0, boundsSelector }: FloatingPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Position is stored in bounds-LOCAL coords (0,0 = bounds top-left); the applied
  // fixed transform adds the bounds origin. So clampPanelPosition stays a simple
  // [0,max] clamp and the panel rides along if the bounds move (resize).
  const [pos, setPos] = useState<Pos | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [z, setZ] = useState(() => nextZ());
  const drag = useRef<{ pointerId: number; startX: number; startY: number; from: Pos; panel: { w: number; h: number }; b: Bounds } | null>(null);

  const raiseToFront = () => setZ(nextZ());

  // On open: measure the bounds, place the panel (cascaded from the bounds'
  // top-right), move focus to Close, capture the opener, raise to front, and wire
  // Esc + resize re-clamp. Keyed on `open` so a reopen recomputes. useLayoutEffect
  // so the placement lands before paint (no flash); jsdom has no geometry → zeros.
  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const b = measureBounds(boundsSelector);
    const pw = panel?.offsetWidth ?? 0;
    const ph = panel?.offsetHeight ?? 0;
    // Open anchored to the bounds' top-right. A second panel (cascadeIndex>0) sits
    // one panel-width to its LEFT when there's room (both fully visible side by
    // side); on a narrow surface it falls back to a small diagonal cascade.
    const xRight = b.width - pw - GAP;
    const sideX = xRight - cascadeIndex * (pw + GAP);
    const useSide = sideX >= GAP;
    const rawX = useSide ? sideX : xRight - cascadeIndex * 32;
    const rawY = useSide ? GAP : GAP + cascadeIndex * 32;
    setBounds(b);
    setPos(clampPanelPosition({ x: rawX, y: rawY }, { w: pw, h: ph }, { w: b.width, h: b.height }));
    setZ(nextZ());

    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const el = panelRef.current;
      if (!el || !el.contains(document.activeElement)) return;
      e.stopPropagation();
      const opener = openerRef.current;
      onCloseRef.current();
      if (opener?.isConnected) opener.focus();
    };
    const onResize = () => {
      const el = panelRef.current;
      if (!el) return;
      const nb = measureBounds(boundsSelector);
      setBounds(nb);
      setPos((prev) =>
        prev ? clampPanelPosition(prev, { w: el.offsetWidth, h: el.offsetHeight }, { w: nb.width, h: nb.height }) : prev,
      );
    };
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open, cascadeIndex, boundsSelector]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = panelRef.current;
    const b = bounds ?? measureBounds(boundsSelector);
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      from: pos ?? { x: 0, y: 0 },
      panel: { w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0 },
      b,
    };
    raiseToFront();
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    setPos(
      clampPanelPosition(
        { x: d.from.x + (e.clientX - d.startX), y: d.from.y + (e.clientY - d.startY) },
        d.panel,
        { w: d.b.width, h: d.b.height },
      ),
    );
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const x = (bounds?.left ?? 0) + (pos?.x ?? 0);
  const y = (bounds?.top ?? 0) + (pos?.y ?? 0);

  return (
    <aside
      ref={panelRef}
      className="fs-fp"
      role="dialog"
      aria-label={title}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        maxHeight: bounds ? `${Math.max(0, bounds.height - 2 * GAP)}px` : undefined,
        zIndex: z,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onPointerDownCapture={raiseToFront}
    >
      <div
        className="fs-drawer-head fs-fp-handle"
        title="Drag to move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <GripGlyph />
        <h2 className="fs-drawer-title">{title}</h2>
        <button
          ref={closeRef}
          type="button"
          className="fs-drawer-close"
          aria-label="Close"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
        >
          <CloseGlyph />
        </button>
      </div>
      <div className="fs-fp-body fs-drawer-body">{children}</div>
    </aside>
  );
}
