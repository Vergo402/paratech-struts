import { describe, expect, it } from 'vitest';
import { resolveHazardDivision } from './location';

describe('resolveHazardDivision — a location that clearly names ONE Division (#511)', () => {
  it.each<[string, number]>([
    ['1', 1],
    [' 2 ', 2],
    ['-1', -1],
    ['Div 1', 1],
    ['div 1', 1],
    ['Division 1', 1],
    ['Div.1', 1],
    ['Div-1', 1],
    ['DIV 2', 2],
    ['D1', 1],
    ['d-1', -1],
    ['Div 1 rear wall lean', 1],
    ['NE corner, Div 2', 2],
    ['B1', -1],
    ['b2', -2],
    ['Basement 1', -1],
    ['bsmt 2', -2],
    ['Div 1, Div 1 rear', 1],
    ['Div -1', -1], // a sign after a space is a sign, never read as the floor above
  ])('%j -> %i', (loc, expected) => {
    expect(resolveHazardDivision(loc)).toBe(expected);
  });
});

describe('resolveHazardDivision — anything else stays log-only (never the wrong card)', () => {
  it.each<[string | undefined | null]>([
    [''],
    [undefined],
    [null],
    ['0'],
    ['Div 0'],
    ['12 inch gap'], // a bare number that is not the whole string never counts
    ['Side D 2'], // sides are lettered A-D (ADR-008): "D 2" is not Division 2
    ['Side B 2'], // ...and "B 2" is not basement 2
    ['between Div 1 and Div 2'], // two divisions
    ['Div 1 and B1'], // two divisions (1 and -1)
    ['NE stairwell'],
    ['1234'], // beyond the 3-digit bound
    ['rear wall lean'],
  ])('%j -> null', (loc) => {
    expect(resolveHazardDivision(loc)).toBeNull();
  });
});
