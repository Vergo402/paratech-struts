import { describe, it, expect } from 'vitest';
import { starterPasswordFor } from './starterPassword';

// The #439 starter-password convention — `${lastname}123!` with the 'member'
// fallback floor. Every result must clear Firebase's 6-character minimum.
describe('starterPasswordFor', () => {
  it('uses the last word of a multi-word name, lowercased', () => {
    expect(starterPasswordFor('Dana Kim')).toBe('kim123!');
    expect(starterPasswordFor('Marcus Reyes')).toBe('reyes123!');
  });

  it('strips punctuation from hyphenated / apostrophe names', () => {
    expect(starterPasswordFor("Sam O'Brien")).toBe('obrien123!');
    expect(starterPasswordFor('Ana García-Lopez')).toBe('garcialopez123!');
  });

  it('a two-letter surname passes as-is (still ≥ 6 chars total)', () => {
    expect(starterPasswordFor('Wei Ng')).toBe('ng123!');
    expect(starterPasswordFor('Wei Ng').length).toBeGreaterThanOrEqual(6);
  });

  it('a suffix is treated as the last word — visible to the admin before create', () => {
    expect(starterPasswordFor("Sam O'Brien Jr.")).toBe('jr123!');
  });

  it('falls back to member for empty / initials / symbol-only names', () => {
    expect(starterPasswordFor('')).toBe('member123!');
    expect(starterPasswordFor('   ')).toBe('member123!');
    expect(starterPasswordFor('Dana K.')).toBe('member123!'); // 'k' < 2 usable chars
    expect(starterPasswordFor('★ ✔')).toBe('member123!');
  });

  it('single-word names work (no space to split)', () => {
    expect(starterPasswordFor('Cher')).toBe('cher123!');
  });

  it('every derivation clears the Firebase 6-char minimum', () => {
    for (const name of ['Dana Kim', 'Wei Ng', '', 'X', "O'Brien-Ng Jr.", '李 王']) {
      expect(starterPasswordFor(name).length).toBeGreaterThanOrEqual(6);
    }
  });
});
