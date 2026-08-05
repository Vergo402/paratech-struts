import type { ShorePoint } from '@core/schema';
import { cutTooSmall } from '@core/shorepoint';
import { isCutPhase } from './cardParts';

/**
 * CutTooSmallFlag — the COMPACT amber "too small" chip for the two dense tri-views
 * (List row + Division tile, #483). The Board card carries the same condition as a
 * full sentence ("⚠ Opening too small — verify measurement", ShorePointCard); at row
 * and tile density there is room for the tell, not the sentence, so the text is the
 * short "⚠ Too small" and the drawer/card carries the explanation.
 *
 * Same slot, size, and markup as the red CapacityFlag those rows already carry —
 * `.fs-spc-flag-row` > `.fs-spc-flag` — swapping only the amber `--warning` modifier,
 * so a row showing BOTH stacks them identically. Amber, not red: the shore isn't
 * unsafe, the MEASUREMENT is unusable — a different order of alarm.
 *
 * Gated on isCutPhase for the same reason the card is: the chip explains the value
 * shelf's CUT length, so it can never appear over a number that isn't a cut length.
 * A GROUP shows it when ANY live member is too small — one physical shore, and a
 * mate's unusable measurement is the whole set's problem.
 */
export function CutTooSmallFlag({ members }: { members: readonly ShorePoint[] }) {
  const flagged = members.some((sp) => sp.deletedAt == null && isCutPhase(sp) && cutTooSmall(sp));
  if (!flagged) return null;
  // span wrapper (not div): both callers render this INSIDE a <button>, where flow
  // content is invalid — the CapacityFlag precedent.
  return (
    <span className="fs-spc-flag-row">
      <span className="fs-spc-flag fs-spc-flag--warning fs-spc-flag--compact" role="status">
        ⚠ Too small
      </span>
    </span>
  );
}
