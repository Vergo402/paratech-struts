// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { buildDefaultTree, defaultPositionId } from '@core/org';
import { SubTree, READ_ONLY_DND } from './OrgTree';

// Assignment numerals (#434, craft.md §10) — the node's quiet bottom line. Rendered
// read-only (no dnd, no hooks): SubTree is a pure renderer over positions + counts.

const id = (k: Parameters<typeof defaultPositionId>[1]) => defaultPositionId('op1', k);

function renderTree(counts?: Record<string, number>, cuttingQueue?: number) {
  const positions = buildDefaultTree('op1');
  const rootId = id('ic');
  return render(
    <ul>
      <SubTree
        positions={positions}
        id={rootId}
        rootId={rootId}
        depth={0}
        onOpen={() => {}}
        dnd={READ_ONLY_DND}
        editable={false}
        interactive={false}
        counts={counts}
        cuttingQueue={cuttingQueue}
      />
    </ul>,
  );
}

describe('OrgTree — assignment numerals (#434)', () => {
  it('shows "N total shore points" on a position with a tally', () => {
    renderTree({ [id('shoring')]: 4 });
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/total shore points/)).toBeInTheDocument();
  });

  it('uses the singular for one point', () => {
    renderTree({ [id('shoring')]: 1 });
    expect(screen.getByText(/total shore point$/)).toBeInTheDocument();
    expect(screen.queryByText(/total shore points/)).not.toBeInTheDocument();
  });

  it('shows "N in queue" on the workstation node', () => {
    renderTree(undefined, 2);
    expect(screen.getByText(/in queue/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders no count lines at zero', () => {
    renderTree({}, 0);
    expect(screen.queryByText(/total shore point/)).not.toBeInTheDocument();
    expect(screen.queryByText(/in queue/)).not.toBeInTheDocument();
  });
});
