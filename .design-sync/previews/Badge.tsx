import { Badge } from 'fieldshore-v4';

// Badge — read-only indicator, five variants, one geometry. `status` renders
// the locked STATUS_LABELS word on the per-theme --status-* pair.

const Row = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
);

export const Status = () => (
  <Row>
    <Badge variant="status" status="pending" />
    <Badge variant="status" status="process" />
    <Badge variant="status" status="cutting" />
    <Badge variant="status" status="secured" />
  </Row>
);

export const Count = () => (
  <Row>
    <Badge variant="count" value={3} srLabel="3 shore points" />
    <Badge variant="count" value={21} srLabel="21 apparatus" />
  </Row>
);

export const Label = () => (
  <Row>
    <Badge variant="label">External</Badge>
    <Badge variant="label">Group 2</Badge>
  </Row>
);

export const Severity = () => (
  <Row>
    <Badge variant="severity">Over capacity</Badge>
    <Badge variant="severity">Unrated zone</Badge>
  </Row>
);

export const Dot = () => (
  <Row>
    <Badge variant="dot" tone="accent" text="Active" />
    <Badge variant="dot" tone="danger" text="Hazard" />
  </Row>
);
