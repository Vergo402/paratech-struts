import { describe, it, expect } from 'vitest';
import { buildDefaultTree, defaultPositionId } from './defaultTree';
import {
  childrenOf,
  rootPosition,
  subtreeIds,
  isAncestorOrSelf,
  wouldCreateCycle,
  pathToRoot,
  siblingsOf,
} from './tree';

const tree = buildDefaultTree('op1');
const id = (k: Parameters<typeof defaultPositionId>[1]) => defaultPositionId('op1', k);

describe('tree algebra', () => {
  it('childrenOf returns direct reports in sibling order', () => {
    expect(childrenOf(tree, id('ic')).map((p) => p.id)).toEqual([id('safety'), id('ops')]);
    expect(childrenOf(tree, id('ops')).map((p) => p.id)).toEqual([
      id('rescue'),
      id('shoring'),
      id('staging'),
      id('cutting'),
    ]);
    expect(childrenOf(tree, id('rescue'))).toEqual([]);
  });

  it('rootPosition is the IC', () => {
    expect(rootPosition(tree)!.id).toBe(id('ic'));
  });

  it('subtreeIds is the BFS of descendants, excluding self', () => {
    expect(new Set(subtreeIds(tree, id('ops')))).toEqual(
      new Set([id('rescue'), id('shoring'), id('staging'), id('cutting')]),
    );
    expect(subtreeIds(tree, id('ic'))).toHaveLength(6);
    expect(subtreeIds(tree, id('rescue'))).toEqual([]);
  });

  it('isAncestorOrSelf walks up to the root', () => {
    expect(isAncestorOrSelf(tree, id('ic'), id('rescue'))).toBe(true);
    expect(isAncestorOrSelf(tree, id('ops'), id('rescue'))).toBe(true);
    expect(isAncestorOrSelf(tree, id('ops'), id('ops'))).toBe(true);
    expect(isAncestorOrSelf(tree, id('rescue'), id('ops'))).toBe(false);
    expect(isAncestorOrSelf(tree, id('rescue'), id('shoring'))).toBe(false);
  });

  it('wouldCreateCycle blocks moving a node under its own descendant', () => {
    // moving Operations under Rescue (a descendant) would cycle
    expect(wouldCreateCycle(tree, id('ops'), id('rescue'))).toBe(true);
    // moving Operations under itself cycles
    expect(wouldCreateCycle(tree, id('ops'), id('ops'))).toBe(true);
    // moving Rescue under Shoring is fine
    expect(wouldCreateCycle(tree, id('rescue'), id('shoring'))).toBe(false);
  });

  it('pathToRoot is root-first', () => {
    expect(pathToRoot(tree, id('rescue')).map((p) => p.id)).toEqual([id('ic'), id('ops'), id('rescue')]);
    expect(pathToRoot(tree, id('ic')).map((p) => p.id)).toEqual([id('ic')]);
  });

  it('siblingsOf excludes self', () => {
    expect(siblingsOf(tree, id('rescue')).map((p) => p.id)).toEqual([
      id('shoring'),
      id('staging'),
      id('cutting'),
    ]);
  });
});
