import { useEffect, useRef, useState, type RefObject } from 'react';
import type { OrgPositions, OrgResourceRef } from '@core/schema';
import { childrenOf, isAncestorOrSelf, leaderOf, nextChildOrder, orderForSlot } from '@core/org';
import { newId } from '@core/id';
import { useIsDesktop, tapHaptic } from '@ui/primitives';
import { useOrgCommit } from './useOrgCommit';

// Drag-and-drop controller for the command org chart (#323). One state machine drives
// BOTH dragging a position card and dragging a roster chip. Pickup is surface-adaptive
// (ADR-032): a grab handle on desktop (drag starts immediately), press-and-hold OR drag
// on the card body on phone (a quick tap still opens the node sheet). Hand-rolled Pointer
// Events — the proven Slider/FloatingPanel idiom (setPointerCapture + touch-action) —
// so no dnd dependency. Drag is an ADDITIVE enhancement: the node-sheet Move… buttons
// stay the keyboard/AT path, and every drop commits the SAME core events.

const HOLD_MS = 180; //     press-and-hold before a body lift (phone)
const MOVE_BUDGET = 8; //   finger travel that turns a press into a drag (and the tap tolerance)
const ARM_MOVE = 3; //      px before an immediate (grip/chip) drag shows its ghost
// ponytail: fixed band/speed — wire to settings only if a field user asks for it.
const EDGE_BAND = 56; //    px from a scroller's edge where drag auto-pan begins
const EDGE_SPEED = 18; //   px/frame of auto-pan at the very edge (ramps from 0 at the band's inner lip)

export type DragSource = { kind: 'node'; id: string } | { kind: 'chip'; resource: OrgResourceRef };
export type DropTarget =
  | { type: 'gap'; parentId: string; index: number } //  reorder among a parent's children
  | { type: 'lead'; id: string } //                      become this position's supervisor
  | { type: 'child'; id: string }; //                    become a subordinate of this position
export interface GapBox {
  parentId: string;
  index: number;
  left: number;
  top: number;
  width: number;
  height: number;
  vertical: boolean;
}
export interface OrgDrag {
  source: DragSource;
  label: string; //   ghost headline
  x: number; //       ghost position, container-relative
  y: number;
  action: string; //  ghost action line (Supervisor of X / Subordinate of X / Reorder)
  target: DropTarget | null;
  gaps: GapBox[];
}

// ── Pure validity (mirrors the reducer guards so the UI never offers an illegal drop) ─
function sourceIsResource(s: DragSource, positions: OrgPositions): boolean {
  return s.kind === 'chip' || positions[s.id]?.kind === 'single-resource';
}
function leadValid(s: DragSource, targetId: string, positions: OrgPositions): boolean {
  if (!sourceIsResource(s, positions)) return false; // only resources can "lead" a position
  if (s.kind === 'node') {
    if (targetId === s.id) return false;
    if (isAncestorOrSelf(positions, s.id, targetId)) return false; // target inside own subtree
  }
  return true;
}
function childValid(s: DragSource, targetId: string, positions: OrgPositions): boolean {
  if (s.kind === 'chip') return true; // a rig can be added under any position
  if (targetId === s.id) return false;
  if (isAncestorOrSelf(positions, s.id, targetId)) return false; // cycle
  if (positions[s.id]?.parentId === targetId) return false; // already a child here (no-op)
  return true;
}
function anyValid(s: DragSource, targetId: string, positions: OrgPositions): boolean {
  return leadValid(s, targetId, positions) || childValid(s, targetId, positions);
}

// Insertion-gap hitboxes: absolute overlays computed from the live rects of the
// rendered siblings (excluding the dragged node), so the nested-<ul> connectors are
// never touched. Orientation auto-detected: a stacked spine (vertical) gets horizontal
// seams, a row gets vertical seams.
function buildGaps(source: DragSource, positions: OrgPositions, container: HTMLElement): GapBox[] {
  if (source.kind !== 'node') return []; // only position cards reorder
  const crect = container.getBoundingClientRect();
  const parents = new Set<string>();
  for (const p of Object.values(positions)) if (p.parentId) parents.add(p.parentId);
  const boxes: GapBox[] = [];
  for (const P of parents) {
    if (P === source.id || isAncestorOrSelf(positions, source.id, P)) continue;
    const sibs = childrenOf(positions, P).filter((s) => s.id !== source.id);
    if (!sibs.length) continue;
    const rects = sibs.map((s) => container.querySelector<HTMLElement>(`[data-org-node="${s.id}"]`)?.getBoundingClientRect() ?? null);
    if (rects.some((r) => r === null)) continue;
    const rs = rects as DOMRect[];
    const minL = Math.min(...rs.map((r) => r.left));
    const maxR = Math.max(...rs.map((r) => r.right));
    const minT = Math.min(...rs.map((r) => r.top));
    const maxB = Math.max(...rs.map((r) => r.bottom));
    const vertical = maxB - minT > maxR - minL;
    for (let i = 0; i <= sibs.length; i++) {
      if (vertical) {
        const cy = i === 0 ? rs[0]!.top - 9 : i === sibs.length ? rs[sibs.length - 1]!.bottom + 9 : (rs[i - 1]!.bottom + rs[i]!.top) / 2;
        boxes.push({ parentId: P, index: i, left: minL - crect.left - 6, top: cy - crect.top - 11, width: maxR - minL + 12, height: 22, vertical });
      } else {
        const cx = i === 0 ? rs[0]!.left - 9 : i === sibs.length ? rs[sibs.length - 1]!.right + 9 : (rs[i - 1]!.right + rs[i]!.left) / 2;
        boxes.push({ parentId: P, index: i, left: cx - crect.left - 11, top: rs[0]!.top - crect.top, width: 22, height: rs[0]!.height, vertical });
      }
    }
  }
  return boxes;
}

function actionText(target: DropTarget | null, positions: OrgPositions): string {
  if (!target) return 'Drag onto a card…';
  if (target.type === 'gap') return 'Reorder';
  if (target.type === 'lead') return `Supervisor of ${positions[target.id]?.title ?? ''}`;
  return `Subordinate of ${positions[target.id]?.title ?? ''}`;
}

// Edge auto-pan ramp: 0 while the pointer is clear of the band, scaling to ±EDGE_SPEED
// at (or past) the scroller's edge so off-screen drop targets come into reach. `pos` is a
// pointer client coord; [lo,hi] the scroller's edge range on that axis. Exported for test.
export function edgeStep(pos: number, lo: number, hi: number): number {
  if (pos < lo + EDGE_BAND) return -Math.ceil((Math.min(EDGE_BAND, lo + EDGE_BAND - pos) / EDGE_BAND) * EDGE_SPEED);
  if (pos > hi - EDGE_BAND) return Math.ceil((Math.min(EDGE_BAND, pos - (hi - EDGE_BAND)) / EDGE_BAND) * EDGE_SPEED);
  return 0;
}

function scrollsY(el: HTMLElement): boolean {
  const oy = getComputedStyle(el).overflowY;
  return (oy === 'auto' || oy === 'scroll' || oy === 'overlay') && el.scrollHeight > el.clientHeight;
}
// Nearest ancestor with its own vertical scroll box. null → pan the window instead.
function scrollParentY(el: HTMLElement | null): HTMLElement | null {
  for (let n = el?.parentElement ?? null; n; n = n.parentElement) if (scrollsY(n)) return n;
  return null;
}

export interface OrgDragApi {
  drag: OrgDrag | null;
  desktop: boolean;
  /** Start a position-card drag. `immediate` (desktop grip) lifts on first move;
   *  otherwise (phone body) it press-and-holds, and a tap opens the node sheet. */
  startNode(e: React.PointerEvent, id: string, immediate: boolean): void;
  startChip(e: React.PointerEvent, resource: OrgResourceRef): void;
  /** True (once) right after a drag, so the node button's onClick swallows the
   *  trailing synthetic click instead of opening the sheet. */
  consumeClick(): boolean;
  roleFor(id: string): 'source' | 'valid' | 'blocked' | null;
  splitFor(id: string): boolean;
  hotZoneFor(id: string): 'top' | 'bottom' | null;
  gapHot(parentId: string, index: number): boolean;
}

interface PressState {
  source: DragSource;
  startX: number;
  startY: number;
  pointerId: number;
  captureEl: HTMLElement;
  mode: 'immediate' | 'hold';
  onTap?: () => void;
  armed: boolean;
  holdTimer: number | null;
}

export function useOrgDragDrop(opts: {
  positions: OrgPositions;
  isIC: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onOpenNode: (id: string) => void;
}): OrgDragApi {
  const desktop = useIsDesktop();
  const commit = useOrgCommit();
  const [drag, setDrag] = useState<OrgDrag | null>(null);

  // Refs so the window listeners and the async commit always read the latest values.
  const positionsRef = useRef(opts.positions);
  positionsRef.current = opts.positions;
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const isICRef = useRef(opts.isIC);
  isICRef.current = opts.isIC;
  const onOpenRef = useRef(opts.onOpenNode);
  onOpenRef.current = opts.onOpenNode;

  const press = useRef<PressState | null>(null);
  const dragRef = useRef<OrgDrag | null>(null); // synchronous mirror for pointerup
  const rafRef = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const edgeRaf = useRef<number | null>(null); //          auto-pan loop while a drag hugs an edge
  const lastPt = useRef({ x: 0, y: 0 }); //                latest pointer client coords (for the pan loop)
  const hScroller = useRef<HTMLElement | null>(null); //   horizontal scroll box (.fs-org-scroll)
  const vScroller = useRef<HTMLElement | null>(null); //   nearest vertical scroll ancestor; null = window

  function setDragBoth(next: OrgDrag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function cleanup() {
    const st = press.current;
    if (st?.holdTimer != null) clearTimeout(st.holdTimer);
    if (st?.armed) {
      try {
        st.captureEl.releasePointerCapture(st.pointerId);
      } catch {
        /* capture may have been lost */
      }
    }
    window.removeEventListener('pointermove', onWinMove);
    window.removeEventListener('pointerup', onWinUp);
    window.removeEventListener('pointercancel', onWinCancel);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (edgeRaf.current != null) cancelAnimationFrame(edgeRaf.current);
    edgeRaf.current = null;
    hScroller.current = null;
    vScroller.current = null;
    press.current = null;
    setDragBoth(null);
  }

  // Edge auto-pan: while a drag is armed and the pointer sits in a scroller's edge band,
  // pan that scroller every frame so off-screen drop targets come into reach. A pan on either
  // axis slides the cards under the (fixed) gap overlays, so we rebuild the gaps + re-hit-
  // test whenever a pan actually moved (update(..., true)); a steady pointer keeps panning.
  function startEdgeLoop() {
    if (edgeRaf.current == null) edgeRaf.current = requestAnimationFrame(edgeTick);
  }
  function edgeTick() {
    const st = press.current;
    if (!st?.armed) {
      edgeRaf.current = null;
      return;
    }
    const { x, y } = lastPt.current;
    let scrolled = false;
    const hs = hScroller.current;
    if (hs) {
      const r = hs.getBoundingClientRect();
      const dx = edgeStep(x, r.left, r.right);
      if (dx) {
        const before = hs.scrollLeft;
        hs.scrollLeft += dx;
        if (hs.scrollLeft !== before) scrolled = true;
      }
    }
    const vs = vScroller.current;
    const vr = vs ? vs.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
    const dy = edgeStep(y, vr.top, vr.bottom);
    if (dy) {
      if (vs) {
        const before = vs.scrollTop;
        vs.scrollTop += dy;
        if (vs.scrollTop !== before) scrolled = true;
      } else {
        const before = window.scrollY;
        window.scrollBy(0, dy);
        if (window.scrollY !== before) scrolled = true;
      }
    }
    if (scrolled) update(x, y, true);
    edgeRaf.current = requestAnimationFrame(edgeTick);
  }

  function arm(clientX: number, clientY: number) {
    const st = press.current;
    const container = opts.containerRef.current;
    if (!st || !container) return;
    st.armed = true;
    if (st.holdTimer != null) {
      clearTimeout(st.holdTimer);
      st.holdTimer = null;
    }
    suppressClick.current = true; // swallow the click that trails this gesture
    tapHaptic();
    try {
      st.captureEl.setPointerCapture(st.pointerId);
    } catch {
      /* capture is best-effort */
    }
    const positions = positionsRef.current;
    const crect = container.getBoundingClientRect();
    const label = st.source.kind === 'chip' ? st.source.resource.label : positions[st.source.id]?.title ?? '';
    setDragBoth({
      source: st.source,
      label,
      x: clientX - crect.left,
      y: clientY - crect.top,
      action: actionText(null, positions),
      target: null,
      gaps: buildGaps(st.source, positions, container),
    });
    const hs = container.querySelector<HTMLElement>('.fs-org-scroll');
    hScroller.current = hs;
    // Desktop: .fs-org-scroll scrolls both axes, so it IS the vertical scroller too.
    // Phone/inline: it's x-only, so the chart's vertical overflow lives on an ancestor.
    vScroller.current = hs && scrollsY(hs) ? hs : scrollParentY(container);
    lastPt.current = { x: clientX, y: clientY };
    startEdgeLoop();
  }

  function hitTest(x: number, y: number, source: DragSource, positions: OrgPositions): DropTarget | null {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    if (source.kind === 'node') {
      const gapEl = el.closest<HTMLElement>('[data-org-gap]');
      if (gapEl) {
        const parentId = gapEl.getAttribute('data-gap-parent');
        const index = Number(gapEl.getAttribute('data-gap-index'));
        if (parentId != null && Number.isFinite(index)) return { type: 'gap', parentId, index };
      }
    }
    const nodeEl = el.closest<HTMLElement>('[data-org-node]');
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-org-node')!;
      const r = nodeEl.getBoundingClientRect();
      if (sourceIsResource(source, positions) && y < r.top + r.height / 2 && leadValid(source, id, positions)) return { type: 'lead', id };
      if (childValid(source, id, positions)) return { type: 'child', id };
    }
    return null;
  }

  // `rebuildGaps` is set when an edge auto-pan scrolled the tree under the (fixed) gap
  // overlays, so the insertion seams + their hit-test rects track the moved cards.
  function update(clientX: number, clientY: number, rebuildGaps = false) {
    const st = press.current;
    const container = opts.containerRef.current;
    const prev = dragRef.current;
    if (!st?.armed || !container || !prev) return;
    const positions = positionsRef.current;
    const crect = container.getBoundingClientRect();
    const target = hitTest(clientX, clientY, st.source, positions);
    setDragBoth({
      ...prev,
      x: clientX - crect.left,
      y: clientY - crect.top,
      target,
      action: actionText(target, positions),
      gaps: rebuildGaps ? buildGaps(st.source, positions, container) : prev.gaps,
    });
  }

  function onWinMove(e: PointerEvent) {
    const st = press.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (!st.armed) {
      if (st.mode === 'immediate') {
        if (Math.abs(dx) > ARM_MOVE || Math.abs(dy) > ARM_MOVE) arm(e.clientX, e.clientY);
      } else if (Math.hypot(dx, dy) > MOVE_BUDGET) {
        // A deliberate drag from the card body lifts it — no dead-still hold required.
        // The card is touch-action:none, so a touch here never scrolls the chart anyway
        // (the chart pans from surrounding whitespace). The hold timer still arms a press
        // that never moves; a quick tap (released under MOVE_BUDGET) still opens the sheet.
        arm(e.clientX, e.clientY);
      }
      return;
    }
    if (e.cancelable) e.preventDefault();
    lastPt.current = { x: e.clientX, y: e.clientY }; // also feeds the edge auto-pan loop
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      update(e.clientX, e.clientY);
    });
  }

  function onWinUp(e: PointerEvent) {
    const st = press.current;
    if (!st || e.pointerId !== st.pointerId) return;
    if (st.armed) {
      const t = dragRef.current?.target ?? null;
      if (t) void commitDrop(t, st.source);
    } else if (st.mode === 'hold' && Math.hypot(e.clientX - st.startX, e.clientY - st.startY) < MOVE_BUDGET) {
      st.onTap?.();
    }
    cleanup();
  }

  function onWinCancel(e: PointerEvent) {
    const st = press.current;
    if (!st || e.pointerId !== st.pointerId) return;
    cleanup(); // scroll began (pre-arm) or the gesture was interrupted (armed) — drop nothing
  }

  async function commitDrop(target: DropTarget, source: DragSource) {
    if (!isICRef.current) return;
    const emit = commitRef.current;
    const positions = positionsRef.current;
    if (target.type === 'gap') {
      if (source.kind !== 'node') return;
      const order = orderForSlot(positions, target.parentId, target.index, source.id);
      if (positions[source.id]?.parentId !== target.parentId) {
        await emit({ type: 'PositionReparented', positionId: source.id, newParentId: target.parentId });
      }
      await emit({ type: 'PositionReordered', positionId: source.id, order });
    } else if (target.type === 'lead') {
      if (source.kind === 'chip') {
        await emit({ type: 'ResourceAssigned', positionId: target.id, resource: source.resource });
      } else {
        // A single-resource card dragged into a supervisor slot becomes the lead line:
        // move its resources onto the target, then remove the now-empty card.
        const node = positions[source.id];
        if (!node) return;
        if (node.builtIn) {
          // Protected built-in can't be removed — fall back to a child-drop.
          await emit({ type: 'PositionReparented', positionId: source.id, newParentId: target.id });
          await emit({ type: 'PositionReordered', positionId: source.id, order: nextChildOrder(positions, target.id) });
        } else {
          const resources = node.assignedResources.length ? node.assignedResources : leaderOf(node) ? [leaderOf(node)!] : [];
          for (const r of resources) await emit({ type: 'ResourceAssigned', positionId: target.id, resource: r });
          await emit({ type: 'PositionRemoved', positionId: source.id });
        }
      }
    } else {
      // child drop
      if (source.kind === 'chip') {
        const id = newId();
        await emit({
          type: 'PositionAdded',
          position: { id, title: source.resource.label, kind: 'single-resource', parentId: target.id, builtIn: false, order: nextChildOrder(positions, target.id), assignedResources: [] },
        });
        await emit({ type: 'ResourceAssigned', positionId: id, resource: source.resource });
      } else {
        await emit({ type: 'PositionReparented', positionId: source.id, newParentId: target.id });
        await emit({ type: 'PositionReordered', positionId: source.id, order: nextChildOrder(positions, target.id) });
      }
    }
  }

  function beginPress(e: React.PointerEvent, source: DragSource, mode: 'immediate' | 'hold', onTap?: () => void) {
    if (!isICRef.current) return; // only the IC restructures (read-only otherwise)
    if (press.current) cleanup();
    const st: PressState = {
      source,
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      captureEl: e.currentTarget as HTMLElement,
      mode,
      onTap,
      armed: false,
      holdTimer: null,
    };
    press.current = st;
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinCancel);
    if (mode === 'hold') st.holdTimer = window.setTimeout(() => arm(st.startX, st.startY), HOLD_MS);
  }

  // Tear down listeners if the chart unmounts mid-drag. Routed through a ref so the
  // effect runs once (unmount) yet always calls the latest cleanup closure.
  const cleanupRef = useRef(cleanup);
  cleanupRef.current = cleanup;
  useEffect(() => () => cleanupRef.current(), []);

  const positions = opts.positions;
  return {
    drag,
    desktop,
    startNode: (e, id, immediate) => beginPress(e, { kind: 'node', id }, immediate ? 'immediate' : 'hold', () => onOpenRef.current(id)),
    startChip: (e, resource) => beginPress(e, { kind: 'chip', resource }, 'immediate'),
    consumeClick: () => {
      if (!suppressClick.current) return false;
      suppressClick.current = false;
      return true;
    },
    roleFor: (id) => {
      if (!drag) return null;
      if (drag.source.kind === 'node' && drag.source.id === id) return 'source';
      return anyValid(drag.source, id, positions) ? 'valid' : 'blocked';
    },
    splitFor: (id) => !!drag && leadValid(drag.source, id, positions),
    hotZoneFor: (id) => {
      const t = drag?.target;
      if (!t) return null;
      if (t.type === 'lead' && t.id === id) return 'top';
      if (t.type === 'child' && t.id === id) return 'bottom';
      return null;
    },
    gapHot: (parentId, index) => {
      const t = drag?.target;
      return !!t && t.type === 'gap' && t.parentId === parentId && t.index === index;
    },
  };
}
