import type { OrgPositions } from '../schema/org';
import { childrenOf } from './tree';

// NIMS span of control: optimal 1:5, acceptable 1:7. The warning is informational,
// NEVER a block (Principle 10). Command Staff (Safety Officer, Public Information
// Officer, Liaison Officer) do NOT count toward the IC's span — a formal NIMS rule
// (NIMS 2017 p.23), so kind 'command-staff' children are excluded from the count.
export function spanOfControl(positions: OrgPositions, id: string): number {
  return childrenOf(positions, id).filter((c) => c.kind !== 'command-staff').length;
}

export type SpanLevel = 'ok' | 'caution' | 'over';

export function spanLevel(count: number): SpanLevel {
  if (count > 7) return 'over'; //      exceeds the acceptable range — restructure
  if (count >= 6) return 'caution'; //  6–7, approaching the 1:5 optimal — add a Branch?
  return 'ok'; //                       ≤5
}
