import { useState } from 'react';
import { Button, Modal } from '@ui/primitives';
import { MeasureOpeningDiagram, StrutFitDiagram, ChecklistDiagram } from './diagrams';

/**
 * Welcome — the stepped first-run intro (a Modal stop surface, reusing the
 * primitive's focus trap + scrim). Leads with the field reality (size up the
 * opening → the app picks the strut), then hands off to the checklist. Always
 * skippable: Skip and the backdrop/Esc both dismiss the whole tour.
 */
const SLIDES = [
  {
    Diagram: MeasureOpeningDiagram,
    title: 'Measure the opening',
    body: 'Size up a gap, void, or opening that needs to be secured. FieldShore turns that measurement into the appropriate strut and wood shore that holds it.',
  },
  {
    Diagram: StrutFitDiagram,
    title: 'Get the strut that fits',
    body: 'Enter the measurement in Quick Find and the app returns the Paratech struts rated for that span — no manual lookup.',
  },
  {
    Diagram: ChecklistDiagram,
    title: 'Learn by doing',
    body: 'A short checklist walks you through the app on real screens. Nothing here is saved, so practice freely — and replay it anytime from Settings.',
  },
] as const;

export interface WelcomeProps {
  /** Finished the intro → on to the checklist hub. */
  onDone: () => void;
  /** Skipped the whole tour. */
  onSkip: () => void;
}

export function Welcome({ onDone, onSkip }: WelcomeProps) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  if (!slide) return null;
  const last = i === SLIDES.length - 1;
  const Diagram = slide.Diagram;

  return (
    <Modal
      open
      title={slide.title}
      onClose={onSkip}
      footer={
        <>
          {i > 0 && (
            <Button variant="tertiary" size="standard" onPress={() => setI((n) => n - 1)}>
              Back
            </Button>
          )}
          <Button variant="tertiary" size="standard" onPress={onSkip}>
            Skip
          </Button>
          <Button
            variant="primary"
            size="standard"
            onPress={() => (last ? onDone() : setI((n) => n + 1))}
          >
            {last ? 'Get started' : 'Next'}
          </Button>
        </>
      }
    >
      <div className="fs-ob-welcome">
        <div className="fs-ob-diagram-frame">
          <Diagram />
        </div>
        <p className="fs-ob-body">{slide.body}</p>
        <ol className="fs-ob-dots" aria-hidden="true">
          {SLIDES.map((_, n) => (
            <li key={n} className={n === i ? 'is-on' : ''} />
          ))}
        </ol>
      </div>
    </Modal>
  );
}
