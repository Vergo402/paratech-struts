import { useMemo, useState } from 'react';
import type { ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS } from '@core/shorepoint';
import { currentIC, leaderOf, defaultPositionId } from '@core/org';
import { openHazardsBySeverity } from '@core/hazard';
import { Badge, Button, Card, Segmented, Sheet, useIsDesktop } from '@ui/primitives';
import { useOperation, useShorePoints, useOrg, useHazards } from '@ui/hooks';
import { useElapsed } from './useElapsed';
import { SitStatRollup } from './SitStatRollup';

// SitStat scope toggle (#353): the whole-incident board (default, unchanged) vs
// the per-Division roll-up table for "which Division is behind" at scale.
type SitStatScope = 'all' | 'division';
const SCOPE_OPTIONS = [
  { value: 'all', label: 'All incident' },
  { value: 'division', label: 'By Division' },
] as const;

// The running clock as its own leaf — the 1s tick re-renders ONLY this node.
function ElapsedClock({ since }: { since: number | undefined }) {
  return <span className="fs-cmd-clock">{useElapsed(since)}</span>;
}

/**
 * The Command situation rail — the six canonical datums in the user-mandated order:
 * persistent Safety Officer + OP/elapsed chrome, incident name, the Incident
 * Commander full-width with the one gold accent, then a [Operations Section Chief |
 * Safety Officer] two-up row, resources, the 7-status board, the hazard summary, the
 * roster, and End Operation. It IS the phone column verbatim and the desktop Deck's
 * left rail (one component, no second render path). `onOpenHazards`, when given
 * (desktop Deck), makes the hazard summary flip the workspace to the Hazard Log.
 */
export function CommandRail({ onOpenHazards }: { onOpenHazards?: () => void } = {}) {
  const operation = useOperation();
  const shorePoints = useShorePoints();
  const positions = useOrg();
  const hazards = useHazards();
  const isDesktop = useIsDesktop();
  const [scope, setScope] = useState<SitStatScope>('all');

  const counts = useMemo(() => {
    const m = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ShorePointStatus, number>;
    let total = 0;
    for (const sp of shorePoints) {
      if (sp.deletedAt != null) continue;
      m[sp.status]++;
      total++;
    }
    return { m, total };
  }, [shorePoints]);

  const resources = useMemo(() => {
    const apparatus = new Set<string>();
    const individuals = new Set<string>();
    const roster: { key: string; label: string; home: string }[] = [];
    const seen = new Set<string>();
    for (const p of Object.values(positions)) {
      for (const r of p.assignedResources) {
        if (r.ref === 'apparatus') apparatus.add(r.value);
        else if (r.ref === 'individual') individuals.add(r.value);
        else continue;
        const key = `${r.ref}:${r.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        roster.push({ key, label: r.label, home: p.title });
      }
    }
    return { apparatusCount: apparatus.size, individualCount: individuals.size, roster };
  }, [positions]);

  const openHazards = useMemo(() => openHazardsBySeverity(hazards).filter((h) => h.mitigatedAt == null), [hazards]);

  if (!operation) return null;

  const ic = currentIC(positions);
  const ops = positions[defaultPositionId(operation.id, 'ops')];
  const safety = positions[defaultPositionId(operation.id, 'safety')];
  const opsName = (ops && leaderOf(ops)?.label) ?? 'Unassigned';
  const safetyName = (safety && leaderOf(safety)?.label) ?? 'Unassigned';
  const ROSTER_PREVIEW = 3;
  const topHazard = openHazards[0];

  const hazardSummary = (
    <span className="fs-cmd-haz-text">
      {openHazards.length > 0 ? (
        <>
          <span className="fs-cmd-haz-count">{openHazards.length} open</span>
          {topHazard && ` · ${topHazard.severity} ${topHazard.type} · ${topHazard.location}`}
        </>
      ) : (
        'No open hazards'
      )}
    </span>
  );

  return (
    <>
      {/* Incident name up top + OP/elapsed (Safety Officer lives in the pair row below) */}
      <div className="fs-cmd-top">
        <div className="fs-cmd-incident">
          <h1 className="fs-cmd-title">{operation.name}</h1>
          {operation.location && <p className="fs-cmd-loc">{operation.location}</p>}
        </div>
        <div className="fs-cmd-op">
          <span className="fs-cmd-eyebrow">OP 1 · Elapsed</span>
          <ElapsedClock since={operation.createdAt} />
        </div>
      </div>

      {/* Incident Commander — full width, the one gold accent + Transfer (P8) */}
      <Card className="fs-cmd-ic">
        <div className="fs-cmd-ic-main">
          <span className="fs-cmd-eyebrow">Incident Commander</span>
          <span className="fs-cmd-ic-name">{ic?.label ?? 'Unassigned'}</span>
        </div>
        <Button variant="tertiary" size="standard" disabled disabledReason="Builds next" onPress={() => {}}>
          Transfer
        </Button>
      </Card>

      {/* Operations Section Chief | Safety Officer — the two-up datum row */}
      <div className="fs-cmd-pair">
        <Card className="fs-cmd-pair-cell">
          <span className="fs-cmd-eyebrow">Operations Section Chief</span>
          <span className="fs-cmd-pair-name">{opsName}</span>
        </Card>
        <Card className="fs-cmd-pair-cell">
          <span className="fs-cmd-eyebrow">Safety Officer</span>
          <span className="fs-cmd-pair-name">{safetyName}</span>
        </Card>
      </div>

      {/* Resources assigned */}
      <div className="fs-cmd-metrics">
        <Card className="fs-cmd-metric">
          <span className="fs-cmd-eyebrow">Apparatus</span>
          <span className="fs-cmd-metric-num">{resources.apparatusCount}</span>
        </Card>
        <Card className="fs-cmd-metric">
          <span className="fs-cmd-eyebrow">Individuals</span>
          <span className="fs-cmd-metric-num">{resources.individualCount}</span>
        </Card>
      </div>

      {/* Shore-point status board */}
      <div className="fs-cmd-board-head">
        <span className="fs-cmd-eyebrow">Shore points</span>
        <span className="fs-cmd-board-total">{counts.total} total</span>
      </div>
      {/* Scope toggle (#353): All incident (the board below, unchanged) vs By Division. */}
      <Segmented
        size="standard"
        aria-label="Shore-point tally scope"
        options={SCOPE_OPTIONS}
        value={scope}
        onChange={(v) => setScope(v)}
      />
      {/* The whole-incident 7-status board stays the default and the desktop-inline
          fallback; the By-Division roll-up replaces it inline on desktop and rises
          as a Sheet on phone (the phone floor). */}
      {scope === 'division' && isDesktop ? (
        <SitStatRollup />
      ) : (
        <div className="fs-cmd-board" role="list" aria-label="Shore points by status">
          {STATUS_ORDER.map((status) => (
            <div key={status} className={`fs-cmd-stat is-${status}`} role="listitem">
              <span className="fs-cmd-stat-label">{STATUS_LABELS[status]}</span>
              <span className="fs-cmd-stat-count">{counts.m[status]}</span>
            </div>
          ))}
        </div>
      )}
      {/* Phone: By Division is an interrupt sheet over the board. */}
      {!isDesktop && (
        <Sheet
          open={scope === 'division'}
          onClose={() => setScope('all')}
          title="Shore points by Division"
        >
          <SitStatRollup />
        </Sheet>
      )}

      {/* Hazard summary — taps to the Hazard Log workspace on the Deck */}
      {onOpenHazards ? (
        <button type="button" className="fs-cmd-haz fs-cmd-haz--press" onClick={onOpenHazards}>
          {hazardSummary}
          <span className="fs-cmd-haz-go" aria-hidden="true">›</span>
        </button>
      ) : (
        <div className="fs-cmd-haz">{hazardSummary}</div>
      )}

      {/* Resource roster */}
      <Card className="fs-cmd-roster">
        <div className="fs-cmd-roster-head">
          <span className="fs-cmd-eyebrow">Resource roster</span>
        </div>
        {resources.roster.length === 0 ? (
          <p className="fs-cmd-roster-empty">No resources assigned yet.</p>
        ) : (
          <>
            {resources.roster.slice(0, ROSTER_PREVIEW).map((r) => (
              <div key={r.key} className="fs-cmd-roster-row">
                <span>{r.label}</span>
                <Badge variant="label">{r.home}</Badge>
              </div>
            ))}
            {resources.roster.length > ROSTER_PREVIEW && (
              <p className="fs-cmd-roster-more">+ {resources.roster.length - ROSTER_PREVIEW} more</p>
            )}
          </>
        )}
      </Card>
    </>
  );
}
