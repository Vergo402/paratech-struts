import { StrutFitDiagram } from 'fieldshore-v4';

// StrutFitDiagram — the "the strut that fits" welcome-slide line drawing: a
// vertical strut braced between a top header and the floor, end plates top and
// bottom. No props — fixed inline-SVG keyed to `.fs-ob-diagram` (128×96, stroke
// = --accent/gold). Shown in the onboarding frame and on a teaching slide.

const frame = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12,
};

export const Diagram = () => (
  <div style={frame}>
    <StrutFitDiagram />
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
    <StrutFitDiagram />
    <strong style={{ fontSize: 18 }}>Brace the opening</strong>
    <span style={{ color: 'var(--text-secondary)', maxWidth: '36ch' }}>
      A LongShore 812 set between header and footer — plates top and bottom carry the load.
    </span>
  </div>
);
