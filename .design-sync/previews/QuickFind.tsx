import { QuickFind } from 'fieldshore-v4';

// QuickFind — the standalone strut calculator and the app's guest cold-open. It
// owns all its own state (measurement, deductions, optional load, system filter)
// and runs the pure fit engine against the whole Paratech catalog, so it composes
// with ZERO props. The empty cold-open is the authorable, deterministic view:
// the measurement entry, the deductions toggle, the optional load field, and the
// Find Struts button. (Results live in a dismissible sheet raised on tap — not
// shown statically.)

export const ColdOpen = () => (
  <div style={{ maxWidth: 568, margin: '0 auto' }}>
    <QuickFind />
  </div>
);
