import { useMemo } from 'react';
import { shorePointCountsByPosition } from '@core/org';
import { cuttingQueueCount } from '@core/shorepoint';
import { useOrg } from './useOrg';
import { useShorePoints } from './useShorePoints';

export interface OrgShorePointCounts {
  /** positionId → live shore-point tally for its assigned apparatus (0-count omitted). */
  byPosition: Record<string, number>;
  /** Live cutting-station queue depth (the workstation node's numeral). */
  cuttingQueue: number;
}

/** The org chart's assignment numerals (#434, craft.md §10) — how many shore
 *  points each position's unit is working, plus the Cutting Station queue. */
export function useOrgShorePointCounts(): OrgShorePointCounts {
  const positions = useOrg();
  const shorePoints = useShorePoints();
  return useMemo(
    () => ({
      byPosition: shorePointCountsByPosition(positions, shorePoints),
      cuttingQueue: cuttingQueueCount(shorePoints),
    }),
    [positions, shorePoints],
  );
}
