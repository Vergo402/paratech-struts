import { SideDrawer } from 'fieldshore-v4';

// SideDrawer — the edge-anchored companion panel (ADR-019). Phone = modal
// drawer over the scrim; desktop ≥768px = docked column beside a live board.
// Rendered open with the read-only deployed-shore detail it carries in Quick View.

const Field = ({ k, v }: { k: string; v: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)' }}>{k}</span>
    <span style={{ font: 'var(--type-body)', color: 'var(--text-primary)' }}>{v}</span>
  </div>
);

export const QuickView = () => (
  <SideDrawer open onClose={() => {}} title="SP-14 · T-Shore">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Field k="Division" v="Division 2 · Side A" />
      <Field k="Opening" v={'47 3/8"'} />
      <Field k="Strut" v="LongShore 812" />
      <Field k="Header / Footer" v="4×4 / 4×4" />
      <Field k="Status" v="Wood Shore Secured" />
      <Field k="Source rig" v="Engine 7" />
    </div>
  </SideDrawer>
);

export const Bom = () => (
  <SideDrawer open onClose={() => {}} title="Deployed BOM · SP-22">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Field k="3-Post strut" v="Squad 3" />
      <Field k="Acme base plate" v="Engine 7" />
      <Field k="6×6 footer" v="Off-book" />
      <Field k="Deployed by" v="Capt. Ramos · 14:32" />
    </div>
  </SideDrawer>
);
