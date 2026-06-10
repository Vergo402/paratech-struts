import { describe, it, expect } from 'vitest';
import {
  formatDivision,
  formatDivisionShort,
  divisionLabel,
  nextFloorAbove,
  nextFloorBelow,
  sortDivisionsForDisplay,
} from './division';

describe('formatDivision — v3-faithful labels (app.js formatDivision)', () => {
  it.each([
    [1, 'Div 1 (Ground level)'],
    [2, 'Div 2 (+1 floor up)'],
    [3, 'Div 3 (+2 floors up)'],
    [-1, 'Sub Div 1 (Basement)'],
    [-2, 'Sub Div 2 (+1 below)'],
  ])('%i → %s', (n, label) => {
    expect(formatDivision(n)).toBe(label);
  });

  it('division 0 / non-integers render empty', () => {
    expect(formatDivision(0)).toBe('');
    expect(formatDivision(1.5)).toBe('');
  });
});

describe('formatDivisionShort + divisionLabel', () => {
  it('short forms', () => {
    expect(formatDivisionShort(2)).toBe('Div 2');
    expect(formatDivisionShort(-1)).toBe('Sub Div 1');
  });

  it('divisionLabel parses integer strings to the short form', () => {
    expect(divisionLabel('1')).toBe('Div 1');
    expect(divisionLabel('-2')).toBe('Sub Div 2');
  });

  it('divisionLabel passes legacy free text through raw', () => {
    expect(divisionLabel('Roof')).toBe('Roof');
    expect(divisionLabel('0')).toBe('0');
  });
});

describe('next-floor math (app.js addFloorAbove/Below)', () => {
  it('nextFloorAbove = max positive + 1', () => {
    expect(nextFloorAbove([1, 2, -1])).toBe(3);
    expect(nextFloorAbove([1])).toBe(2);
    expect(nextFloorAbove([-1])).toBe(1); // no positives → ground next
  });

  it('nextFloorBelow = min negative − 1', () => {
    expect(nextFloorBelow([1])).toBe(-1);
    expect(nextFloorBelow([1, -1, -2])).toBe(-3);
  });
});

describe('sortDivisionsForDisplay — building cross-section, top first', () => {
  it('sorts descending, dedupes, drops 0', () => {
    expect(sortDivisionsForDisplay([1, 3, -1, 2, 3, 0])).toEqual([3, 2, 1, -1]);
  });
});
