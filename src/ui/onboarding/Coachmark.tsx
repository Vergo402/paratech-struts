import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@ui/primitives';
import type { TourStep } from './tours';

/**
 * Coachmark — the guided-tip runner. A self-positioned bubble (portaled to
 * <body>, fixed) that points at each step's live `data-tour` target and walks
 * the steps via Next/Back/Skip/Done. Deliberately NOT a Popover: it must let the
 * user work the real screen (open deductions, pick a plate, run the search)
 * WITHOUT being dismissed — so it never claims the one-overlay slot (overlay.ts)
 * and never closes on an outside tap (that bug bounced the checklist hub back up
 * mid-tour). It exits only on an explicit Skip. The bubble sits BELOW the screen's
 * own picker/sheet scrims (z-index), so a plate grid or results sheet opened from
 * a step rises over it and the tip reappears when that overlay closes.
 */
export interface CoachmarkProps {
  steps: TourStep[];
  /** Walked every step. */
  onComplete: () => void;
  /** Left the lesson early (explicit Skip only). */
  onExit: () => void;
}

interface Pos {
  top: number;
  left: number;
}

export function Coachmark({ steps, onComplete, onExit }: CoachmarkProps) {
  const [i, setI] = useState(0);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const step = steps[i];

  // Resolve the step's target on the live screen (retry briefly while the screen
  // mounts after a route change).
  useEffect(() => {
    if (!step) return;
    setTarget(null);
    const anchor = step.anchor;
    let raf = 0;
    let tries = 0;
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      if (el) {
        el.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        setTarget(el);
      } else if (tries++ < 60) {
        raf = requestAnimationFrame(find);
      }
    };
    find();
    return () => cancelAnimationFrame(raf);
  }, [step]);

  // Ring the active target so the tip clearly points at it.
  useEffect(() => {
    if (!target) return;
    target.classList.add('fs-coachmark-target');
    return () => target.classList.remove('fs-coachmark-target');
  }, [target]);

  // Position the bubble from the target rect; follow scroll/resize. A second pass
  // after first paint uses the bubble's measured height to flip above when there's
  // no room below. No overlay claim, no outside-dismiss.
  useLayoutEffect(() => {
    if (!target) return;
    const place = () => {
      const r = target.getBoundingClientRect();
      const b = bubbleRef.current;
      const bh = b?.offsetHeight ?? 0;
      const bw = b?.offsetWidth ?? 300;
      const m = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fitsBelow = r.bottom + m + bh <= vh;
      const top = fitsBelow ? r.bottom + m : Math.max(m, r.top - m - bh);
      const left = Math.max(m, Math.min(r.left, vw - bw - m));
      setPos({ top, left });
    };
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [target, i]);

  if (!target || !step) return null;
  const last = i === steps.length - 1;

  return createPortal(
    <div
      ref={bubbleRef}
      className="fs-coachmark"
      role="dialog"
      aria-label={step.title}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
    >
      <p className="fs-coachmark-step">
        Step {i + 1} of {steps.length}
      </p>
      <h3 className="fs-coachmark-title">{step.title}</h3>
      <p className="fs-coachmark-body">{step.body}</p>
      <div className="fs-coachmark-actions">
        <Button variant="tertiary" size="standard" onPress={onExit}>
          Skip
        </Button>
        {i > 0 && (
          <Button variant="tertiary" size="standard" onPress={() => setI((n) => n - 1)}>
            Back
          </Button>
        )}
        <Button
          variant="primary"
          size="standard"
          onPress={() => (last ? onComplete() : setI((n) => n + 1))}
        >
          {last ? 'Done' : 'Next'}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
