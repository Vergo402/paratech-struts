import { Card } from 'fieldshore-v4';

// Card — flat bounded surface holding one object. Hairline stroke, no drop
// shadow. `selected` = accent border. `edge` is the left status-stripe slot.

const Body = ({ title, sub }: { title: string; sub: string }) => (
  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ font: 'var(--type-headline-2)', color: 'var(--text-primary)' }}>{title}</span>
    <span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>{sub}</span>
  </div>
);

export const Default = () => (
  <div style={{ width: 300 }}>
    <Card>
      <Body title="Division 2 · Side A" sub="3 shore points · LongShore 812" />
    </Card>
  </div>
);

export const Selected = () => (
  <div style={{ width: 300 }}>
    <Card selected>
      <Body title="SP-14 · T-Shore" sub="Equipment assigned · 4×4 header" />
    </Card>
  </div>
);

export const Pressable = () => (
  <div style={{ width: 300 }}>
    <Card onPress={() => {}}>
      <Body title="Engine 7" sub="Tap to view inventory" />
    </Card>
  </div>
);

export const WithStatusEdge = () => (
  <div style={{ width: 300 }}>
    <Card edge={<span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--accent)' }} />}>
      <Body title="SP-22 · 3-Post" sub="Cutting Station · 6×6 footer" />
    </Card>
  </div>
);
