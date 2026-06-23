import { useCallback, useEffect, useState } from 'react';
import { departmentService } from '@data/dept';
import type { AuditEntry } from '@core/audit';

// The Audit Log Administrative-view read (#211) — the governance audit cold-read
// (admin screen only, not an app-wide store), the useUserManager pattern. entries ===
// null means loading OR error (`error` tells them apart). manageUsers-gated server-side;
// a denial / offline read surfaces as error → a retry state, never a crash.

export interface AuditTrailApi {
  entries: AuditEntry[] | null;
  error: boolean;
  refresh: () => Promise<void>;
}

export function useAuditTrail(enabled = true): AuditTrailApi {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState(false);

  // `enabled` gates the read so a non-admin (e.g. an IC opening only the Incident view)
  // never fires a permission_denied read against the manageUsers-gated audit node.
  const refresh = useCallback(async () => {
    if (!enabled) {
      setError(false);
      setEntries(null);
      return;
    }
    setError(false);
    const a = await departmentService.readAudit();
    if (a === null) {
      setError(true);
      setEntries(null);
    } else {
      setEntries(a);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entries, error, refresh };
}
