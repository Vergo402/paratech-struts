import { OpPeriodIndicator } from 'fieldshore-v4';

const now = Date.now();
const HOUR = 3_600_000;

const wrap = (children: React.ReactNode) => (
  <div data-theme="dark" style={{ background: 'var(--surface-bg)', padding: 'var(--space-4)', display: 'flex', justifyContent: 'center' }}>
    {children}
  </div>
);

// OP 1 — 4h 22m elapsed, no planned length
export function Running() {
  return wrap(
    <OpPeriodIndicator
      operation={{
        id: 'op-1', name: 'Surfside TF-1', multiBuilding: false, inlineDeploy: false,
        divisions: [1], saws: ['A'], status: 'active',
        createdAt: now - 4.37 * HOUR, currentPeriod: 1,
        periods: [{ number: 1, startedAt: now - 4.37 * HOUR }],
      }}
      onOpen={() => {}}
    />
  );
}

// OP 2 — mid-period (6h into 12h plan), progress bar visible
export function WithProgress() {
  return wrap(
    <OpPeriodIndicator
      operation={{
        id: 'op-1', name: 'Surfside TF-1', multiBuilding: false, inlineDeploy: false,
        divisions: [1], saws: ['A'], status: 'active',
        createdAt: now - 18 * HOUR, currentPeriod: 2,
        periods: [
          { number: 1, startedAt: now - 18 * HOUR, plannedDurationMs: 12 * HOUR },
          { number: 2, startedAt: now - 6 * HOUR, plannedDurationMs: 12 * HOUR },
        ],
      }}
      onOpen={() => {}}
    />
  );
}

// OP 3 — amber, near planned end (11h 45m into 12h)
export function NearEnd() {
  return wrap(
    <OpPeriodIndicator
      operation={{
        id: 'op-1', name: 'Surfside TF-1', multiBuilding: false, inlineDeploy: false,
        divisions: [1], saws: ['A'], status: 'active',
        createdAt: now - (24 + 11.75) * HOUR, currentPeriod: 3,
        periods: [
          { number: 1, startedAt: now - (24 + 11.75) * HOUR, plannedDurationMs: 12 * HOUR },
          { number: 2, startedAt: now - (12 + 11.75) * HOUR, plannedDurationMs: 12 * HOUR },
          { number: 3, startedAt: now - 11.75 * HOUR, plannedDurationMs: 12 * HOUR },
        ],
      }}
      onOpen={() => {}}
    />
  );
}
