import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { bootData } from '@data/store';
import { ThemeProvider } from './theme';
import { Splash } from './Splash';
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

  useEffect(() => {
    // bootData is idempotent — StrictMode's double-invoke is expected.
    bootData()
      .then(() => setBooted(true))
      .catch((err: unknown) => setBootError(err instanceof Error ? err.message : String(err)));
  }, []);

  if (!booted) return <Splash error={bootError} />;
  return <RouterProvider router={router} />;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('FieldShore: #root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
