import { useEffect, useState } from 'react';
import type { FieldShoreEvent, Operation } from '@core/schema';
import { periodStatus } from '@core/operation';
import { newId } from '@core/id';
import { Button, TextField } from '@ui/primitives';
import { useCommit, useDeviceUid } from '@ui/hooks';

// Operational-period UI (#395) — the persistent-header OP clock + the boundary
// rollover card. Period data is projected onto the operation (currentPeriod +
// periods); periodStatus (core/operation) does the elapsed/progress/amber math.

const MIN = 60_000;
const HOUR = 3_600_000;

// "4h 22m" (or "48m" under an hour). Round down — a clock never rounds time up.
function fmtShort(ms: number): string {
  const total = Math.max(0, Math.floor(ms / MIN));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function activePeriod(op: Operation) {
  return op.periods.find((p) => p.number === op.currentPeriod) ?? op.periods[op.periods.length - 1];
}

/** Tick `now` once a second while `active`; one isolated leaf so only the clock
 *  re-renders (the useElapsed discipline). */
function useNowTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

/**
 * The header OP indicator — replaces the old hardcoded "OP 1 · Elapsed". Shows the
 * real period number + within-period elapsed; a thin progress bar within the planned
 * length (omitted when no planned length); a quiet amber accent in the last 30 min
 * and after the planned end (the IAP-cycle nudge, not an alarm).
 */
export function OpPeriodIndicator({ operation, onOpen }: { operation: Operation; onOpen: () => void }) {
  const period = activePeriod(operation);
  const now = useNowTick(true);
  if (!period) return null;
  const s = periodStatus(period, now);
  const amber = s.nearEnd || s.pastEnd;

  const eyebrow = !amber
    ? 'Elapsed'
    : s.pastEnd
      ? 'Due now'
      : `${fmtShort(s.remainingMs ?? 0)} left`;

  // The block is a button so the IC can roll over (or set the period length) any
  // time — the auto-surfacing card only appears at the boundary, but OP 1 carries no
  // planned length, so without this manual entry the first rollover is unreachable.
  return (
    <button
      type="button"
      className={`fs-cmd-op${amber ? ' is-amber' : ''}`}
      onClick={onOpen}
      aria-label={`Operational period ${operation.currentPeriod} — manage`}
    >
      <span className="fs-cmd-eyebrow fs-cmd-op-eyebrow">
        OP {operation.currentPeriod} · {eyebrow}
      </span>
      <span className="fs-cmd-clock">{fmtShort(s.elapsedMs)}</span>
      {s.fraction != null && (
        <div className="fs-cmd-op-track" role="presentation">
          <div className="fs-cmd-op-fill" style={{ width: `${Math.round(s.fraction * 100)}%` }} />
        </div>
      )}
    </button>
  );
}

const LENGTHS = [
  { label: '12 h', ms: 12 * HOUR },
  { label: '8 h', ms: 8 * HOUR },
] as const;

/**
 * The boundary rollover card (#395) — surfaces, non-blocking, when the active period
 * is past its planned end. Starts the next period (a single OperationPeriodStarted
 * event) with a chosen planned length + an optional ICS-202/IAP reference, or is
 * dismissed ("Not yet") per-device until the next boundary. Composes with command
 * transfer by sequencing: the caller hides this while a transfer is pending.
 */
export function OpRolloverCard({
  operation,
  open,
  onClose,
}: {
  operation: Operation;
  open: boolean;
  onClose: () => void;
}) {
  const period = activePeriod(operation);
  const now = useNowTick(true);
  const commit = useCommit();
  const getUid = useDeviceUid();
  const [dismissedFor, setDismissedFor] = useState<number | null>(null);
  const [lengthMs, setLengthMs] = useState<number | 'custom'>(12 * HOUR);
  const [customHours, setCustomHours] = useState('');
  const [iapRef, setIapRef] = useState('');

  if (!period) return null;
  const s = periodStatus(period, now);
  // Surface at the boundary (auto, once per period until dismissed) OR when the IC
  // opened it from the header. Either way it's the same card.
  const auto = s.pastEnd && dismissedFor !== operation.currentPeriod;
  if (!open && !auto) return null;

  const dismiss = () => {
    setDismissedFor(operation.currentPeriod);
    onClose();
  };

  const next = operation.currentPeriod + 1;
  const plannedDurationMs =
    lengthMs === 'custom' ? Math.round(Number(customHours) * HOUR) : lengthMs;
  const customInvalid = lengthMs === 'custom' && !(plannedDurationMs > 0);

  const start = async () => {
    if (customInvalid) return;
    const by = await getUid();
    const event: FieldShoreEvent = {
      type: 'OperationPeriodStarted',
      id: newId(),
      opId: operation.id,
      at: Date.now(),
      by,
      periodNumber: next,
      ...(plannedDurationMs > 0 ? { plannedDurationMs } : {}),
      ...(iapRef.trim() ? { iapRef: iapRef.trim() } : {}),
    };
    const res = await commit(event);
    if (res.ok) {
      setIapRef('');
      setCustomHours('');
      onClose(); // the new period isn't past-end, so the card stands down
    }
  };

  return (
    <div className="fs-cmd-rollover">
      <div className="fs-cmd-rollover-head">
        <span className="fs-cmd-rollover-title">
          {s.pastEnd ? `OP ${operation.currentPeriod} complete — start OP ${next}?` : `Start OP ${next}?`}
        </span>
      </div>
      <p className="fs-cmd-rollover-sub">
        Tagging the next period keeps the after-action export clean. You can keep working and do this later.
      </p>

      <div className="fs-cmd-rollover-field">
        <span className="fs-cmd-eyebrow">Planned length</span>
        <div className="fs-cmd-rollover-chips">
          {LENGTHS.map((l) => (
            <button
              key={l.label}
              type="button"
              className={`fs-cmd-chip${lengthMs === l.ms ? ' is-on' : ''}`}
              aria-pressed={lengthMs === l.ms}
              onClick={() => setLengthMs(l.ms)}
            >
              {l.label}
            </button>
          ))}
          <button
            type="button"
            className={`fs-cmd-chip${lengthMs === 'custom' ? ' is-on' : ''}`}
            aria-pressed={lengthMs === 'custom'}
            onClick={() => setLengthMs('custom')}
          >
            Custom
          </button>
        </div>
        {lengthMs === 'custom' && (
          <TextField
            label="Custom planned length (hours)"
            value={customHours}
            onChange={setCustomHours}
            inputMode="decimal"
            placeholder="hrs"
            size="standard"
          />
        )}
      </div>

      <div className="fs-cmd-rollover-field">
        <TextField
          label="IAP / ICS-202 reference"
          value={iapRef}
          onChange={setIapRef}
          placeholder="e.g. IAP-3"
          helper="Optional."
          size="standard"
        />
      </div>

      <div className="fs-cmd-rollover-actions">
        <Button variant="primary" size="standard" onPress={start} disabled={customInvalid} disabledReason={customInvalid ? 'Enter a planned length in hours' : undefined}>
          Start OP {next}
        </Button>
        <Button variant="tertiary" size="standard" onPress={dismiss}>
          Not yet
        </Button>
      </div>
    </div>
  );
}
