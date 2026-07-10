import { Card } from '@ui/primitives';
import { usePastOperations } from '@ui/hooks';
import { dateClock } from '../util/time';

/**
 * Past-operations list (#238) — read-only finished-incident cards below the
 * Operations empty-state. Tapping one opens the read-only drill-in
 * (PastOperationView). Renders nothing until at least one incident is archived.
 */
export function PastOperationsList({ onOpen }: { onOpen: (opId: string) => void }) {
  const { data: ops } = usePastOperations();
  if (!ops || ops.length === 0) return null;

  return (
    <section className="fs-archive-list" aria-label="Past operations">
      <h2 className="fs-archive-list-title">Past operations</h2>
      {ops.map((op) => (
        <Card key={op.id} onPress={() => onOpen(op.id)} className="fs-archive-row">
          <span className="fs-archive-row-name">{op.name}</span>
          <span className="fs-archive-row-meta">
            Ended {dateClock(op.endedAt)} · {op.shorePointCount}{' '}
            {op.shorePointCount === 1 ? 'shore point' : 'shore points'}
          </span>
        </Card>
      ))}
    </section>
  );
}
