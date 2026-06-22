import { useState } from 'react';
import { currentIC } from '@core/org';
import { Button, ChecklistTab, EmptyState, Sheet, SideDrawer, useMediaQuery } from '@ui/primitives';
import { useOperation, useOrg, useDeviceUidValue } from '@ui/hooks';
import { CommandRail } from './CommandRail';
import { CommandWorkspace, type WorkspaceView } from './CommandWorkspace';
import { EndOperationButton } from './EndOperationButton';
import { OrgChart } from './OrgChart';
import { ICCommandChecklist } from './ICCommandChecklist';
import './command.css';

/**
 * Command tab home (#201) — the Command Deck. Desktop (≥1024px) is one page: a
 * pinned situation rail (the six datums) beside a swappable workspace (Org Chart /
 * Hazard Log), so structure stays in view while the IC works (ADR: one-page Command
 * Deck, Alex 2026-06-20). Below 1024px it collapses to the rail as a stacked column
 * with the org chart / hazard log reached as a Sheet (the spec's phone-floor "opens
 * one tap from SitStat"). Phone stays the floor; the Deck is progressive enhancement.
 *
 * The IC Command Checklist (#203) rides a side-drawer (ADR-019) summoned by the edge
 * tab — phone = modal over a scrim, tablet/desktop = a docked companion BESIDE the
 * board (the .fs-cmd-shell flex row hosts the dock column). IC-gated like the org
 * chart restructure (pre-auth, ADR-021); real auth verifies later.
 */
export function SitStat() {
  const operation = useOperation();
  const positions = useOrg();
  const uid = useDeviceUidValue();
  const isDeck = useMediaQuery('(min-width: 1024px)');
  const [view, setView] = useState<WorkspaceView>('org');
  const [sheet, setSheet] = useState<WorkspaceView | null>(null);
  const [checklistOpen, setChecklistOpen] = useState(false);

  if (!operation) {
    return (
      <div className="fs-cmd">
        <EmptyState
          variant="first-run"
          headline="No active operation"
          reason="Start an operation from the Operations tab to see the command picture."
        />
      </div>
    );
  }

  const ic = currentIC(positions);
  const isIC = uid != null && (!ic || ic.ref !== 'device' || ic.value === uid);

  // The edge tab + drawer, hosted in the flex shell so the desktop dock sits beside.
  const checklist = isIC && (
    <>
      {!checklistOpen && <ChecklistTab onOpen={() => setChecklistOpen(true)} label="IC Command Checklist" />}
      <SideDrawer open={checklistOpen} onClose={() => setChecklistOpen(false)} title="IC Command Checklist">
        <ICCommandChecklist instanceId={operation.id} />
      </SideDrawer>
    </>
  );

  if (isDeck) {
    return (
      <div className="fs-cmd-shell">
        <div className="fs-cmd-deck">
          <div className="fs-cmd-deck-rail">
            <CommandRail onOpenHazards={() => setView('hazard')} />
            <EndOperationButton />
          </div>
          <div className="fs-cmd-deck-ws">
            <CommandWorkspace view={view} onView={setView} />
          </div>
        </div>
        {checklist}
      </div>
    );
  }

  // Phone / small tablet (<1024px): the rail as a stacked column; Org Chart /
  // Hazard Log open as a Sheet (the phone-floor contract).
  return (
    <div className="fs-cmd-shell">
      <div className="fs-cmd">
        <CommandRail />
        <div className="fs-cmd-entries">
          <Button variant="secondary" onPress={() => setSheet('org')}>
            Org Chart
          </Button>
          <Button variant="secondary" onPress={() => setSheet('hazard')}>
            Hazard Log
          </Button>
        </div>
        <EndOperationButton />

        <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'hazard' ? 'Hazard Log' : 'Org Chart'}>
          {sheet === 'hazard' ? (
            <div className="fs-cmd-ws-soon">
              <p>The ICS-208 hazard register builds next.</p>
              <p className="fs-cmd-ws-soon-sub">Open hazards already show in the rail summary.</p>
            </div>
          ) : (
            <OrgChart allowFullScreen />
          )}
        </Sheet>
      </div>
      {checklist}
    </div>
  );
}
