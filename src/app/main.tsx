import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

// Session-1 splash. Intentionally minimal — its only job is to prove the
// toolchain end-to-end: Tailwind v4 utilities (bg-surface-bg / text-ink) resolve
// the design tokens, and a [data-theme] swap on <html> recolors the page. The
// real app shell (router, providers, nav) lands in S3. Not the gate for Session 1
// (the gate is typecheck + lint + test on pure core), but a free build smoke test.
function Splash() {
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
