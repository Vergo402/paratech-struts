import { useMemo } from 'react';
import { currentIC, leaderOf, defaultPositionId } from '@core/org';
import { openHazardsBySeverity } from '@core/hazard';
import { useOperation, useShorePoints, useOrg, useHazards } from '@ui/hooks';
import { useElapsed } from './useElapsed';

// The ICS-201 briefing card (#203, the v4.0 IC Command Checklist deliverable). Six
// live SitStat datums assembled at render time from role history + the operation —
// no manual entry, never stored on an event (the command-transfer brief is derived
// the same way). Read-only; it rides the checklist drawer.
export function ICS201Brief() {
  const operation = useOperation();
  const shorePoints = useShorePoints();
  const positions = useOrg();
  const hazards = useHazards();

  const setCount = useMemo(
    () => shorePoints.filter((sp) => sp.deletedAt == null && sp.status === 'secured').length,
    [shorePoints],
  );
  const total = useMemo(() => shorePoints.filter((sp) => sp.deletedAt == null).length, [shorePoints]);
  const openHazards = useMemo(
    () => openHazardsBySeverity(hazards).filter((h) => h.mitigatedAt == null).length,
    [hazards],
  );
  const elapsed = useElapsed(operation?.createdAt);

  if (!operation) return null;

  const ic = currentIC(positions);
  const safety = positions[defaultPositionId(operation.id, 'safety')];
  const safetyName = (safety && leaderOf(safety)?.label) ?? 'Unassigned';

  const datum = (label: string, value: string) => (
    <div className="fs-201-datum">
      <span className="fs-201-label">{label}</span>
      <span className="fs-201-value">{value}</span>
    </div>
  );

  return (
    <section className="fs-201" aria-label="Command brief (ICS-201 condensed)">
      <div className="fs-201-head">
        <span className="fs-201-eyebrow">Command brief (ICS-201 condensed) · live</span>
      </div>
      <div className="fs-201-grid">
        {datum('Incident', operation.name)}
        {datum('Elapsed', elapsed)}
        {datum('Incident Commander', ic?.label ?? 'Unassigned')}
        {datum('Safety Officer', safetyName)}
        {datum('Open hazards', openHazards === 0 ? 'None' : String(openHazards))}
        {datum('Shore points', `${setCount} set · ${total} total`)}
      </div>
    </section>
  );
}
