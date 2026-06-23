import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { InlineSegmented } from '@ui/picker';
import { EmptyState } from '@ui/primitives';
import { useAuditAccess, useAuditTrail, useEventLog, useRoles, useUserManager } from '@ui/hooks';
import { describeAuditLog, describeEventLog, auditRowsToCsv, type AuditRow } from '@core/audit';
import { download } from '@ui/util/download';
import './admin.css';

// Audit Log (#211) — the read-only, queryable view of the two append-only trails: the
// operations EVENT log (Incident view, IC/Operations-gated) and the governance AUDIT
// node (Administrative view, manageUsers-gated). Sibling of the User Manager under the
// Settings Administration gateway. Immutable — no destructive overlay (ADR-016); a row
// taps to expand its detail inline. Phone is the floor; reuses the User Manager row CSS.

type Face = 'incident' | 'administrative';
type Scope = 'all' | 'action' | 'person';

const SCOPE_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'action' as const, label: 'By action' },
  { value: 'person' as const, label: 'By person' },
];

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M13 5l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true" style={{ flex: '0 0 auto' }}>
      <rect x="2.5" y="5.5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4 5.5V4a2.5 2.5 0 015 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path d="M7.5 2v7m0 0L4.5 6m3 3l3-3M3 12.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fmtTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtFull(at: number): string {
  return new Date(at).toLocaleString();
}

export function AuditLogScreen() {
  const navigate = useNavigate();
  const access = useAuditAccess();
  const { canIncident, canAdministrative, opId, opName } = access;

  // Both reads are entitlement-gated so a viewer never fires a denied read for a view
  // they can't see (the Incident log is local; the audit node is manageUsers-gated).
  const incident = useEventLog(canIncident ? opId : null);
  const audit = useAuditTrail(canAdministrative);
  const um = useUserManager(canAdministrative); // members → names for the Administrative view
  const roles = useRoles();

  const allowed = useMemo<Face[]>(
    () => [...(canIncident ? (['incident'] as const) : []), ...(canAdministrative ? (['administrative'] as const) : [])],
    [canIncident, canAdministrative],
  );
  const [face, setFace] = useState<Face>('incident');
  const activeFace: Face | null = allowed.includes(face) ? face : (allowed[0] ?? null);

  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const incidentRows = useMemo<AuditRow[]>(
    () => (opId ? describeEventLog(incident.events, opId).slice().reverse() : []),
    [incident.events, opId],
  );
  const auditRows = useMemo<AuditRow[]>(() => {
    if (!audit.entries) return [];
    return describeAuditLog(audit.entries, {
      member: (uid) => um.members?.[uid]?.displayName,
      role: (id) => roles[id]?.name,
    }).slice().reverse();
  }, [audit.entries, um.members, roles]);

  const whoLabel = (r: AuditRow): string => r.actor ?? (r.by === incident.deviceUid ? 'You' : 'A device');

  const rows = activeFace === 'incident' ? incidentRows : auditRows;
  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) => `${r.text} ${r.detail ?? ''} ${r.actor ?? ''} ${r.badge}`.toLowerCase().includes(q));
  }, [rows, q]);

  // Scope grouping: 'all' = the flat newest-first list; 'action'/'person' cluster under a
  // group header (stable sort by key, newest-first within). (By operational period is
  // deferred — no OP-period data is modeled yet.)
  const display = useMemo<Array<{ header?: string; row?: AuditRow }>>(() => {
    if (scope === 'all') return filtered.map((row) => ({ row }));
    const keyOf = (r: AuditRow) => (scope === 'action' ? r.badge : whoLabel(r));
    const sorted = filtered.slice().sort((a, b) => keyOf(a).localeCompare(keyOf(b)) || b.at - a.at);
    const out: Array<{ header?: string; row?: AuditRow }> = [];
    let last: string | null = null;
    for (const r of sorted) {
      const k = keyOf(r);
      if (k !== last) {
        out.push({ header: k });
        last = k;
      }
      out.push({ row: r });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, scope, incident.deviceUid]);

  if (!access.loading && allowed.length === 0) {
    return (
      <div className="fs-um">
        <EmptyState
          variant="upstream-blocked"
          headline="Command record"
          reason="The audit log is for the Incident Commander, the Operations Section Chief, or a department admin."
          action={{ label: 'Back to Settings', onPress: () => navigate({ to: '/settings' }) }}
        />
      </div>
    );
  }

  const onExport = () => {
    download(`fieldshore-audit-${activeFace ?? 'log'}.csv`, auditRowsToCsv(filtered));
  };

  const lock =
    activeFace === 'administrative'
      ? { context: 'Department record', who: 'Admins only' }
      : { context: opName ?? 'Current operation', who: 'IC / Operations' };

  // Per-face data posture — loading / read-error / empty (vs filtered-empty).
  const loadingFace =
    access.loading ||
    (activeFace === 'administrative' && audit.entries === null && !audit.error);
  const adminError = activeFace === 'administrative' && audit.error;

  return (
    <div className="fs-um">
      <div className="fs-um-head">
        <button type="button" className="fs-um-back" aria-label="Back to Settings" onClick={() => navigate({ to: '/settings' })}>
          <BackIcon />
        </button>
        <h1 className="fs-um-title">Audit log</h1>
        {activeFace && filtered.length > 0 && (
          <button type="button" className="fs-al-export" onClick={onExport} aria-label="Export this view as CSV">
            <DownloadIcon /> CSV
          </button>
        )}
      </div>

      {allowed.length === 2 && (
        <InlineSegmented
          label="View"
          options={[
            { value: 'incident' as const, label: 'Incident' },
            { value: 'administrative' as const, label: 'Administrative' },
          ]}
          value={activeFace ?? 'incident'}
          onChange={(v) => {
            setFace(v);
            setExpanded(null);
            setSearch('');
            setScope('all');
          }}
        />
      )}

      {activeFace && (
        <p className="fs-al-lock">
          <span className="fs-al-lock-ctx">{lock.context}</span>
          <span className="fs-al-lock-who">
            <LockIcon /> {lock.who}
          </span>
        </p>
      )}

      <input
        className="fs-al-filter"
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Filter by person, action, time…"
        aria-label="Filter the log"
      />

      <InlineSegmented label="Scope" options={SCOPE_OPTIONS} value={scope} onChange={setScope} />

      {loadingFace ? (
        <p className="fs-um-row-sub" style={{ padding: 'var(--space-3) 0' }}>Loading…</p>
      ) : adminError ? (
        <EmptyState
          variant="upstream-blocked"
          headline="Couldn’t load the trail"
          reason="Check your connection and try again."
          action={{ label: 'Retry', onPress: () => void audit.refresh() }}
        />
      ) : rows.length === 0 ? (
        <EmptyState variant="all-clear" headline="Nothing logged yet" reason="The log fills as work happens." />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="filtered"
          headline="No matching entries"
          reason="No log entries match your filter."
          action={{ label: 'Clear filter', onPress: () => setSearch('') }}
        />
      ) : (
        <div className="fs-al-list">
          {display.map((item, i) =>
            item.header !== undefined ? (
              <p key={`h-${i}`} className="fs-al-group">{item.header}</p>
            ) : (
              <AuditRowItem
                key={item.row!.id}
                row={item.row!}
                who={whoLabel(item.row!)}
                expanded={expanded === item.row!.id}
                onToggle={() => setExpanded(expanded === item.row!.id ? null : item.row!.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function AuditRowItem({ row, who, expanded, onToggle }: { row: AuditRow; who: string; expanded: boolean; onToggle: () => void }) {
  const hasDetail = !!row.detail;
  return (
    <button
      type="button"
      className="fs-al-row"
      aria-expanded={hasDetail ? expanded : undefined}
      onClick={hasDetail ? onToggle : undefined}
      data-static={hasDetail ? undefined : ''}
    >
      <span className="fs-al-row-top">
        <span className="fs-al-row-text">{row.text}</span>
        <span className={`fs-al-badge fs-al-badge--${row.tone}`}>{row.badge}</span>
      </span>
      <span className="fs-al-row-meta">
        {who} · {fmtTime(row.at)}
      </span>
      {expanded && hasDetail && (
        <span className="fs-al-row-detail">
          {row.detail}
          <span className="fs-al-row-when">{fmtFull(row.at)}</span>
        </span>
      )}
    </button>
  );
}
