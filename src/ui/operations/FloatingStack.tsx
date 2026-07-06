import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * FloatingStack — the movable inventory-glance + task-checklist cluster
 * (Alex, Stage 2a review): the two board companions ride ONE floating stack
 * that can be dragged anywhere and snaps to the nearest screen edge, so it
 * never has a fixed claim on content. Replaces the phone header inventory
 * icon, the desktop utility Inventory button, and the ops ChecklistTab.
 *
 * Drag mechanics mirror the org-chart press pattern: a ≤6px pointer travel is
 * a TAP (the buttons fire normally); past it the whole stack drags. On release
 * it glides to the closer left/right edge and the spot persists (viewport-
 * fraction y, so rotation keeps it proportionally placed).
 */

const STORE_KEY = 'fieldshore_ops_stack';
const EDGE = 8; // px inset from the snapped edge
const DRAG_THRESHOLD = 6;

interface StackPos {
  side: 'left' | 'right';
  /** Top edge as a fraction of viewport height. */
  y: number;
}

const DEFAULT_POS: StackPos = { side: 'right', y: 0.5 };

function readPos(): StackPos {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return DEFAULT_POS;
    const p = JSON.parse(raw) as StackPos;
    if ((p.side === 'left' || p.side === 'right') && typeof p.y === 'number') {
      return { side: p.side, y: Math.min(0.85, Math.max(0.08, p.y)) };
    }
  } catch {
    /* corrupt → default */
  }
  return DEFAULT_POS;
}

function InventoryGlyph() {
  // The SAME 3D-box glyph as the Inventory nav tab (navTabs.tsx).
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4M4 7l8 4M4 7v10l8 4m0-10v10" />
    </svg>
  );
}

function ChecklistGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="2.5" width="14" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 9.5L9 12L13.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FloatingStack({
  inventoryOpen,
  onInventory,
  checklistOpen,
  onChecklist,
}: {
  inventoryOpen: boolean;
  onInventory: () => void;
  checklistOpen: boolean;
  onChecklist: () => void;
}) {
  const [pos, setPos] = useState<StackPos>(readPos);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const dragged = useRef(false);
  // The live drag position in a ref too — pointerup must not depend on React
  // having flushed the last pointermove render (a fast flick can beat it).
  const last = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    start.current = { px: e.clientX, py: e.clientY, x: r.left, y: r.top };
    dragged.current = false;
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!dragged.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragged.current = true;
    last.current = { x: s.x + dx, y: s.y + dy };
    setDrag(last.current);
  }, []);

  const onPointerUp = useCallback(() => {
    const s = start.current;
    start.current = null;
    const at = last.current;
    last.current = null;
    if (!s || !dragged.current || !at) {
      setDrag(null);
      return;
    }
    const w = ref.current?.getBoundingClientRect().width ?? 48;
    const side: StackPos['side'] = at.x + w / 2 < window.innerWidth / 2 ? 'left' : 'right';
    const y = Math.min(0.85, Math.max(0.08, at.y / window.innerHeight));
    const next = { side, y };
    setPos(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* full/blocked storage: position just doesn't persist */
    }
    setDrag(null);
  }, []);

  // A completed drag must not fire the button under the finger.
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragged.current) {
      e.preventDefault();
      e.stopPropagation();
      dragged.current = false;
    }
  }, []);

  // Keep the resting spot clamped if the viewport shrinks under it.
  useEffect(() => {
    const clamp = () => setPos((p) => ({ ...p, y: Math.min(0.85, Math.max(0.08, p.y)) }));
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  const style: React.CSSProperties = drag
    ? { left: drag.x, top: drag.y }
    : pos.side === 'left'
      ? { left: EDGE, top: `${pos.y * 100}vh` }
      : { right: EDGE, top: `${pos.y * 100}vh` };

  return (
    <div
      ref={ref}
      className={`fs-stack${drag ? ' is-dragging' : ''}`}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      <span className="fs-stack-grip" aria-hidden="true">
        <svg width="14" height="5" viewBox="0 0 14 5" fill="currentColor">
          <circle cx="3" cy="2.5" r="1.2" />
          <circle cx="7" cy="2.5" r="1.2" />
          <circle cx="11" cy="2.5" r="1.2" />
        </svg>
      </span>
      <button
        type="button"
        className={`fs-stack-btn${inventoryOpen ? ' is-active' : ''}`}
        aria-label={inventoryOpen ? 'Close inventory summary' : 'Open inventory summary'}
        aria-pressed={inventoryOpen}
        onClick={onInventory}
      >
        <InventoryGlyph />
      </button>
      <button
        type="button"
        className={`fs-stack-btn${checklistOpen ? ' is-active' : ''}`}
        aria-label="Task Level Checklist"
        aria-pressed={checklistOpen}
        onClick={onChecklist}
      >
        <ChecklistGlyph />
      </button>
    </div>
  );
}
