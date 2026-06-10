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
});

describe('MeasurementValue', () => {
  it('renders stacked real-digit fraction markup, never codepoint glyphs', () => {
    const { container } = render(<MeasurementValue eighths={749} />);
    expect(container.textContent).toBe('9358″');
    const fr = container.querySelector('.fr');
    expect(fr).not.toBeNull();
    expect(fr!.querySelector('.n')!.textContent).toBe('5');
    expect(fr!.querySelector('.d')!.textContent).toBe('8');
  });

  it('omits the fraction for whole values', () => {
    const { container } = render(<MeasurementValue eighths={8 * 24} />);
    expect(container.textContent).toBe('24″');
    expect(container.querySelector('.fr')).toBeNull();
  });

  it('renders feet-inches form and a leading minus for negatives', () => {
    const { container: a } = render(<MeasurementValue eighths={749} form="feet-inches" />);
    expect(a.textContent).toBe('7′ 958″');
    const { container: b } = render(<MeasurementValue eighths={-12} />);
    expect(b.textContent).toBe('−112″');
  });
});
