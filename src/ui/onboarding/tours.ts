/**
 * Guided-tip tours — each step anchors a coachmark to a real element on a live
 * screen (queried by `data-tour`). Copy obeys voice-and-tone.md: terse, present
 * tense, imperative, no exclamation marks, every step tying an app action to the
 * field moment it serves. The Quick Find lesson runs on real, record-free screens
 * (a calculator writes nothing) — so it's practice by construction.
 */
export interface TourStep {
  /** Matches a `data-tour="…"` attribute on the target element. */
  anchor: string;
  title: string;
  body: string;
}

/** Pseudo-lesson id for the welcome intro (tracked in doneLessons like a lesson). */
export const LESSON_WELCOME = 'welcome';
export const LESSON_QUICK_FIND = 'quickfind';

export const QUICK_FIND_TOUR: TourStep[] = [
  {
    anchor: 'qf-measurement',
    title: 'Enter the raw opening measurement',
    body: `Enter the entire measurement that you took, either in Feet and Inches (8' 6"), or just Inches, then tap the fraction to the closest 1/8th. Do not deduct anything. This is the gap the entire strut system has to span.`,
  },
  {
    anchor: 'qf-deductions',
    title: 'Account for wood and plates',
    body: 'Add header, footer, connector, or base-plate deductions so the strut length is right.',
  },
  {
    anchor: 'qf-load',
    title: 'Add the load',
    body: 'A weight estimate flags capacity. It does not change which strut fits, so leave it blank if unknown.',
  },
  {
    anchor: 'qf-find',
    title: 'Find the appropriate struts',
    body: 'The app lists every manufactured Paratech strut rated for this opening. Nothing here is saved towards an operation, pulled, referenced, or assigned from department inventory — try it now.',
  },
];
