import { act, fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Test-only driver for the Slider's pointer path — the ONLY commit path there
 * is (ADR-026: gesture only, no button twin). jsdom (25) has no PointerEvent,
 * so pointer* events are dispatched as MouseEvents (which DO carry clientX —
 * a plain fireEvent.pointerMove drops it and the drag never moves), and the
 * track/thumb rects are mocked for the duration of one drag: travel =
 * 240 − 48 − 8 = 184px, the 0.6 threshold (finalized in S12) needs ≥111px
 * (0.6 × 184 = 110.4). Direction is read from `.fs-slide--stepback` and the
 * drag mirrors automatically.
 */

const rect = (width: number): DOMRect =>
  ({ width, height: 56, top: 0, left: 0, right: width, bottom: 56, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;

const pointer = (type: string, clientX: number) =>
  new MouseEvent(type, { bubbles: true, cancelable: true, clientX });

/** Resolve a Slider root from its visible label text. */
export function getSlide(label: string): HTMLElement {
  const root = screen.getByText(label).closest('.fs-slide');
  if (!root) throw new Error(`No .fs-slide contains the label "${label}"`);
  return root as HTMLElement;
}

/**
 * Drag the thumb `distancePx` along the slide's direction and release.
 * Accepts the slide's label text, its `.fs-slide` root, or any element inside
 * it. Full travel is 184px; the default commits, sub-threshold distances
 * release without committing, and a disabled slider stays inert throughout.
 * Async: commit handlers may await (e.g. device uid → commit) — the trailing
 * act() flushes those microtasks the way an awaited user-event click would.
 */
export async function dragSlide(
  target: string | HTMLElement,
  distancePx = 184,
  endEvent: 'pointerup' | 'pointercancel' = 'pointerup',
): Promise<void> {
  const el = typeof target === 'string' ? getSlide(target) : target;
  const root = (el.classList.contains('fs-slide') ? el : el.closest('.fs-slide')) as HTMLElement | null;
  if (!root) throw new Error('dragSlide target is not inside a .fs-slide');
  const track = root.querySelector('.fs-slide-track') as HTMLElement | null;
  const thumb = root.querySelector('.fs-slide-thumb') as HTMLElement | null;
  if (!track || !thumb) throw new Error('Slide is missing its track or thumb');

  const sign = root.classList.contains('fs-slide--stepback') ? -1 : 1;
  const trackSpy = vi.spyOn(track, 'getBoundingClientRect').mockReturnValue(rect(240));
  const thumbSpy = vi.spyOn(thumb, 'getBoundingClientRect').mockReturnValue(rect(48));
  try {
    fireEvent(thumb, pointer('pointerdown', 400));
    fireEvent(thumb, pointer('pointermove', 400 + sign * distancePx));
    fireEvent(thumb, pointer(endEvent, 400 + sign * distancePx));
    await act(async () => {});
  } finally {
    trackSpy.mockRestore();
    thumbSpy.mockRestore();
  }
}

/** A full drag past the commit threshold. */
export async function slideToCommit(target: string | HTMLElement): Promise<void> {
  await dragSlide(target, 184);
}

/** A full past-threshold drag that ends in pointercancel — must NOT commit. */
export async function cancelSlide(target: string | HTMLElement): Promise<void> {
  await dragSlide(target, 184, 'pointercancel');
}
