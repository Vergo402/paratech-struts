import { MeasurementInput } from 'fieldshore-v4';

// MeasurementInput — gloved opening entry (KB-3): typed feet + inches with an
// eighths tap-strip for the fraction. Controlled on exact eighths-of-an-inch
// (ADR-012; 8 eighths = 1″). Static onChange here — the screenshot freezes the
// value, the strip shows the selected fraction highlighted.
const noop = () => {};

// feet/inches/eighths → exact eighths.
const E = (inches: number, n = 0) => inches * 8 + n;
const FT = (feet: number, inches: number, n = 0) => (feet * 12 + inches) * 8 + n;

export const Empty = () => (
  <MeasurementInput label="Opening measurement" value={0} onChange={noop} />
);

export const WithFraction = () => (
  // 47 3/8″ — a clean header-to-floor opening with the 3/8 eighth selected.
  <MeasurementInput label="Opening measurement" value={E(47, 3)} onChange={noop} />
);

export const FeetAndInches = () => (
  // 7′ 9 5/8″ — a LongShore-scale opening; the feet box fills, inches carry the remainder.
  <MeasurementInput label="Opening measurement" value={FT(7, 9, 5)} onChange={noop} />
);
