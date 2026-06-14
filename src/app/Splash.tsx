/**
 * Boot splash — shown while bootData() opens Dexie, mints the device uid,
 * seeds-if-empty, and folds the event log. The shell mounts only after boot
 * resolves (the L-4 contract: screens read hydrated in-memory state
 * synchronously, so nothing may render before hydration).
 */
export function Splash({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-2 bg-surface-bg text-ink">
      <h1 style={{ font: 'var(--type-display-2)' }}>FieldShore</h1>
      <p className="text-ink-secondary" style={{ font: 'var(--type-body)' }}>
        v4 — vertical slice
      </p>
      <span
        className={error ? 'text-status-pending' : 'text-ink-secondary'}
        style={{ font: 'var(--type-label)', letterSpacing: '0.08em' }}
      >
        {error ? `DATA LAYER ERROR — ${error}` : 'DATA LAYER BOOTING…'}
      </span>
      {/* A boot failure is often recoverable (storage hiccup, blocked upgrade) —
          offer a retry instead of dead-ending the field user (audit W6). */}
      {error && onRetry && (
        <button type="button" onClick={onRetry} style={{ marginTop: '0.5rem', minHeight: 44, padding: '0 1rem' }}>
          Try again
        </button>
      )}
    </main>
  );
}
