import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { defaultPositionId, leaderOf } from '@core/org';
import { openHazardsBySeverity, severityWord } from '@core/hazard';
import { useHazards, useOperation, useOrg } from '@ui/hooks';
import { AlertIcon, ShieldIcon } from './icons';
import './command.css';

/**
 * Incident status chips (#487 Safety Officer + #490 Hazard) — a small strip that
 * surfaces two of Command's SitStat datums (Safety Officer assignment, open-hazard
 * summary) one tap away from wherever a crew is actually working, not just the
 * Command tab. Both chips are purely informational (Principle 10: never gates a
 * workflow) and reuse the exact selectors CommandRail's staff card / entry row
 * already compute — this file is the one place that logic lives now.
 */

/** Safety Officer assignment label — the same lookup CommandRail's staff-card row
 *  performs inline (defaultPositionId + leaderOf). Factored out here so the chip
 *  and the rail agree by construction, never by coincidence. Null before an
 *  operation exists. */
export function useSafetyOfficerLabel(): string | null {
  const operation = useOperation();
  const positions = useOrg();
  if (!operation) return null;
  const safety = positions[defaultPositionId(operation.id, 'safety')];
  return (safety && leaderOf(safety)?.label) ?? null;
}

/** Open hazards, worst-first — the same openHazardsBySeverity + open-filter
 *  CommandRail's Hazards entry row uses, so "the top hazard" means the same thing
 *  everywhere it's shown. */
export function useOpenHazards() {
  const hazards = useHazards();
  return useMemo(() => openHazardsBySeverity(hazards).filter((h) => h.mitigatedAt == null), [hazards]);
}

export interface SafetyOfficerChipProps {
  /** Tap handler override. Default: navigate to /command (the IC block). */
  onPress?: () => void;
}

/** #487 — always renders, assigned or not (locked rule C-6: the SO chip is never
 *  conditionally hidden). Quiet grey — informational chrome, not an alert. */
export function SafetyOfficerChip({ onPress }: SafetyOfficerChipProps) {
  const navigate = useNavigate();
  const label = useSafetyOfficerLabel();
  return (
    <button
      type="button"
      className="fs-ichip fs-ichip--safety"
      onClick={onPress ?? (() => void navigate({ to: '/command' }))}
    >
      <ShieldIcon />
      <span className="fs-ichip-k">Safety</span>
      <span className={`fs-ichip-v${label ? '' : ' is-unassigned'}`}>{label ?? 'Unassigned'}</span>
    </button>
  );
}

export interface HazardChipProps {
  /** Tap handler override. Default: navigate to /command (the Hazards entry). */
  onPress?: () => void;
  /** Command only — appends the top hazard's short location. */
  showLocation?: boolean;
}

/** #490 — hidden entirely at zero OPEN hazards (not "0 hazards" chrome). Danger-
 *  tinted pill: count + the highest open severity word (severityWord already
 *  reads HIGH/MED/LOW). Purely informational — never gates anything (Principle 10). */
export function HazardChip({ onPress, showLocation = false }: HazardChipProps) {
  const navigate = useNavigate();
  const openHazards = useOpenHazards();
  const top = openHazards[0];
  if (!top) return null;
  return (
    <button
      type="button"
      className={`fs-ichip fs-ichip--hazard is-${top.severity}`}
      onClick={onPress ?? (() => void navigate({ to: '/command' }))}
    >
      <AlertIcon />
      <span className="fs-ichip-v">
        {openHazards.length} {severityWord(top.severity)}
      </span>
      {showLocation && top.location && <span className="fs-ichip-meta">{top.location}</span>}
    </button>
  );
}

/** The Operations board / Cutting Station chip strip — both chips, on their own
 *  row under the meta line (#487 + #490). No location suffix here; Command's own
 *  Hazards entry row already carries the full detail. */
export function IncidentChipStrip() {
  return (
    <div className="fs-ichip-strip">
      <SafetyOfficerChip />
      <HazardChip />
    </div>
  );
}
