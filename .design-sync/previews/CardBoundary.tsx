import { CardBoundary, Card } from 'fieldshore-v4';
import { useState } from 'react';

// CardBoundary — the per-card crash net (F-SETUP-1). One shore point that throws
// on render (e.g. a record under an older schema) degrades to a compact tile while
// every other card on the board stays live.

const Body = ({ title, sub }: { title: string; sub: string }) => (
  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
    <span style={{ font: 'var(--type-headline-2)', color: 'var(--text-primary)' }}>{title}</span>
    <span style={{ font: 'var(--type-body)', color: 'var(--text-secondary)' }}>{sub}</span>
  </div>
);

// A child that always throws — to render the boundary's degraded state.
function Boom(): never {
  throw new Error('Shore point persisted under an older schema');
}

export const HealthyChild = () => (
  <div style={{ width: 320 }}>
    <CardBoundary>
      <Card>
        <Body title="SP-14 · 3-Post" sub="Division 2 · West Wall · Rescue 1" />
      </Card>
    </CardBoundary>
  </div>
);

export const Degraded = () => {
  // Swallow the boundary's console.error so the cell renders cleanly.
  const [_] = useState(0);
  return (
    <div style={{ width: 320 }}>
      <CardBoundary>
        <Boom />
      </CardBoundary>
    </div>
  );
};
