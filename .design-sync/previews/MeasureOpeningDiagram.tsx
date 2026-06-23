import { MeasureOpeningDiagram } from 'fieldshore-v4';

// MeasureOpeningDiagram — the "size up the gap" welcome-slide line drawing: a
// collapse opening (door/void) with a vertical measurement arrow. No props — a
// fixed inline-SVG keyed to `.fs-ob-diagram` (128×96, stroke = --accent/gold).
// We render it inside the real onboarding frame so the box sizes it as shipped,
// plus a slide mock where it teaches "measure the opening first."

const frame = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
};

export const Diagram = () => (
  <div style={frame}>
    <MeasureOpeningDiagram />
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
    <MeasureOpeningDiagram />
    <strong style={{ fontSize: 18 }}>Size up the opening</strong>
    <span style={{ color: 'var(--text-secondary)', maxWidth: '36ch' }}>
      Measure the void floor-to-header — that raw opening drives every strut that fits.
    </span>
  </div>
);
