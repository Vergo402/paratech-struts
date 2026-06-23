import { FloatingPanel } from 'fieldshore-v4';
import { MeasurementValue } from 'fieldshore-v4';

// FloatingPanel — free-floating, pointer-draggable companion that hovers OVER the
// board (ADR-037), desktop ≥768px. Non-modal (board stays live), drag by the
// header grip, drag the bottom bar to resize. position:fixed; clamps to bounds.

const Line = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 16,
      padding: '6px 0',
      borderBottom: '1px solid var(--border, #e5e2db)',
    }}
  >
    <span style={{ color: 'var(--text-secondary, #6b6b6b)' }}>{k}</span>
    <span>{v}</span>
  </div>
);

export const Details = () => (
  <FloatingPanel open onClose={() => {}} title="SP-14 · Division 2 · Side A">
    <div style={{ fontSize: 15, lineHeight: 1.5 }}>
      <Line k="Shore type" v="T-Shore" />
      <Line k="Strut" v="LongShore 812" />
      <Line k="Header / Footer" v="4×4 / 4×4" />
      <Line k="Required length" v={<MeasurementValue eighths={47 * 8 + 3} />} />
      <Line k="Cut length" v={<MeasurementValue eighths={42 * 8 + 7} />} />
      <Line k="Status" v="Cutting Station" />
    </div>
  </FloatingPanel>
);

export const AvailableInventory = () => (
  <FloatingPanel
    open
    onClose={() => {}}
    title="Available — Engine 7"
    cascadeIndex={1}
  >
    <div style={{ fontSize: 15, lineHeight: 1.6 }}>
      <Line k="LongShore 812" v="4" />
      <Line k="Acme strut 36–57″" v="6" />
      <Line k="Multi-Base plate" v="8" />
      <Line k="4×4 lumber" v="12" />
    </div>
  </FloatingPanel>
);
