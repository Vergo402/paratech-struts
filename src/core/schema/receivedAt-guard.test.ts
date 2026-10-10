import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ADR-041 — `receivedAt` (the RTDB server stamp) is the canonical ORDER key; it decides
// which event folds first, never what an event does. A reducer that read it would make
// the fold depend on WHEN the cloud saw an event rather than on the event itself — and a
// device's own provisional events (no receivedAt yet) would fold differently before and
// after confirmation. So no reducer source may mention it outside a comment.
//
// readFileSync (not a glob): a renamed or deleted reducer THROWS here rather than
// silently dropping out of the guard.
const REDUCERS = [
  '../operation/reducer.ts',
  '../operation/projection.ts',
  '../shorepoint/reducer.ts',
  '../org/orgReducer.ts',
  '../hazard/reducer.ts',
  '../checklist/reducer.ts',
] as const;

/** Source with block and line comments removed (comments may explain the rule). */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('reducers never read the order stamp (ADR-041)', () => {
  for (const rel of REDUCERS) {
    it(`${rel} does not reference receivedAt`, () => {
      const src = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
      expect(src.length).toBeGreaterThan(0);
      expect(code(src)).not.toMatch(/receivedAt/);
    });
  }

  it('the comment stripper does not hide real code', () => {
    expect(code('const a = e.receivedAt; // fine')).toMatch(/receivedAt/);
    expect(code('/* receivedAt */ const b = 1; // receivedAt')).not.toMatch(/receivedAt/);
  });
});
