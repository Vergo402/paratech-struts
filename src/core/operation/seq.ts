import type { ShorePoint } from '../schema';

/**
 * The base for the next shore point's created-order number: the highest `seq`
 * already in the operation (0 if none). The caller adds 1 per NEW physical shore
 * (grouped struts share one number). Using max — NOT the count — is what makes a
 * number survive deletion: delete #3 of {1,2,3} and the next add is still #4, not
 * a reused #3. Points without a seq (pre-feature / legacy) count as 0.
 */
export function nextSeqBase(shorePoints: readonly Pick<ShorePoint, 'seq'>[]): number {
  return shorePoints.reduce((max, sp) => Math.max(max, sp.seq ?? 0), 0);
}
