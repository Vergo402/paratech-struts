import { MeasurementValue } from 'fieldshore-v4';

// MeasurementValue — read-only measurement renderer (ADR-028). Inter value font,
// tabular figures, eighths as DIAGONAL fractions. Values are exact eighths ints
// end-to-end; nothing here rounds. 8 eighths = 1 inch.

// Helpers to keep the cells readable: feet/inches/eighths → exact eighths.
const E = (inches: number, n: number = 0) => inches * 8 + n; // n in eighths
const FT = (feet: number, inches: number, n: number = 0) => (feet * 12 + inches) * 8 + n;

const wrap = {
  fontSize: 40,
  display: 'flex',
  gap: 24,
  alignItems: 'baseline',
  flexWrap: 'wrap' as const,
};

export const CutSheet = () => (
  <div style={wrap}>
    <MeasurementValue eighths={E(93, 5)} /> {/* 93 5/8″ */}
    <MeasurementValue eighths={E(47, 3)} /> {/* 47 3/8″ */}
  </div>
);

export const FeetInches = () => (
  <div style={wrap}>
    <MeasurementValue eighths={FT(7, 9, 5)} form="feet-inches" /> {/* 7′ 9 5/8″ */}
    <MeasurementValue eighths={FT(11, 0)} form="feet-inches" /> {/* 11′ 0″ */}
  </div>
);

export const Whole = () => (
  <div style={wrap}>
    <MeasurementValue eighths={E(48, 0)} /> {/* 48″ */}
    <MeasurementValue eighths={E(132, 0)} /> {/* 132″ */}
  </div>
);

export const Negative = () => (
  <div style={wrap}>
    {/* An over-deducted effective length reads as a deficit. */}
    <MeasurementValue eighths={-E(1, 4)} /> {/* −1 1/2″ */}
  </div>
);
