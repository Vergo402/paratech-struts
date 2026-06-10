import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { bootData, type BootResult } from '@data/store';
import './styles.css';

// Session-2 splash. Still intentionally minimal — S1 proved the token pipeline;
// S2 adds the data-layer boot (Dexie open → uid mint → seed-if-empty → event-log
// projection) and surfaces one proof line. The real app shell (router,
// providers, nav) lands in S3. src/app is the composition root — the one place
// outside ui/hooks that may touch @data (the boundary lint scopes invariant 3
// to ui/*).
function Splash() {
  const [boot, setBoot] = useState<BootResult | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    bootData()
      .then(setBoot)
      .catch((err: unknown) => setBootError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-2 bg-surface-bg text-ink">
      <h1 style={{ font: 'var(--type-display-2)' }}>FieldShore</h1>
      <p className="text-ink-secondary" style={{ font: 'var(--type-body)' }}>
        v4 — vertical slice scaffold
      </p>
      <span
        className="text-accent"
        style={{ font: 'var(--type-label)', letterSpacing: '0.08em' }}
      >
        TOOLCHAIN ONLINE
      </span>
      <span
        className={bootError ? 'text-status-pending' : 'text-ink-secondary'}
        style={{ font: 'var(--type-label)', letterSpacing: '0.08em' }}
      >
        {bootError
          ? `DATA LAYER ERROR — ${bootError}`
          : boot
            ? `DATA LAYER READY — ${boot.inventoryCount} INVENTORY ITEMS · ${boot.eventCount} EVENTS`
            : 'DATA LAYER BOOTING…'}
      </span>
    </main>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('FieldShore: #root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
);
