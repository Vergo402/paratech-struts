import { useMemo, useState } from 'react';
import { useInventory, useApparatus, useInventoryActions, useOperation, usePermissions, useDepartment } from '@ui/hooks';
import { EmptyState, Button } from '@ui/primitives';
import { STRUTS, BASE_PLATES } from '@core/load';
import type { InventoryItem } from '@core/schema';
import { ApparatusScopeTabs, type ScopeRig } from './ApparatusScopeTabs';
import { EquipmentRow } from './EquipmentRow';
import { AddEquipmentSheet } from './AddEquipmentSheet';
import { AddApparatusModal } from './AddApparatusModal';
import { ImportExport } from './ImportExport';

// The Inventory screen — apparatus-scoped stock, phone-first, composed per craft.md:
// context row (dept · rig count) with the ONE gold primary action, a department-wide
// stat strip, unit-counted scope tabs, and kind-grouped equipment CARDS (struts /
// extensions / base plates) whose rows carry hero-numeral counts + depletion bars.
// Scope tabs are the UNION of the roster and the distinct apparatusIds on stock (so a
// seeded/legacy rig with no roster row still shows, labeled from item.apparatus).
// Stock-setting is direct-Dexie behind the hooks; deploy/return touch available elsewhere.

const collapsedOf = (model?: string) => STRUTS.find((s) => s.model === model)?.collapsed ?? 0;
const plateNameOf = (id?: string) => BASE_PLATES.find((p) => p.id === id)?.name ?? '';
const byCollapsed = (a: InventoryItem, b: InventoryItem) => collapsedOf(a.model) - collapsedOf(b.model);
const byLength = (a: InventoryItem, b: InventoryItem) => (a.length ?? 0) - (b.length ?? 0);
const byPlateName = (a: InventoryItem, b: InventoryItem) => plateNameOf(a.plateId).localeCompare(plateNameOf(b.plateId));

const KIND_GROUPS: {
  key: string;
  label: string;
  countNoun: [singular: string, plural: string];
  pick: (items: InventoryItem[]) => InventoryItem[];
}[] = [
  {
    key: 'struts',
    label: 'Struts',
    countNoun: ['model', 'models'],
    pick: (items) => items.filter((i) => i.type === 'strut').sort(byCollapsed),
  },
  {
    key: 'extensions',
    label: 'Extensions',
    countNoun: ['size', 'sizes'],
    pick: (items) => items.filter((i) => i.type === 'extension').sort(byLength),
  },
  {
    key: 'plates',
    label: 'Base plates',
    countNoun: ['type', 'types'],
    pick: (items) => items.filter((i) => i.type === 'plate').sort(byPlateName),
  },
];

export function InventoryScreen() {
  const items = useInventory();
  const { roster, add: addApparatus, remove: removeApparatus } = useApparatus();
  const actions = useInventoryActions();
  const op = useOperation();
  const { department } = useDepartment();
  // Back-office gates (ADR-017, #380) — manageInventory for stock/apparatus edits, manageData
  // for export. A member without them still SEES stock + deployed counts (read), just can't edit.
  const perms = usePermissions();
  const canManage = perms.manageInventory;

  // Scope-tab counts are PHYSICAL UNITS (Σ quantity), not catalog rows — a bare row
  // count was an unlabeled, misleading figure (mess-map inventory #13).
  const rigs: ScopeRig[] = useMemo(() => {
    const byId = new Map<string, ScopeRig>();
    for (const a of roster) byId.set(a.id, { id: a.id, name: a.name, count: 0 });
    for (const i of items) {
      const r = byId.get(i.apparatusId) ?? { id: i.apparatusId, name: i.apparatus, count: 0 };
      r.count += i.quantity;
      byId.set(i.apparatusId, r);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [roster, items]);

  // Department-wide rollup (stat strip sits above the scope tabs — craft.md §2).
  const stats = useMemo(() => {
    let onHand = 0;
    let deployed = 0;
    for (const i of items) {
      onHand += i.available;
      deployed += i.quantity - i.available;
    }
    return { onHand, deployed, models: items.length };
  }, [items]);

  const [selected, setSelected] = useState<string | null>(null);
  const [addEquipOpen, setAddEquipOpen] = useState(false);
  const [addApparatusOpen, setAddApparatusOpen] = useState(false);

  // The selection self-heals if the chosen rig is removed.
  const activeId = selected && rigs.some((r) => r.id === selected) ? selected : rigs[0]?.id ?? null;
  const activeRig = rigs.find((r) => r.id === activeId) ?? null;
  const rigItems = useMemo(() => items.filter((i) => i.apparatusId === activeId), [items, activeId]);

  const addApparatusModal = (
    <AddApparatusModal
      open={addApparatusOpen}
      onClose={() => setAddApparatusOpen(false)}
      onAdd={async (name, type) => {
        const a = await addApparatus(name, type);
        setSelected(a.id);
      }}
    />
  );

  if (rigs.length === 0) {
    return (
      <div className="fs-inv">
        <EmptyState
          variant="first-run"
          headline="No apparatus yet"
          reason={
            canManage
              ? 'Add an apparatus to start stocking struts, extensions, and plates.'
              : 'No apparatus has been added for this department yet.'
          }
          action={canManage ? { label: 'Add apparatus', onPress: () => setAddApparatusOpen(true) } : undefined}
        />
        {addApparatusModal}
      </div>
    );
  }

  return (
    <div className="fs-inv">
      <header className="fs-inv-header">
        <div className="fs-inv-context">
          <span className="fs-inv-dept">{department?.name ?? 'This device'}</span>
          <span className="fs-inv-sub">{rigs.length} apparatus</span>
        </div>
        <div className="fs-inv-io">
          <ImportExport
            variant="trigger"
            opActive={op != null}
            canManage={canManage}
            canExport={perms.manageData}
            exportCsv={actions.exportCsv}
            templateCsv={actions.templateCsv}
            importRows={actions.importRows}
          />
          {canManage && (
            <Button variant="primary" onPress={() => setAddEquipOpen(true)}>
              Add equipment
            </Button>
          )}
        </div>
      </header>

      <div className="fs-inv-stats">
        <span className="fs-inv-stat">
          <b>{stats.onHand}</b> on hand
        </span>
        <span className="fs-inv-stat">
          <b>{stats.deployed}</b> deployed
        </span>
        <span className="fs-inv-stat">
          <b>{stats.models}</b> models
        </span>
      </div>

      <div className="fs-inv-scope-row">
        <ApparatusScopeTabs rigs={rigs} value={activeId!} onChange={setSelected} />
        {canManage && (
          <button
            type="button"
            className="fs-inv-scope-add"
            aria-label="Add apparatus"
            onClick={() => setAddApparatusOpen(true)}
          >
            +
          </button>
        )}
      </div>

      {rigItems.length === 0 ? (
        <>
          <EmptyState
            variant="first-run"
            headline={`No equipment on ${activeRig?.name ?? 'this rig'}`}
            reason={
              canManage
                ? 'Add the struts, extensions, or plates this apparatus carries.'
                : 'This apparatus has no equipment stocked yet.'
            }
            action={canManage ? { label: 'Add equipment', onPress: () => setAddEquipOpen(true) } : undefined}
          />
          {canManage && (
            <div className="fs-inv-remove">
              <Button
                variant="tertiary"
                destructive
                onPress={() => {
                  void removeApparatus(activeId!);
                  setSelected(null);
                }}
              >
                Remove {activeRig?.name}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="fs-inv-list">
          {KIND_GROUPS.map((g) => {
            const groupItems = g.pick(rigItems);
            if (groupItems.length === 0) return null;
            const noun = groupItems.length === 1 ? g.countNoun[0] : g.countNoun[1];
            return (
              <section key={g.key} className="fs-inv-group">
                <div className="fs-inv-group-head">
                  <h2 className="fs-inv-group-label">{g.label}</h2>
                  <span className="fs-inv-group-count">
                    {groupItems.length} {noun}
                  </span>
                </div>
                <div className="fs-inv-card">
                  {groupItems.map((i) => (
                    <EquipmentRow
                      key={i.id}
                      item={i}
                      onIncrement={actions.increment}
                      onDecrement={actions.decrement}
                      readOnly={!canManage}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AddEquipmentSheet
        open={addEquipOpen}
        onClose={() => setAddEquipOpen(false)}
        apparatusId={activeId!}
        apparatusName={activeRig?.name ?? ''}
        items={rigItems}
        onAdd={(spec) => actions.addOne(spec)}
      />
      {addApparatusModal}
    </div>
  );
}
