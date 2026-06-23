import { PlateSwatch } from 'fieldshore-v4';

// PlateSwatch — the connector/base-plate thumbnail used by the visual-grid
// picker. Ships initials on the accent-subtle tile until real photos land
// (public/plates/*.jpg via renderThumb).

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
);

const Cell = ({ name }: { name: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 96 }}>
    <PlateSwatch name={name} />
    <span style={{ font: 'var(--type-caption)', color: 'var(--text-secondary)', textAlign: 'center' }}>{name}</span>
  </div>
);

export const Connectors = () => (
  <Row>
    <Cell name="Multi-Base" />
    <Cell name="LongShore base" />
    <Cell name="Swivel base" />
  </Row>
);

export const MorePlates = () => (
  <Row>
    <Cell name="Pin base" />
    <Cell name="Wedge plate" />
    <Cell name="Acme adapter" />
  </Row>
);
