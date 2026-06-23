import { RecommendationCard } from 'fieldshore-v4';
import type { StrutCombination, Deductions } from 'fieldshore-v4';

// RecommendationCard — the result card (card.md §RecommendationCard). Centered
// identity header (system word + model), connectors line, the rigid deduction
// ledger (Raw opening − deductions = Required strut length), Deploy, and the
// QUIET rated-capacity footer. Gated states (unrated / over-capacity) flip the
// #40 danger tell. Realistic LongShore + LockStroke fits.

// A LongShore 812 candidate — gold system, fits a 92"–147" opening.
const ls812 = {
  id: 'ls-812',
  model: 'LS 812',
  system: 'LongShore' as const,
  color: 'gold' as const,
  collapsed: 92,
  extended: 147,
  inventoryId: 'inv-ls812',
  availableQty: 4,
};

// A LockStroke 36-57 candidate — grey-colored, its own cyan "LockStroke" word.
const lk3657 = {
  id: 'lk-36-57',
  model: 'LK 36-57',
  system: 'LockStroke' as const,
  color: 'grey' as const,
  collapsed: 36,
  extended: 57,
  inventoryId: 'inv-lk3657',
  availableQty: 2,
};

const platedDeductions: Deductions = {
  headerWood: '4x4',
  footerWood: 'none',
  topPlate: 'swivel6',
  bottomPlate: 'hinged6',
};

const noDeductions: Deductions = {
  headerWood: 'none',
  footerWood: 'none',
  topPlate: 'none',
  bottomPlate: 'none',
};

// A clean fit — no extensions, deductions applied, healthy rated capacity.
const cleanCombo: StrutCombination = {
  strut: ls812,
  extensions: [],
  extTotal: 0,
  adjCollapsed: 92,
  adjExtended: 147,
  capacity: 18400,
  capacityAll: [18400],
  margin: 12,
  componentCount: 1,
  recommendedQty: 2,
  totalCapacity: 36800,
  deductions: { header: 3.5, topPlate: 1.8, bottomPlate: 3.2 },
  effectiveLength: 102.5,
  openingLength: 111,
};

// A fit that needs an extension — the [+] tile + reach note.
const extCombo: StrutCombination = {
  strut: { ...lk3657, availableQty: 3 },
  extensions: [12],
  extTotal: 12,
  adjCollapsed: 48,
  adjExtended: 69,
  capacity: 9200,
  capacityAll: [9200],
  margin: 8,
  componentCount: 2,
  recommendedQty: 2,
  totalCapacity: 18400,
  deductions: null,
  effectiveLength: 64.5,
  openingLength: 64.5,
};

// An UNRATED-zone fit — gates Deploy behind acknowledgment (#40 danger tell).
const unratedCombo: StrutCombination = {
  strut: { ...ls812, model: 'LS 1016', id: 'ls-1016', collapsed: 114, extended: 198 },
  extensions: [],
  extTotal: 0,
  adjCollapsed: 114,
  adjExtended: 198,
  capacity: 0,
  capacityAll: [0],
  margin: 0,
  componentCount: 1,
  recommendedQty: 4,
  totalCapacity: 0,
  deductions: null,
  effectiveLength: 196,
  openingLength: 196,
  unrated: true,
  unratedReason: 'Opening exceeds the published 16 ft datasheet — capacity is not rated at this length.',
};

export const CleanFit = () => (
  <div style={{ width: 380 }}>
    <RecommendationCard
      combo={cleanCombo}
      deductions={platedDeductions}
      source="Rescue 1"
      location={'Division 2 · West Wall'}
      onDeploy={() => {}}
    />
  </div>
);

export const WithExtension = () => (
  <div style={{ width: 380 }}>
    <RecommendationCard
      combo={extCombo}
      deductions={noDeductions}
      source="Engine 7"
      location={'Division 1 · A-Side'}
      onDeploy={() => {}}
    />
  </div>
);

export const QuickFind = () => (
  <div style={{ width: 380 }}>
    <RecommendationCard combo={cleanCombo} deductions={platedDeductions} />
  </div>
);

export const UnratedGated = () => (
  <div style={{ width: 380 }}>
    <RecommendationCard
      combo={unratedCombo}
      deductions={noDeductions}
      source="Squad 5"
      location={'Division 3 · Roof'}
      onDeploy={() => {}}
    />
  </div>
);
