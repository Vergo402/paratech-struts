import { useState } from 'react';
import { useOverridden, useSession, useSyncStatus } from '@ui/hooks';
import { clockTime } from '@ui/util/time';

/**
 * SyncBanner — the member sync trust signal between header and scroll pane
 * (cloud-sync Increment 4, ADR-024). Quiet when everything's synced (renders
 * nothing — the common case stays clutter-free); speaks up only when offline,
 * mid-sync, or a department join is waiting on a reconnect. Never dismissible —
 * it's live status, not a nudge.
 *
 * Guests get nothing here — their sign-in entry point is the nav's Sign in
 * button (the old "Sign in to sync" nudge was dropped 2026-07-13).
 * The /auth route lives outside the shell, so the banner never renders there.
 */
export function SyncBanner() {
  const { identity } = useSession();
  const { online, pendingCount, pendingJoin, pendingDeptPush, syncError } = useSyncStatus();
  const overridden = useOverridden();
  const [expanded, setExpanded] = useState(false);

  if (identity.kind !== 'member') return null;

  // MEMBER — live sync status (priority: a queued join, a dept still owed to the
  // cloud, then offline, then mid-sync).
  if (pendingJoin) {
    const name = pendingJoin.deptName ? `“${pendingJoin.deptName}”` : 'your department';
    return (
      <div className="fs-sync-banner fs-sync-banner--warning" role="status">
        <span className="fs-sync-banner-text">Will join {name} when you reconnect</span>
      </div>
    );
  }

  // #419 — the dept-create outbox hasn't confirmed yet: the department (and its
  // invite code) exist on this device only. Honest about what teammates can't do
  // yet; clears the moment the push lands.
  if (pendingDeptPush) {
    return (
      <div className="fs-sync-banner fs-sync-banner--warning" role="status">
        <span className="fs-sync-banner-text">
          “{pendingDeptPush.deptName}” is saved on this device —{' '}
          {online ? 'syncing to the cloud (invite code works after that)' : 'will sync when you reconnect'}
        </span>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="fs-sync-banner fs-sync-banner--warning" role="status">
        <span className="fs-sync-banner-text">
          Offline{pendingCount > 0 ? ` — ${changes(pendingCount)} saved on this device` : ''} — will sync
          when you reconnect
        </span>
      </div>
    );
  }

  if (pendingCount > 0) {
    // Stuck (writes failing, not progressing) must NOT read as "Syncing…" — a trust
    // signal can't show false progress on a life-safety screen.
    if (syncError) {
      return (
        <div className="fs-sync-banner fs-sync-banner--warning" role="status">
          <span className="fs-sync-banner-text">
            {changes(pendingCount)} haven&rsquo;t synced yet — retrying
          </span>
        </div>
      );
    }
    return (
      <div className="fs-sync-banner fs-sync-banner--info" role="status">
        <span className="fs-sync-banner-text">Syncing {changes(pendingCount)}…</span>
      </div>
    );
  }

  // #499 — synced, but some of THIS device's changes lost a race and had no effect. A
  // persistent quiet state until acknowledged (Principle 10): never a toast, never a modal.
  // Lowest priority so queued/offline/stuck status always speaks first.
  if (overridden.rows.length > 0) {
    const n = overridden.rows.length;
    return (
      <div className="fs-sync-banner fs-sync-banner--warning fs-sync-banner--overridden" role="status">
        <button
          type="button"
          className="fs-sync-banner-toggle"
          aria-expanded={expanded}
          aria-controls="fs-sync-overridden-list"
          onClick={() => setExpanded((v) => !v)}
        >
          <span className="fs-sync-banner-text">
            Synced — {n} of your changes had no effect
          </span>
          <svg className="fs-sync-banner-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={expanded ? 'M6 15l6 -6l6 6' : 'M6 9l6 6l6 -6'} />
          </svg>
        </button>
        {expanded && (
          <div id="fs-sync-overridden-list" className="fs-sync-overridden">
            <ul className="fs-sync-overridden-rows">
              {overridden.rows.map((r) => (
                <li key={r.id} className="fs-sync-overridden-row">
                  <strong className="fs-sync-overridden-title">{r.title}</strong>
                  <span className="fs-sync-overridden-line">{r.line}</span>
                  <span className="fs-sync-overridden-meta">
                    {clockTime(r.at)} · {r.who}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="fs-sync-overridden-ack" onClick={overridden.acknowledge}>
              Got it
            </button>
          </div>
        )}
      </div>
    );
  }

  // Online + nothing queued → no banner (quiet success).
  return null;
}

function changes(n: number): string {
  return `${n} change${n === 1 ? '' : 's'}`;
}
