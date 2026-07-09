import { useMemo, useState } from 'react';
import type { ShorePointStatus } from '@core/schema';
import { STATUS_ORDER, STATUS_LABELS } from '@core/shorepoint';
import { currentIC, leaderOf, defaultPositionId, canAccept } from '@core/org';
import { openHazardsBySeverity, severityWord } from '@core/hazard';
import { Badge, Button, Card, Segmented, Sheet, useIsDesktop } from '@ui/primitives';
import { AlertIcon, ChevronRightIcon, FlagIcon, OrgGlyphIcon, PendingClockIcon } from './icons';
import {
  useOperation,
  useShorePoints,
  useOrg,
  useHazards,
  useCommandTransfer,
  useDeviceUidValue,
  usePendingResourceCount,
} from '@ui/hooks';
import { useOrgCommit } from './useOrgCommit';
import { SitStatRollup } from './SitStatRollup';
import { TransferCommand } from './TransferCommand';
import { OpPeriodIndicator, OpRolloverCard } from './OpPeriod';

// SitStat scope toggle (#353): the whole-incident board (default, unchanged) vs
// the per-Division roll-up table for "which Division is behind" at scale.
type SitStatScope = 'all' | 'division';
const SCOPE_OPTIONS = [
  { value: 'all', label: 'All incident' },
  { value: 'division', label: 'By Division' },
] as const;

/**
 * The Command situation rail — the six canonical datums in the user-mandated order:
 * incident name + OP/elapsed chrome, a stat strip (shore points · apparatus ·
 * individuals · conditional pending-sync), the command-staff card (IC with the one
 * gold accent + Operations Section Chief + Safety Officer as hairline rows), the
 * 7-status board card, the Hazards / Org Chart entry rows, the roster, and End
 * Operation. It IS the phone column verbatim and the desktop Deck's left rail (one
 * component, no second render path). `onOpenHazards` (both surfaces) opens the
 * Hazard Log — the Deck flips the workspace, the phone raises the Sheet;
 * `onOpenOrg` (phone only — the Deck already shows the chart) opens the org Sheet.
 */
export function CommandRail({
  onOpenHazards,
  onOpenOrg,
}: { onOpenHazards?: () => void; onOpenOrg?: () => void } = {}) {
  const operation = useOperation();
  const shorePoints = useShorePoints();
  const positions = useOrg();
  const hazards = useHazards();
  const isDesktop = useIsDesktop();
  const pending = useCommandTransfer();
  const uid = useDeviceUidValue();
  const pendingResourceCount = usePendingResourceCount();
  const emit = useOrgCommit();
  const [scope, setScope] = useState<SitStatScope>('all');
  const [transferOpen, setTransferOpen] = useState(false);
  const [rolloverOpen, setRolloverOpen] = useState(false);
  const [announce, setAnnounce] = useState('');

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

  // Org entry-row meta: how many positions exist and how many are staffed.
  const orgMeta = useMemo(() => {
    const all = Object.values(positions);
    return { total: all.length, assigned: all.filter((p) => p.assignedResources.length > 0).length };
  }, [positions]);

  const openHazards = useMemo(() => openHazardsBySeverity(hazards).filter((h) => h.mitigatedAt == null), [hazards]);

  if (!operation) return null;

  const ic = currentIC(positions);
  // Pre-auth IC gate (ADR-021), same shape as SitStat: this device commands when the IC
  // is unstaffed, isn't a device ref, or is this device's uid. Real auth verifies later.
  const isIC = uid != null && (!ic || ic.ref !== 'device' || ic.value === uid);
  const ops = positions[defaultPositionId(operation.id, 'ops')];
  const safety = positions[defaultPositionId(operation.id, 'safety')];
  const opsName = (ops && leaderOf(ops)?.label) ?? 'Unassigned';
  const safetyName = (safety && leaderOf(safety)?.label) ?? 'Unassigned';
  const ROSTER_PREVIEW = 3;
  const topHazard = openHazards[0];

  // Accept the pending handshake (either end — the incoming device's card or the
  // #401 hand-the-tablet section on the initiator's card). The announcement lives in
  // a persistent live region because the pending card unmounts when the event folds.
  const acceptTransfer = () => {
    if (!pending) return;
    setAnnounce(`Command transferred to ${pending.toResource.label}.`);
    void emit({ type: 'CommandTransferAccepted' });
  };

  return (
    <>
      <div className="fs-sr-only" role="status" aria-live="polite">
        {announce}
      </div>
      {/* Incident name up top + OP/elapsed (Safety Officer lives in the pair row below) */}
      <div className="fs-cmd-top">
        <div className="fs-cmd-incident">
          <h1 className="fs-cmd-title">{operation.name}</h1>
          {operation.location && <p className="fs-cmd-loc">{operation.location}</p>}
        </div>
        <OpPeriodIndicator operation={operation} onOpen={() => setRolloverOpen(true)} />
      </div>

      {/* Stat strip (craft.md §2) — the rail's top-level numbers in one quiet line.
          Replaces the Apparatus / Individuals metric cards whose display-2 zeros
          competed with the incident name. The pending-sync figure (#352) keeps its
          gold — Alex's explicit call (2026-07-02, reaffirmed 2026-07-06): the strip's
          one accent figure, hidden entirely at 0 (calm chrome). */}
      <div className="fs-cmd-stats">
        <span className="fs-cmd-statfig" data-zero={counts.total === 0 || undefined}>
          <span className="fs-cmd-stat-v">{counts.total}</span>
          <span className="fs-cmd-stat-k">{counts.total === 1 ? 'shore point' : 'shore points'}</span>
        </span>
        <span className="fs-cmd-statfig" data-zero={resources.apparatusCount === 0 || undefined}>
          <span className="fs-cmd-stat-v">{resources.apparatusCount}</span>
          <span className="fs-cmd-stat-k">apparatus</span>
        </span>
        <span className="fs-cmd-statfig" data-zero={resources.individualCount === 0 || undefined}>
          <span className="fs-cmd-stat-v">{resources.individualCount}</span>
          <span className="fs-cmd-stat-k">{resources.individualCount === 1 ? 'individual' : 'individuals'}</span>
        </span>
        {pendingResourceCount > 0 && (
          <span className="fs-cmd-statfig">
            <span className="fs-cmd-stat-v fs-cmd-stat-v--accent">{pendingResourceCount}</span>
            <span className="fs-cmd-stat-k">pending sync</span>
          </span>
        )}
      </div>

      {/* Command staff — one card, three hairline rows (was three separate cards of
          identical weight). The IC row keeps the gold underline — the single Command IC gold
          mark (Alex 2026-07-08, after previewing the full page; the org-chart IC node is a
          neutral root) — plus the command-transfer handshake trigger (#393, ADR-021). currentIC
          drives the row automatically; while a transfer is Pending command has NOT moved
          (outgoing stays IC of record). */}
      <Card className="fs-cmd-staff">
        <div className="fs-cmd-staff-row fs-cmd-staff-row--ic">
          <div className="fs-cmd-ic-main">
            <span className="fs-cmd-eyebrow">Incident Commander</span>
            <span className="fs-cmd-ic-name">{ic?.label ?? 'Unassigned'}</span>
          </div>
          {!pending && isIC && (
            <Button variant="tertiary" size="standard" onPress={() => setTransferOpen(true)}>
              Transfer
            </Button>
          )}
        </div>
        <div className="fs-cmd-staff-row">
          <span className="fs-cmd-eyebrow">Operations Section Chief</span>
          <span className={`fs-cmd-staff-name${ops && leaderOf(ops) ? '' : ' is-unassigned'}`}>{opsName}</span>
        </div>
        <div className="fs-cmd-staff-row">
          <span className="fs-cmd-eyebrow">Safety Officer</span>
          <span className={`fs-cmd-staff-name${safety && leaderOf(safety) ? '' : ' is-unassigned'}`}>{safetyName}</span>
        </div>
      </Card>

      {/* Pending handshake states (mutually exclusive). The INITIATOR always sees the
          pending/cancel view — it takes precedence over canAccept, which is true for
          any device when the recipient is an individual (soft claim, transfer.ts). */}
      {pending && pending.initiatedBy === uid ? (
        <Card className="fs-cmd-xfer fs-cmd-xfer--pending">
          <span className="fs-cmd-xfer-pending-text">
            <PendingClockIcon /> Transfer pending → {pending.toResource.label}
          </span>
          <Button variant="tertiary" size="standard" onPress={() => void emit({ type: 'CommandTransferCancelled' })}>
            Cancel transfer
          </Button>
          {/* Hand-the-tablet accept (#401) — the single-device completion of ADR-021.
              Named individual/apparatus targets only: canAccept (transfer.ts) already
              lets any uid accept on a named commander's behalf; a device-ref target
              keeps the strict named-device Accept, so this section never renders for it. */}
          {pending.toResource.ref !== 'device' && (
            <div className="fs-cmd-xfer-handover">
              <span className="fs-cmd-xfer-handover-head">Accepting on this device?</span>
              <span className="fs-cmd-xfer-sub">
                Give the briefing, then hand this device to {pending.toResource.label}.
              </span>
              <Button variant="primary" size="standard" fullWidth onPress={acceptTransfer}>
                {pending.toResource.label}: Accept command
              </Button>
              <span className="fs-cmd-xfer-footnote">Records the transfer — time, from, and to.</span>
            </div>
          )}
        </Card>
      ) : pending && canAccept(pending, uid ?? '') ? (
        <Card className="fs-cmd-xfer fs-cmd-xfer--incoming">
          <span className="fs-cmd-xfer-head">
            <FlagIcon /> You are being given command
          </span>
          <span className="fs-cmd-xfer-sub">
            from {ic?.label ?? 'the current IC'}
            {operation.name ? ` · ${operation.name}` : ''}
          </span>
          <div className="fs-cmd-xfer-actions">
            <Button variant="primary" size="standard" onPress={acceptTransfer}>
              Accept command
            </Button>
            <Button variant="tertiary" size="standard" onPress={() => void emit({ type: 'CommandTransferDeclined' })}>
              Decline
            </Button>
          </div>
        </Card>
      ) : pending ? (
        <div className="fs-cmd-xfer-quiet">
          <PendingClockIcon /> Transfer pending → {pending.toResource.label}
        </div>
      ) : null}

      <TransferCommand open={transferOpen} onClose={() => setTransferOpen(false)} />

      {/* OP rollover (#395) — surfaces at the boundary OR when opened from the header,
          non-blocking. Sequenced after command transfer: hidden while a handoff is
          pending so the two never stack. */}
      {!pending && (
        <OpRolloverCard operation={operation} open={rolloverOpen} onClose={() => setRolloverOpen(false)} />
      )}

      {/* Shore-point status board — the group label and the scope toggle (#353)
          share one quiet header row (the head + toggle + board previously spent
          three chrome rows before any data). */}
      <div className="fs-cmd-board-head">
        <span className="fs-cmd-eyebrow">Shore points</span>
        <Segmented
          size="standard"
          aria-label="Shore-point tally scope"
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={(v) => setScope(v)}
        />
      </div>
      {/* The whole-incident 7-status board stays the default and the desktop-inline
          fallback; the By-Division roll-up replaces it inline on desktop and rises
          as a Sheet on phone (the phone floor). One card, seven hairline rows: a 3px
          color key + label + tabular count. Zeros read as tertiary INK, not an
          opacity fade over contrast-audited tokens. */}
      {scope === 'division' && isDesktop ? (
        <SitStatRollup />
      ) : (
        <div className="fs-cmd-board" role="list" aria-label="Shore points by status">
          {STATUS_ORDER.map((status) => (
            <div
              key={status}
              className={`fs-cmd-stat is-${status}`}
              role="listitem"
              data-zero={counts.m[status] === 0 || undefined}
            >
              <span className="fs-cmd-stat-key" aria-hidden="true" />
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

      {/* Entry rows — Hazards (both surfaces: Deck flips the workspace, phone raises
          the Sheet) and Org Chart (phone only; the Deck already shows the chart).
          Real tap targets with live counts and a chevron — the phone previously
          offered two bare buttons plus an inert hazard line styled like this
          pressable one. Severity reads in its own warning tones, never gold. */}
      {(onOpenHazards || onOpenOrg) && (
      <Card className="fs-cmd-entrycard">
        {onOpenHazards && (
          <button type="button" className="fs-cmd-entry" onClick={onOpenHazards}>
            <span className={`fs-cmd-entry-icon${topHazard ? ` is-${topHazard.severity}` : ''}`}>
              <AlertIcon />
            </span>
            <span className="fs-cmd-entry-label">Hazards</span>
            {openHazards.length > 0 && topHazard ? (
              <>
                <span className={`fs-cmd-entry-chip is-${topHazard.severity}`}>
                  {openHazards.length} {severityWord(topHazard.severity).toUpperCase()}
                </span>
                <span className="fs-cmd-entry-meta">{topHazard.location}</span>
              </>
            ) : (
              <span className="fs-cmd-entry-meta">No open hazards</span>
            )}
            <span className="fs-cmd-entry-go">
              <ChevronRightIcon />
            </span>
          </button>
        )}
        {onOpenOrg && (
          <button type="button" className="fs-cmd-entry" onClick={onOpenOrg}>
            <span className="fs-cmd-entry-icon">
              <OrgGlyphIcon />
            </span>
            <span className="fs-cmd-entry-label">Org Chart</span>
            <span className="fs-cmd-entry-meta">
              {orgMeta.total} {orgMeta.total === 1 ? 'position' : 'positions'} · {orgMeta.assigned} assigned
            </span>
            <span className="fs-cmd-entry-go">
              <ChevronRightIcon />
            </span>
          </button>
        )}
      </Card>
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
