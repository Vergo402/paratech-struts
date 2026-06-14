import { describe, it, expect } from 'vitest';
import {
  formatDivision,
  formatDivisionShort,
  formatDivisionCompact,
  divisionLabel,
  nextFloorAbove,
  nextFloorBelow,
  sortDivisionsForDisplay,
  compareDivisionValues,
  compareAreaValues,
  compareBuildingValues,
  compareShorePointsByLocation,
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

  it('compact trigger form: bare number for ground+, B-prefixed for basements', () => {
    expect(formatDivisionCompact(1)).toBe('1');
    expect(formatDivisionCompact(3)).toBe('3');
    expect(formatDivisionCompact(-1)).toBe('B1');
    expect(formatDivisionCompact(-2)).toBe('B2');
    expect(formatDivisionCompact(0)).toBe('');
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

describe('board sort order (#248) — v3 compareLevelValues carried over', () => {
  it('compareDivisionValues sorts floors DESCENDING (top floor first)', () => {
    expect(['1', '3', '2'].sort(compareDivisionValues)).toEqual(['3', '2', '1']);
    // basements after ground; numeric before legacy free text; blank last.
    expect(['1', '-1', '2'].sort(compareDivisionValues)).toEqual(['2', '1', '-1']);
    expect(['Roof', '2'].sort(compareDivisionValues)).toEqual(['2', 'Roof']);
    expect(['', '1'].sort(compareDivisionValues)).toEqual(['1', '']);
  });

  it('compareAreaValues sorts ASCENDING (numeric then locale; blank last)', () => {
    expect(['Up', 'Down'].sort(compareAreaValues)).toEqual(['Down', 'Up']);
    expect(['2', '10', '1'].sort(compareAreaValues)).toEqual(['1', '2', '10']);
    expect([undefined, 'A'].sort(compareAreaValues)).toEqual(['A', undefined]);
  });

  it('compareShorePointsByLocation = division desc, then area asc', () => {
    const pts = [
      { division: '1', area: 'Up' },
      { division: '2', area: 'Down' },
      { division: '1', area: 'Down' },
    ];
    expect(pts.sort(compareShorePointsByLocation)).toEqual([
      { division: '2', area: 'Down' },
      { division: '1', area: 'Down' },
      { division: '1', area: 'Up' },
    ]);
  });

  it('compareBuildingValues sorts ASCENDING with natural numeric order; blank last', () => {
    expect(['Tower 10', 'Tower 2'].sort(compareBuildingValues)).toEqual(['Tower 2', 'Tower 10']);
    expect(['South', 'North'].sort(compareBuildingValues)).toEqual(['North', 'South']);
    expect([undefined, 'A'].sort(compareBuildingValues)).toEqual(['A', undefined]);
  });

  it('compareShorePointsByLocation groups by building FIRST, then division desc, then area asc', () => {
    const pts = [
      { division: '1', building: 'B', area: 'x' },
      { division: '2', building: 'A', area: 'x' },
      { division: '1', building: 'A', area: 'x' },
    ];
    expect(pts.sort(compareShorePointsByLocation)).toEqual([
      { division: '2', building: 'A', area: 'x' },
      { division: '1', building: 'A', area: 'x' },
      { division: '1', building: 'B', area: 'x' },
    ]);
  });
});
