import { Component, type ReactNode } from 'react';

// Per-card crash net (F-SETUP-1). One shore point that throws on render — e.g. a record
// persisted under an OLDER schema, missing a now-required field — must not take the whole
// Operations board (and its route) down with it. The store already drops unreadable EVENTS
// on load (operationStore.loadEvents), so this is the belt to that suspenders: any residual
// render throw degrades to a compact tile while every other card on the board stays live.
export class CardBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state: { failed: boolean } = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('FieldShore: a shore-point card failed to render:', error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="fs-spc-unreadable" role="alert">
          This shore point couldn’t be displayed.
        </div>
      );
    }
    return this.props.children;
  }
}
