import { useLayoutEffect, useState, type RefObject } from 'react';
import type { OrgPositions } from '@core/schema';

// SVG connector layer for the org chart (#373). Replaces the old CSS
// `::before/::after` elbow borders, which drew broken/uneven lines because each
// segment was pinned to a fixed pseudo-element geometry rather than the real card
// positions. Here we measure the rendered node boxes and draw one uniform SVG path
// set from that live geometry.
//
// Measurement is an OFFSET-WALK (offsetLeft/offsetTop up to the canvas), NOT
// getBoundingClientRect — offsets are pre-transform layout coordinates, so the
// identical engine serves both the flat inline chart AND the zoom/pan-transformed
// full-screen view (the <svg> lives inside the transformed canvas and scales with
// it, so connectors stay glued to the cards at any zoom without re-measuring).
//
// The shape of each connector is read straight off the rendered DOM structure
// (`.fs-org-top`, `ul.fs-org-reports--stack`, `.fs-org-staff`) rather than recomputed
// from `positions`, so it can never diverge from what OrgTree actually laid out.

type Seg = { d: string; staff?: boolean };
interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
  mx: number;
  my: number;
}

/**
 * Layout offset of `el` within `canvas` — the offsetParent walk (NOT
 * getBoundingClientRect), so it's pre-transform and zoom-immune. The one primitive
 * behind both boxOf here and OrgChart's center-on-IC; the contract (walk to `canvas`
 * exclusive, use offsetParent) lives in one place so it can't drift.
 */
export function offsetWithin(el: HTMLElement, canvas: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let n: HTMLElement | null = el; n && n !== canvas; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}

// Position of `el` relative to the canvas content box (immune to the canvas transform).
function boxOf(el: HTMLElement, canvas: HTMLElement): Box {
  const { x, y } = offsetWithin(el, canvas);
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  return { l: x, t: y, r: x + w, b: y + h, mx: x + w / 2, my: y + h / 2 };
}

function compute(canvas: HTMLElement): { segs: Seg[]; w: number; h: number } {
  const segs: Seg[] = [];
  // Each `.fs-org-top` holds one parent card (+ its optional command-staff cluster).
  for (const top of canvas.querySelectorAll<HTMLElement>('.fs-org-top')) {
    const parentEl = top.querySelector<HTMLElement>(':scope > [data-org-node]');
    if (!parentEl) continue;
    const pb = boxOf(parentEl, canvas);

    // Command staff — a dashed L-bridge from the parent's right edge to each card.
    for (const s of top.querySelectorAll<HTMLElement>(':scope > .fs-org-staff > [data-org-node]')) {
      const sb = boxOf(s, canvas);
      const stemX = pb.r + 17;
      segs.push({ d: `M${pb.r} ${pb.my}H${stemX}V${sb.my}H${sb.l}`, staff: true });
    }

    // Reports — the sibling <ul> within the same <li>.
    const li = top.parentElement;
    const ul = li?.querySelector<HTMLElement>(':scope > ul.fs-org-reports');
    if (!ul) continue;
    const reportEls = [...ul.querySelectorAll<HTMLElement>(':scope > li > .fs-org-top > [data-org-node]')];
    if (!reportEls.length) continue;
    const boxes = reportEls.map((e) => boxOf(e, canvas));

    if (ul.classList.contains('fs-org-reports--stack')) {
      // Bottom-most leaf level: an indented vertical spine with elbows (file-tree).
      const spineX = pb.l + 15;
      const last = boxes[boxes.length - 1]!;
      segs.push({ d: `M${spineX} ${pb.b}V${last.my}` });
      for (const b of boxes) segs.push({ d: `M${spineX} ${b.my}H${b.l}` });
    } else {
      // A row: parent down-stem to a horizontal bus, then a drop to each child.
      const busY = pb.b + (boxes[0]!.t - pb.b) / 2;
      segs.push({ d: `M${pb.mx} ${pb.b}V${busY}` });
      if (boxes.length > 1) {
        const minX = Math.min(...boxes.map((b) => b.mx));
        const maxX = Math.max(...boxes.map((b) => b.mx));
        segs.push({ d: `M${minX} ${busY}H${maxX}` });
      }
      for (const b of boxes) segs.push({ d: `M${b.mx} ${busY}V${b.t}` });
    }
  }
  return { segs, w: canvas.scrollWidth, h: canvas.scrollHeight };
}

/**
 * Renders the connector <svg> and keeps it in sync with the rendered tree. Mount it as
 * the first child of a `position: relative` `.fs-org-canvas` that also contains the
 * `.fs-org-tree`. `deps` (the positions map) re-measures when the structure changes; a
 * ResizeObserver catches font-load / reflow. No-ops cleanly at 0 size (jsdom, pre-layout).
 */
export function OrgConnectors({ canvasRef, deps }: { canvasRef: RefObject<HTMLElement | null>; deps: OrgPositions }) {
  const [st, setSt] = useState<{ segs: Seg[]; w: number; h: number }>({ segs: [], w: 0, h: 0 });

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const measure = () => {
      const c = canvasRef.current;
      if (!c || !c.offsetWidth) return; // pre-layout / jsdom → leave the last good paint
      setSt(compute(c));
    };
    measure(); // synchronous (pre-paint) so connectors appear with the first frame
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(canvas);
    }
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [canvasRef, deps]);

  return (
    <svg className="fs-org-links" width={st.w} height={st.h} aria-hidden="true">
      {st.segs.map((s, i) => (
        <path key={i} d={s.d} className={s.staff ? 'is-staff' : undefined} />
      ))}
    </svg>
  );
}
