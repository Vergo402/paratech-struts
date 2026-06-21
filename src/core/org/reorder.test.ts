import { describe, it, expect } from 'vitest';
import { seedOrgState } from './orgReducer';
import { defaultPositionId } from './defaultTree';
import { childrenOf } from './tree';
import { orderForUp, orderForDown, promoteTarget, demoteTarget, validParentsFor, nextChildOrder } from './reorder';

const OP = 'op1';
const id = (k: Parameters<typeof defaultPositionId>[1]) => defaultPositionId(OP, k);
const positions = () => seedOrgState(OP, 'dev1').positions;

// Operations' children in seed order: rescue(0) shoring(1) staging(2) cutting(3).
describe('reorder helpers', () => {
  it('orderForUp/Down return a midpoint, null at the ends', () => {
    const p = positions();
    expect(orderForUp(p, id('rescue'))).toBeNull(); // already first
    expect(orderForDown(p, id('cutting'))).toBeNull(); // already last
    // staging (order 2) up → below shoring(1): between rescue(0) and shoring(1) = 0.5
    expect(orderForUp(p, id('staging'))).toBe(0.5);
    // shoring (order 1) down → between staging(2) and cutting(3) = 2.5
    expect(orderForDown(p, id('shoring'))).toBe(2.5);
  });

  it('promoteTarget = grandparent; null when the parent is the root', () => {
    const p = positions();
    expect(promoteTarget(p, id('rescue'))).toBe(id('ic')); // rescue → grandparent IC
    expect(promoteTarget(p, id('ops'))).toBeNull(); // ops' parent is root IC
    expect(promoteTarget(p, id('ic'))).toBeNull(); // root
  });

  it('demoteTarget = previous sibling; null for the first child', () => {
    const p = positions();
    expect(demoteTarget(p, id('shoring'))).toBe(id('rescue'));
    expect(demoteTarget(p, id('rescue'))).toBeNull();
  });

  it('validParentsFor excludes self, its subtree, and the current parent', () => {
    const p = positions();
    const targets = validParentsFor(p, id('ops')).map((x) => x.id);
    expect(targets).not.toContain(id('ops')); // self
    expect(targets).not.toContain(id('rescue')); // descendant (cycle)
    expect(targets).not.toContain(id('ic')); // current parent (no-op)
    expect(targets).toContain(id('safety')); // a legal elsewhere target
  });

  it('nextChildOrder appends after the last child', () => {
    const p = positions();
    expect(nextChildOrder(p, id('ops'))).toBe(4); // after cutting(3)
    expect(nextChildOrder(p, id('rescue'))).toBe(0); // no children yet
    expect(childrenOf(p, id('ops'))).toHaveLength(4);
  });
});
