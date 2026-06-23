import { ChecklistDiagram } from 'fieldshore-v4';

// ChecklistDiagram — the "learn by doing, at your own pace" welcome-slide line
// drawing: a clipboard with two checked rows and one open box. No props — fixed
// inline-SVG keyed to `.fs-ob-diagram` (128×96, stroke = --accent/gold). Shown in
// the onboarding frame and on a teaching slide.

const frame = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
};

export const Diagram = () => (
  <div style={frame}>
    <ChecklistDiagram />
  </div>
);

export const OnSlide = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      textAlign: 'center',
      maxWidth: 320,
    }}
  >
    <ChecklistDiagram />
    <strong style={{ fontSize: 18 }}>Work the checklist</strong>
    <span style={{ color: 'var(--text-secondary)', maxWidth: '36ch' }}>
      Step through size-up, brace, and cut at your own pace — the IC checklist tracks it.
    </span>
  </div>
);
