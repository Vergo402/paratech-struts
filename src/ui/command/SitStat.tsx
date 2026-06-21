import { useMemo, useState } from 'react';
import type { ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS } from '@core/shorepoint';
import { currentIC, leaderOf, defaultPositionId } from '@core/org';
import { newId } from '@core/id';
import { Badge, Button, Card, EmptyState, Modal } from '@ui/primitives';
import { useOperation, useShorePoints, useOrg, useHazards, useCommit, useDeviceUid } from '@ui/hooks';
import { useElapsed } from './useElapsed';
import './command.css';

// The running clock as its own leaf — so the 1s tick re-renders ONLY this node,
// never the rest of SitStat (v3 discipline).
function ElapsedClock({ since }: { since: number | undefined }) {
  return <span className="fs-cmd-clock">{useElapsed(since)}</span>;
}

/**
 * SitStat — the Command tab home (#201). The Incident Commander's read view: six
 * canonical datums above the fold (incident · IC w/ gold accent · Safety Officer ·
 * resources · 7-status shore board · OP + elapsed), then the one-tap entries, the
 * resource roster, and End Operation. READ-only this phase — Org Chart / Hazard Log
 * editing and resource assignment arrive in P6–P9.
 */
export function SitStat() {
  const operation = useOperation();
  const shorePoints = useShorePoints();
  const positions = useOrg();
  const hazards = useHazards();
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [endOpOpen, setEndOpOpen] = useState(false);

  const counts = useMemo(() => {
    const m = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<ShorePointStatus, number>;
    let total = 0;
    for (const sp of shorePoints) {
      if (sp.deletedAt != null) continue; // soft-deleted: out of the picture
      m[sp.status]++;
      total++;
    }
    return { m, total };
  }, [shorePoints]);

  // Distinct assigned resources across the chart = the "assigned apparatus +
  // individuals" datum (the device/self ref is not a roster resource).
  const resources = useMemo(() => {
    const apparatus = new Set<string>();
    const individuals = new Set<string>();
    const roster: { key: string; label: string; home: string }[] = [];
    const seen = new Set<string>();
    for (const p of Object.values(positions)) {
      for (const r of p.assignedResources) {
        if (r.ref === 'apparatus') apparatus.add(r.value);
        else if (r.ref === 'individual') individuals.add(r.value);
        else continue; // device/self — not a roster resource
        const key = `${r.ref}:${r.value}`;
        if (seen.has(key)) continue;
        seen.add(key);
        roster.push({ key, label: r.label, home: p.title });
      }
    }
    return { apparatusCount: apparatus.size, individualCount: individuals.size, roster };
  }, [positions]);

  const openHazards = useMemo(
    () => Object.values(hazards).filter((h) => h.mitigatedAt == null).length,
    [hazards],
  );

  if (!operation) {
    return (
      <div className="fs-cmd">
        <EmptyState
          variant="first-run"
          headline="No active operation"
          reason="Start an operation from the Operations tab to see the command picture."
        />
      </div>
    );
  }

  const ic = currentIC(positions);
  const safety = positions[defaultPositionId(operation.id, 'safety')];
  const safetyName = (safety && leaderOf(safety)?.label) ?? 'Unassigned';
  const ROSTER_PREVIEW = 3;

  const endOperation = async () => {
    const result = await commit({
      type: 'OperationEnded',
      id: newId(),
      opId: operation.id,
      at: Date.now(),
      by: await getUid(),
    });
    if (result.ok) setEndOpOpen(false);
  };

  return (
    <div className="fs-cmd">
      {/* Persistent chrome — Safety Officer + OP/elapsed (C-6) */}
      <div className="fs-cmd-chrome">
        <div className="fs-cmd-so">
          <span className="fs-cmd-eyebrow">Safety Officer</span>
          <span className="fs-cmd-so-name">
            {safetyName !== 'Unassigned' && <span className="fs-cmd-so-dot" aria-hidden="true" />}
            {safetyName}
          </span>
        </div>
        <div className="fs-cmd-op">
          <span className="fs-cmd-eyebrow">OP 1 · Elapsed</span>
          <ElapsedClock since={operation.createdAt} />
        </div>
      </div>

      {/* Incident name */}
      <div className="fs-cmd-incident">
        <h1 className="fs-cmd-title">{operation.name}</h1>
        {operation.location && <p className="fs-cmd-loc">{operation.location}</p>}
      </div>

      {/* Incident Commander — the one gold accent */}
      <Card className="fs-cmd-ic">
        <div>
          <span className="fs-cmd-eyebrow">Incident Commander</span>
          <span className="fs-cmd-ic-name">{ic?.label ?? 'Unassigned'}</span>
        </div>
      </Card>

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
      <div className="fs-cmd-board" role="list" aria-label="Shore points by status">
        {STATUS_ORDER.map((status) => (
          <div key={status} className={`fs-cmd-stat is-${status}`} role="listitem">
            <span className="fs-cmd-stat-label">{STATUS_LABELS[status]}</span>
            <span className="fs-cmd-stat-count">{counts.m[status]}</span>
          </div>
        ))}
      </div>

      <div className="fs-cmd-divider" />

      {/* One-tap entries — destinations build in P6 (Org Chart) / P9 (Hazard Log) */}
      <div className="fs-cmd-entries">
        <Button variant="secondary" disabled disabledReason="Builds next" onPress={() => {}}>
          Org Chart
        </Button>
        <Button variant="secondary" disabled disabledReason="Builds next" onPress={() => {}}>
          Hazard Log{openHazards > 0 ? ` (${openHazards})` : ''}
        </Button>
      </div>

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

      <Button variant="secondary" destructive fullWidth onPress={() => setEndOpOpen(true)}>
        End Operation
      </Button>

      <Modal
        open={endOpOpen}
        onClose={() => setEndOpOpen(false)}
        title="End Operation?"
        variant="destructive"
        footer={
          <>
            <Button variant="secondary" onPress={() => setEndOpOpen(false)}>
              <span data-modal-cancel>Cancel</span>
            </Button>
            <Button variant="primary" destructive onPress={endOperation}>
              End Operation
            </Button>
          </>
        }
      >
        <p>This archives every shore point and ends the active operation. You can start a new one afterward.</p>
      </Modal>
    </div>
  );
}
