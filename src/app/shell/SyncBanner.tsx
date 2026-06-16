import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useSession } from '@ui/hooks';

/**
 * SyncBanner — the dismissible "Sign in to sync" bar in the shell chrome
 * (workflow 06). Guest-only: it disappears the moment identity flips to member.
 * It taps forward to /auth — it is a nudge, never a wall (the work underneath
 * is fully usable as a guest; ADR-015). The /auth route lives outside the shell,
 * so the banner never renders there.
 */
export function SyncBanner() {
  const navigate = useNavigate();
  const { identity } = useSession();
  // ponytail: dismiss is session-only (in-memory) — it returns on reload.
  // Persist a meta flag if it should stay dismissed across launches.
  const [dismissed, setDismissed] = useState(false);

  if (identity.kind === 'member' || dismissed) return null;

  return (
    <div className="fs-sync-banner">
      <button
        type="button"
        className="fs-sync-banner-cta"
        onClick={() => navigate({ to: '/auth' })}
      >
        Sign in to sync
      </button>
      <button
        type="button"
        className="fs-sync-banner-dismiss"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
      >
        ✕
      </button>
    </div>
  );
}
