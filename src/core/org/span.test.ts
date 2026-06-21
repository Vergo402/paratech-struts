import { describe, it, expect } from 'vitest';
import type { OrgPosition, OrgPositions, OrgPositionKind } from '../schema/org';
import { buildDefaultTree, defaultPositionId } from './defaultTree';
import { spanOfControl, spanLevel } from './span';

const id = (k: Parameters<typeof defaultPositionId>[1]) => defaultPositionId('op1', k);

function pos(idv: string, parentId: string | null, kind: OrgPositionKind, order = 0): OrgPosition {
  return { id: idv, title: idv, kind, parentId, builtIn: false, order, assignedResources: [] };
}

describe('span of control', () => {
  const tree = buildDefaultTree('op1');

  it('counts direct reports', () => {
    expect(spanOfControl(tree, id('ops'))).toBe(4);
  });

  it('excludes command staff from the IC span (NIMS rule)', () => {
    // default IC has Safety Officer (command-staff) + Operations (section) → span 1
    expect(spanOfControl(tree, id('ic'))).toBe(1);
  });

  it('command staff never count toward span, even when many', () => {
    const t: OrgPositions = Object.fromEntries(
      [
        pos('ic', null, 'command'),
        pos('s1', 'ic', 'command-staff'),
        pos('s2', 'ic', 'command-staff'),
        pos('s3', 'ic', 'command-staff'),
        pos('ops', 'ic', 'section', 1),
        pos('plan', 'ic', 'section', 2),
        pos('log', 'ic', 'section', 3),
        pos('fin', 'ic', 'section', 4),
      ].map((p) => [p.id, p]),
    );
    expect(spanOfControl(t, 'ic')).toBe(4); // 4 sections; 3 command staff excluded
  });

  it('spanLevel thresholds (≤5 ok, 6–7 caution, ≥8 over)', () => {
    expect(spanLevel(0)).toBe('ok');
    expect(spanLevel(5)).toBe('ok');
    expect(spanLevel(6)).toBe('caution');
    expect(spanLevel(7)).toBe('caution');
    expect(spanLevel(8)).toBe('over');
  });
});
