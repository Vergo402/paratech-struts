import { Component, type ReactNode } from 'react';

/**
 * App-root backstop (audit W6): a render throw anywhere in the tree shows a
 * recoverable screen with a reload instead of unmounting React to a blank page.
 * Kept dependency-light (plain markup) so it renders even when app code is the
 * thing that broke. Route-level throws are caught by the router's
 * defaultErrorComponent; this catches everything outside the router.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('FieldShore crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <main
          role="alert"
          style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-start' }}
        >
          <h1>Something went wrong</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 44, padding: '0 1rem' }}>
            Reload FieldShore
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
