import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { bootData } from '@data/store';
import { authSessionSync } from '@data/auth';
import { ThemeProvider } from './theme';
import { Splash } from './Splash';
import { ErrorBoundary } from './ErrorBoundary';
import { router } from './router';
import '@fontsource-variable/geist';
import '@fontsource-variable/inter'; // numeral/value font (--font-mono role); ADR-028
import './styles.css';

// Composition root — the one place outside ui/hooks that may touch @data
// (the boundary lint scopes invariant 3 to ui/*). The shell mounts only after
// bootData() resolves (Dexie open → uid → seed-if-empty → projection): the
// L-4 contract lets screens read hydrated in-memory state synchronously.
// QueryClient is wired per the constitution; the slice's hooks are
// zustand-backed — TanStack Query takes over when real async sync states
// arrive with the Firebase session.
const queryClient = new QueryClient();

function App() {
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // bootData is idempotent — StrictMode's double-invoke (and a retry bump of
    // `attempt`) re-run it safely (audit W6).
    let cancelled = false;
    setBootError(null);
    bootData()
      .then(() => {
        // Reconcile the session with Firebase Auth's restored user (a returning
        // member → authenticated cloud writes). Fire-and-forget: the listener
        // updates the session store reactively and the persisted meta-row
        // session covers the first paint; start() is StrictMode-safe.
        authSessionSync.start();
        if (!cancelled) setBooted(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) setBootError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Department switches (create / join / sign-out) reload onto the new bucket via an
  // EXPLICIT reloadIntoActiveBucket() at each action site (ui/dept/switchBucket) — not
  // a reactive subscribe here. The old subscribe fired the instant setDepartment()
  // flipped departmentId, tearing the page down mid-create before the invite-code
  // Sheet rendered and before the cloud writes settled. A member-with-no-department is
  // held out of the dept-scoped tabs by RequireDepartment (ui/dept), not by a reload.

  if (!booted) return <Splash error={bootError} onRetry={() => setAttempt((n) => n + 1)} />;
  return <RouterProvider router={router} />;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('FieldShore: #root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
