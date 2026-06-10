import { useMemo } from 'react';
import type { ShorePoint } from '@core/schema';
import { findForShorePoint } from '@core/shorepoint';
import type { StrutCombination } from '@core/load';
import { useInventory } from './useInventory';

/**
 * Strut recommendations for a shore point, against live inventory. Pure
 * core/load call (L-1/L-2 live in the engine, not here); warning combos
 * (unrated zone / exceeds-capacity) arrive sorted to the top and feed the
 * #40 deploy warning gate in S6.
 */
export function useRecommendations(sp: ShorePoint | null): StrutCombination[] {
  const inventory = useInventory();
  return useMemo(() => (sp ? findForShorePoint(sp, inventory) : []), [sp, inventory]);
}
