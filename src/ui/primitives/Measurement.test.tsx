// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { MeasurementValue, eighthsToParts } from './Measurement';

describe('eighthsToParts', () => {
  it('splits and reduces ⅛″-family fractions', () => {
    expect(eighthsToParts(0)).toMatchObject({ totalInches: 0, n: 0, d: 1, negative: false });
    expect(eighthsToParts(5)).toMatchObject({ totalInches: 0, n: 5, d: 8 }); // 5/8
    expect(eighthsToParts(4)).toMatchObject({ totalInches: 0, n: 1, d: 2 }); // 4/8 → 1/2
    expect(eighthsToParts(6)).toMatchObject({ totalInches: 0, n: 3, d: 4 }); // 6/8 → 3/4
    expect(eighthsToParts(12)).toMatchObject({ totalInches: 1, n: 1, d: 2 }); // 12 eighths = 1½″
  });

  it('splits feet for the field read-back form', () => {
    // 93⅝″ = 7′ 9⅝″ = 749 eighths
    expect(eighthsToParts(749)).toMatchObject({ feet: 7, inches: 9, totalInches: 93, n: 5, d: 8 });
  });

  it('flags negatives without mangling parts', () => {
    expect(eighthsToParts(-12)).toMatchObject({ totalInches: 1, n: 1, d: 2, negative: true });
  });

  it('negative zero carries the sign — a −0″ deduction reads as a deduction (KB-4)', () => {
    expect(eighthsToParts(-0)).toMatchObject({ totalInches: 0, n: 0, d: 1, negative: true });
    expect(eighthsToParts(0)).toMatchObject({ negative: false });
  });
});

describe('MeasurementValue', () => {
  it('emits plain "n/d" text for the font to compose diagonally — never stacked markup or codepoint glyphs (ADR-028)', () => {
    const { container } = render(<MeasurementValue eighths={749} />);
    // 93 5/8″ — the space before the fraction lets diagonal-fractions compose "5/8", not "935/8".
    expect(container.textContent).toBe('93 5/8″');
    expect(container.querySelector('.fs-meas')).not.toBeNull();
    expect(container.querySelector('.fr')).toBeNull(); // stacked form retired (ADR-028)
  });

  it('omits the fraction for whole values', () => {
    const { container } = render(<MeasurementValue eighths={8 * 24} />);
    expect(container.textContent).toBe('24″');
  });

  it('renders feet-inches form and a leading minus for negatives', () => {
    const { container: a } = render(<MeasurementValue eighths={749} form="feet-inches" />);
    expect(a.textContent).toBe('7′ 9 5/8″');
    const { container: b } = render(<MeasurementValue eighths={-12} />);
    expect(b.textContent).toBe('−1 1/2″');
  });
});
