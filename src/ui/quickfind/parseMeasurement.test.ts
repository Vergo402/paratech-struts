import { describe, it, expect } from 'vitest';
import { parseMeasurement } from './parseMeasurement';

describe('parseMeasurement', () => {
  describe('simple inch formats', () => {
    it('parses plain inches: 68 → 544 eighths', () => {
      expect(parseMeasurement('68')).toBe(544);
    });
    it('parses inches with quote: 68" → 544 eighths', () => {
      expect(parseMeasurement('68"')).toBe(544);
    });
  });

  describe('feet and inches formats', () => {
    it('parses feet-space-inches: 5 8 → 544 eighths', () => {
      expect(parseMeasurement('5 8')).toBe(544);
    });
    it('parses feet-apostrophe-inches: 5\' 8 → 544 eighths', () => {
      expect(parseMeasurement("5' 8")).toBe(544);
    });
    it('parses feet-inches with various apostrophes', () => {
      expect(parseMeasurement('5′ 8')).toBe(544);
      expect(parseMeasurement('5′ 8')).toBe(544);
    });
  });

  describe('inches with fractions', () => {
    it('parses decimal: 68 5/8 → 549 eighths', () => {
      expect(parseMeasurement('68 5/8')).toBe(549);
    });
    it('parses feet-inches-fraction: 5 8 5/8 → 549 eighths', () => {
      expect(parseMeasurement('5 8 5/8')).toBe(549);
    });
    it('parses with various separators: 5\' 8-5/8"', () => {
      expect(parseMeasurement('5\' 8-5/8"')).toBe(549);
    });
  });

  describe('exact eighths only', () => {
    it('accepts reduced fractions: 1/4 (= 2/8)', () => {
      expect(parseMeasurement('1/4')).toBe(2);
    });
    it('accepts 1/2 (= 4/8)', () => {
      expect(parseMeasurement('1/2')).toBe(4);
    });
    it('accepts 3/4 (= 6/8)', () => {
      expect(parseMeasurement('3/4')).toBe(6);
    });
    it('rejects non-eighths: 1/3 → null', () => {
      expect(parseMeasurement('1/3')).toBeNull();
    });
    it('rejects non-eighths: 1/5 → null', () => {
      expect(parseMeasurement('1/5')).toBeNull();
    });
    it('rejects non-eighths: 1/16 → null', () => {
      expect(parseMeasurement('1/16')).toBeNull();
    });
  });

  describe('bounds (0–360″ / 2880 eighths)', () => {
    it('accepts 0″', () => {
      expect(parseMeasurement('0')).toBe(0);
    });
    it('accepts 360″ (max)', () => {
      expect(parseMeasurement('360')).toBe(2880);
    });
    it('accepts 30 ft (360″)', () => {
      expect(parseMeasurement('30 0')).toBe(2880);
    });
    it('rejects negative: -5 → null', () => {
      expect(parseMeasurement('-5')).toBeNull();
    });
    it('rejects over 360″: 361 → null', () => {
      expect(parseMeasurement('361')).toBeNull();
    });
    it('rejects over 30 ft: 31 0 → null', () => {
      expect(parseMeasurement('31 0')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('rejects empty string', () => {
      expect(parseMeasurement('')).toBeNull();
    });
    it('rejects whitespace only', () => {
      expect(parseMeasurement('   ')).toBeNull();
    });
    it('rejects garbage', () => {
      expect(parseMeasurement('abc')).toBeNull();
      expect(parseMeasurement('xyz')).toBeNull();
    });
    it('handles zero fractions correctly: 5 8 0/8 → 544', () => {
      expect(parseMeasurement('5 8 0/8')).toBe(544);
    });
    it('handles 8/8 (equals 1 inch): 5 8 8/8 → 552', () => {
      expect(parseMeasurement('5 8 8/8')).toBe(552);
    });
  });

  describe('mixed inch/feet formats for the same value', () => {
    it('5 8 = 68 inches', () => {
      expect(parseMeasurement('5 8')).toBe(parseMeasurement('68'));
    });
    it('5 8 1/2 = 68.5 inches = 68 1/2', () => {
      expect(parseMeasurement('5 8 1/2')).toBe(parseMeasurement('68 1/2'));
    });
  });
});
