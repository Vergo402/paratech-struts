import { useState, type ReactNode } from 'react';
import { BASE_PLATES, findStrutCombinations } from '@core/load';
import { NO_DEDUCTIONS, STATUS_IDS, type Deductions, type InventoryItem, type ShorePointStatus } from '@core/schema';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  MeasurementValue,
  Modal,
  Sheet,
  Slider,
  TextField,
  Toggle,
  WarningGate,
} from '@ui/primitives';
import {
  BottomSheetPicker,
  FullScreenList,
  InlineSegmented,
  PowerSelect,
  VisualGridPicker,
} from '@ui/picker';
import { DeductionPicker, MeasurementInput } from '@ui/quickfind';
import { GroupedShorePoint, RecommendationCard, ShorePointCard, StartOperationModal } from '@ui/operations';
import type { ShorePoint } from '@core/schema';
import { useTheme } from '../theme';

// ---- RecommendationCard demos (S6 — #221) — driven by the REAL engine so the
// gallery never drifts from the math. Computed once at module load.
const REC_DEDUCTIONS: Deductions = {
  headerWood: '4x4',
  topPlate: 'channel4x4',
  bottomPlate: 'channel4x4',
  footerWood: 'none',
};
const REC_INVENTORY: InventoryItem[] = [
  {
    id: 'demo-inv-ls304',
    type: 'strut',
    model: 'LS 304',
    system: 'LongShore',
    apparatus: 'Rescue 2',
    apparatusId: 'demo-app-r2',
    quantity: 4,
    available: 4,
  },
];
// 56″ opening − (3.5 header + 3.4 + 3.4 plates) = 45.7 → floors to 45⅝″; LS 304 fits.
const REC_STANDARD = findStrutCombinations(56, 0, 2, REC_INVENTORY, null, {
  header: 3.5,
  topPlate: 3.4,
  bottomPlate: 3.4,
})[0];
// 200″ is past LongShore's 192″ chart — physically reachable, unrated (#247 state 5).
const REC_UNRATED = findStrutCombinations(200, 0, 2, null, null, null)[0];
// 180″ at 4:1 caps at 4,500 lb — a 60,000 lb load needs >4 struts: the NEW-3 sentinel (#40).
const REC_OVER_CAPACITY = findStrutCombinations(180, 60000, 2, null, null, null)[0];
// Gold + extension — 130″ opening, the first combo that needs an extension (LS
// 610 + 24″ in the catalog), so the extension block renders alongside the footer.
const REC_GOLD_EXT = findStrutCombinations(130, 5000, 2, null, ['LongShore'], null).find(
  (c) => c.extensions.length > 0,
);
// LockStroke — forced via the system filter (every lk-* is physically grey but
// earns its own cyan word + .fs-rec--lockstroke stroke, S12 §3.1/§4). 80″ on the
// LK 55-89 = a clean rating, capacity footer visible.
const REC_LOCKSTROKE = findStrutCombinations(80, 4000, 2, null, ['LockStroke'], null)[0];

// ---- ShorePointCard / GroupedShorePoint fixtures (S12 §1–2) — props-only, no
// engine: the cards are presentational, so the gallery hand-builds the SPs.
const DEPLOYED = { model: 'LS 304', source: 'Engine 7', inventoryId: 'demo-inv' };
function spFixture(over: Partial<ShorePoint> = {}): ShorePoint {
  return {
    id: `gx-${Math.random().toString(36).slice(2, 8)}`,
    opId: 'demo',
    division: '2',
    area: 'C side',
    shoreType: 't-shore',
    measurementEighths: 524, // 65 1/2″
    deductions: NO_DEDUCTIONS,
    status: 'pending',
    ...over,
  };
}
// One physical multi-strut shore = N points sharing a groupId (KB-7). Mixed
// statuses so the tabs/dots show different status hues.
const DOUBLE_T_MEMBERS: ShorePoint[] = [
  spFixture({ id: 'dt-1', label: 'B-3', shoreType: 'double-t', groupId: 'gdt', groupIndex: 1, groupTotal: 2, status: 'cutting', deductions: { headerWood: '6x6', footerWood: 'none', topPlate: 'none', bottomPlate: 'none' }, deployedStrut: DEPLOYED }),
  spFixture({ id: 'dt-2', label: 'B-3', shoreType: 'double-t', groupId: 'gdt', groupIndex: 2, groupTotal: 2, status: 'strutset', deployedStrut: DEPLOYED }),
];
const THREE_POST_MEMBERS: ShorePoint[] = [
  spFixture({ id: 'tp-1', label: 'C-2', shoreType: '3-post', groupId: 'g3p', groupIndex: 1, groupTotal: 3, status: 'secured', deployedStrut: DEPLOYED }),
  spFixture({ id: 'tp-2', label: 'C-2', shoreType: '3-post', groupId: 'g3p', groupIndex: 2, groupTotal: 3, status: 'runner', deployedStrut: DEPLOYED }),
  spFixture({ id: 'tp-3', label: 'C-2', shoreType: '3-post', groupId: 'g3p', groupIndex: 3, groupTotal: 3, status: 'process', deployedStrut: DEPLOYED }),
];
const THREE_POST_OPEN: ShorePoint[] = [
  spFixture({ id: 'op-1', label: 'D-4', shoreType: '3-post', groupId: 'g3o', groupIndex: 1, groupTotal: 3, status: 'process', deployedStrut: DEPLOYED }),
  spFixture({ id: 'op-2', label: 'D-4', shoreType: '3-post', groupId: 'g3o', groupIndex: 2, groupTotal: 3, status: 'cutting', deductions: { headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' }, deployedStrut: DEPLOYED }),
  spFixture({ id: 'op-3', label: 'D-4', shoreType: '3-post', groupId: 'g3o', groupIndex: 3, groupTotal: 3, status: 'cutting', deductions: { headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' }, deployedStrut: DEPLOYED }),
];

/**
 * /gallery — DEV SURFACE, not a product screen. Every S3 primitive, picker,
 * and quickfind input rendered live so the preview tools (and the #248 gate)
 * can drive them and flip all four themes against real components. Reached by
 * URL only — no nav tab. Ships in the production bundle on purpose: the gate
 * drives `npm run preview`, and the v4 slice deploys nowhere.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 style={{ font: 'var(--type-headline-2)' }}>{title}</h2>
      {children}
    </section>
  );
}

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'sunlight', label: 'Sunlight' },
  { value: 'broadcast', label: 'Broadcast' },
] as const;

const WOODS = [
  { value: 'none', label: 'None' },
  { value: '4x4', label: '4×4' },
  { value: '6x6', label: '6×6' },
] as const;

const LEVELS = [
  { value: 'i', label: 'Level I', sub: 'Federal task-force scale' },
  { value: 'ii', label: 'Level II', sub: 'Regional response' },
  { value: 'iii', label: 'Level III', sub: 'Extended attack' },
  { value: 'iv', label: 'Level IV', sub: 'Working incident' },
  { value: 'v', label: 'Level V', sub: 'Single company' },
] as const;

const APPARATUS = [
  'Rescue 2',
  'Engine 1',
  'Squad 3',
  'Ladder 7',
  'Engine 14',
  'Rescue 41',
  'Squad 18',
  'Tower 2',
  'Engine 9',
].map((label, i) => ({ value: `a${i}`, label, sub: i % 3 === 0 ? 'On scene' : 'Staged' }));

const PLATE_OPTIONS = BASE_PLATES.map((p) => ({
  id: p.id,
  name: p.name,
  sub: p.height > 0 ? `deducts ${p.height}″` : 'no deduction',
}));

function StatusCycleDemo() {
  const [i, setI] = useState(1);
  const status = STATUS_IDS[i % STATUS_IDS.length] as ShorePointStatus;
  return (
    <div className="flex items-center gap-3">
      <Badge variant="status" status={status} />
      <Button size="standard" onPress={() => setI((n) => n + 1)}>
        Commit next status
      </Button>
    </div>
  );
}

function GateDemo() {
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <Card>
      <div className="flex flex-col gap-3">
        <span style={{ font: 'var(--type-body-medium)' }}>
          LS 1016 + 67″ ext — <MeasurementValue eighths={200 * 8} />
        </span>
        <WarningGate
          use="unrated"
          acknowledged={acknowledged}
          onAcknowledge={() => setAcknowledged((a) => !a)}
        />
        <Button
          variant="primary"
          disabled={!acknowledged}
          disabledReason={acknowledged ? undefined : 'Acknowledge the unrated zone first'}
          onPress={() => {}}
        >
          Deploy
        </Button>
        <WarningGate use="disclaimer" />
      </div>
    </Card>
  );
}

function AsyncButtonDemo() {
  return (
    <Button
      variant="primary"
      onPress={() => new Promise<void>((r) => setTimeout(r, 1500))}
    >
      Deploy (1.5s in-flight)
    </Button>
  );
}

export function GalleryScreen() {
  const { preference, setPreference } = useTheme();
  const [wood, setWood] = useState<'none' | '4x4' | '6x6'>('4x4');
  const [level, setLevel] = useState<(typeof LEVELS)[number]['value']>('iv');
  const [apparatus, setApparatus] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [plate, setPlate] = useState('none');
  const [stockOnly, setStockOnly] = useState(false);
  const [toggleOn, setToggleOn] = useState(false);
  const [text, setText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [eighths, setEighths] = useState(56 * 8);
  const [deductions, setDeductions] = useState<Deductions>(NO_DEDUCTIONS);
  const [commits, setCommits] = useState(0);
  const [startOpOpen, setStartOpOpen] = useState(false);

  const galleryTheme = THEME_OPTIONS.some((o) => o.value === preference) ? preference : 'dark';

  return (
    <div className="flex flex-col gap-8 pb-8">
      <header>
        <h1 style={{ font: 'var(--type-headline-1)' }}>Component gallery</h1>
        <p className="text-ink-secondary" style={{ font: 'var(--type-caption)' }}>
          Dev surface, not a product screen — every S3 primitive live, for preview verification
          and the #248 gate. Broadcast renders no controls in the product; here it themes them
          anyway so the palette can be checked.
        </p>
      </header>

      <Section title="Theme">
        <InlineSegmented
          label="Theme (gallery adds Broadcast)"
          options={THEME_OPTIONS}
          value={galleryTheme}
          onChange={setPreference}
        />
      </Section>

      <Section title="Badge — all 7 status words + variants">
        <div className="flex flex-wrap gap-2">
          {STATUS_IDS.map((s) => (
            <Badge key={s} variant="status" status={s} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="count" value={12} srLabel="12 shore points" />
          <Badge variant="label">External · Dept 14</Badge>
          <Badge variant="severity">2 hazards</Badge>
          <Badge variant="dot" tone="accent" text="Sync queued" />
        </div>
        <StatusCycleDemo />
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onPress={() => {}}>
            Primary
          </Button>
          <Button variant="secondary" onPress={() => {}}>
            Secondary
          </Button>
          <Button variant="tertiary" onPress={() => {}}>
            Tertiary
          </Button>
          <Button variant="primary" destructive onPress={() => {}}>
            End Operation
          </Button>
        </div>
        <AsyncButtonDemo />
        <Button onPress={() => {}} disabled disabledReason="No strut assigned yet">
          Advance
        </Button>
      </Section>

      <Section title="Card">
        <Card>Base card — flat at rest, hairline + top highlight</Card>
        <Card selected>Selected card — accent border, never scale</Card>
        <Card
          onPress={() => {}}
          edge={
            <span
              className="is-cutting"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: 'var(--sp-text)',
                borderRadius: '12px 0 0 12px',
              }}
            />
          }
        >
          Pressable card with the edge slot (the S5 status stripe lives here)
        </Card>
      </Section>

      <Section title="Empty state — 4 variants">
        <EmptyState
          variant="first-run"
          headline="No shore points yet"
          reason="Tap Add Shore Point to add the first"
          action={{ label: 'Add Shore Point', onPress: () => {} }}
        />
        <EmptyState
          variant="filtered"
          headline="No points in Division 3"
          reason="The division filter is hiding 12 points"
          action={{ label: 'Clear filter', onPress: () => {} }}
        />
        <EmptyState
          variant="upstream-blocked"
          headline="No operation running"
          reason="Start an operation from the Operations tab first"
        />
        <EmptyState
          variant="all-clear"
          headline="All equipment returned"
          reason="Every deployed strut is back on its apparatus"
        />
      </Section>

      <Section title="Warning gate — ack unlocks Deploy, disclosure stays">
        <GateDemo />
        <Card>
          <div className="flex flex-col gap-3">
            <span style={{ font: 'var(--type-body-medium)' }}>
              AT 25-36 ×5 — load exceeds the 4-strut capacity
            </span>
            <WarningGate use="over-capacity" />
            <Button variant="primary" disabled disabledReason="Choose a different strut, quantity, or opening" onPress={() => {}}>
              Deploy
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="Toggle · Segmented · Text field">
        <Toggle
          label="Sync over cellular"
          helper="Uses mobile data when off Wi-Fi"
          checked={toggleOn}
          onChange={setToggleOn}
        />
        <InlineSegmented label="Header wood" options={WOODS} value={wood} onChange={setWood} />
        <TextField
          label="Operation name"
          value={text}
          onChange={setText}
          placeholder="e.g. Surfside"
          error={text.length > 0 && text.length < 3 ? 'Name needs at least 3 characters' : undefined}
        />
      </Section>

      <Section title="Slide to commit — advance + step-back (gesture only, ADR-026)">
        <span style={{ font: 'var(--type-caption)' }} className="text-ink-secondary">
          Commits: {commits}
        </span>
        <Slider
          label="Slide to set Strut Set"
          revealColor="var(--status-strutset-bg)"
          onCommit={() => setCommits((c) => c + 1)}
        />
        <Slider
          label="Slide back to In Process"
          direction="stepback"
          onCommit={() => setCommits((c) => c + 1)}
        />
      </Section>

      <Section title="Modal · Sheet">
        <div className="flex flex-wrap gap-2">
          <Button onPress={() => setModalOpen(true)}>Destructive modal</Button>
          <Button onPress={() => setFormModalOpen(true)}>Form modal</Button>
          <Button onPress={() => setSheetOpen(true)}>Sheet</Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="End Operation?"
          variant="destructive"
          footer={
            <>
              <span data-modal-cancel>
                <Button onPress={() => setModalOpen(false)}>Cancel</Button>
              </span>
              <Button variant="primary" destructive onPress={() => setModalOpen(false)}>
                End Operation
              </Button>
            </>
          }
        >
          Ends the operation and archives every shore point. Equipment still deployed stays
          deployed.
        </Modal>
        <Modal
          open={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title="Edit operation"
          variant="form"
          footer={
            <Button variant="primary" onPress={() => setFormModalOpen(false)}>
              Save
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <TextField label="Name" value={text} onChange={setText} />
            <TextField label="Location" value="" onChange={() => {}} placeholder="Optional" />
          </div>
        </Modal>
        <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Assign role">
          {['Rescue Supervisor', 'Shoring Supervisor', 'Safety Officer'].map((r) => (
            <button key={r} type="button" className="fs-picker-row" onClick={() => setSheetOpen(false)}>
              {r}
            </button>
          ))}
        </Sheet>
      </Section>

      <Section title="Pickers — sheet (5–7) · full-screen (8+, search) · native">
        <BottomSheetPicker label="Incident level" options={LEVELS} value={level} onSelect={setLevel} />
        <div className="fs-picker-field">
          <span className="fs-field-label">Assign apparatus (full-screen list)</span>
          <Button onPress={() => setListOpen(true)}>
            {APPARATUS.find((a) => a.value === apparatus)?.label ?? 'Choose apparatus'}
          </Button>
        </div>
        <FullScreenList
          open={listOpen}
          onClose={() => setListOpen(false)}
          title="Assign apparatus"
          options={APPARATUS}
          value={apparatus}
          onSelect={setApparatus}
        />
        <PowerSelect label="Incident level (native fallback)" options={LEVELS} value={level} onChange={setLevel} />
      </Section>

      <Section title="Visual grid — the v3 plate picker, verbatim (L-9)">
        <Toggle
          label="Filter by operation inventory"
          helper="Out-of-stock plates sink below the divider and lock"
          checked={stockOnly}
          onChange={setStockOnly}
        />
        <VisualGridPicker
          label="Top plate"
          options={PLATE_OPTIONS}
          value={plate}
          onSelect={setPlate}
          availableIds={stockOnly ? new Set(['rigid6', 'swivel6', 'threadedconn']) : undefined}
        />
      </Section>

      <Section title="Measurement + deduction ledger (#20/#38 — strip + steppers)">
        <MeasurementInput value={eighths} onChange={setEighths} />
        <DeductionPicker
          measurementEighths={eighths}
          value={deductions}
          onChange={setDeductions}
        />
      </Section>

      <Section title="Start Operation modal (S4 — #219)">
        <Button onPress={() => setStartOpOpen(true)}>Open Start Operation modal</Button>
        <StartOperationModal
          open={startOpOpen}
          onClose={() => setStartOpOpen(false)}
        />
      </Section>

      {/* AddShorePointModal + DivisionPicker read live store state (they need
          an active operation) — they're driven on /operations in the preview,
          not demoed here. The card is props-only, so it demos directly. */}
      <Section title="Shore point card (S5 — #220)">
        <ShorePointCard
          shorePoint={{
            id: 'demo-1',
            opId: 'demo',
            division: '1',
            area: 'NW corner',
            shoreType: '3-post', // a group of 3 = one physical 3-Post shore (KB-7)
            groupId: 'demo-g',
            groupIndex: 2,
            groupTotal: 3,
            measurementEighths: 388,
            deductions: NO_DEDUCTIONS,
            status: 'pending',
            pendingReason: 'no-match',
          }}
        />
        <ShorePointCard
          shorePoint={{
            id: 'demo-2',
            opId: 'demo',
            division: '2',
            shoreType: 'double-t',
            label: 'B-2',
            measurementEighths: 547,
            deductions: NO_DEDUCTIONS,
            status: 'process',
            deployedStrut: { model: 'LS 203', source: 'Rescue 2', inventoryId: 'demo-inv' },
          }}
        />
        <ShorePointCard
          shorePoint={{
            id: 'demo-3',
            opId: 'demo',
            division: '-1',
            area: 'Stairwell B',
            shoreType: '3-post',
            measurementEighths: 766,
            deductions: NO_DEDUCTIONS,
            status: 'secured',
            deployedStrut: { model: 'AT 37-58', source: 'Squad 3', inventoryId: 'demo-inv-2' },
          }}
        />
      </Section>

      <Section title="Recommendation card (S6 — #221): standard · unrated ack · over-capacity #40">
        {REC_STANDARD && (
          <RecommendationCard
            combo={REC_STANDARD}
            deductions={REC_DEDUCTIONS}
            source="Rescue 2"
            onDeploy={() => setCommits((c) => c + 1)}
          />
        )}
        {REC_UNRATED && (
          <RecommendationCard
            combo={REC_UNRATED}
            deductions={NO_DEDUCTIONS}
            source="Engine 1"
            onDeploy={() => setCommits((c) => c + 1)}
          />
        )}
        {REC_OVER_CAPACITY && (
          <RecommendationCard combo={REC_OVER_CAPACITY} deductions={NO_DEDUCTIONS} onDeploy={() => {}} />
        )}
      </Section>

      {/* ---- S12 — Card treatments (#316): the restyled cards across every
          lifecycle state, the rolodex stack, and the LockStroke rec. ---- */}
      <Section title="S12 — Card treatments (#316): ShorePointCard lifecycle">
        {/* Pending — plain (no reason), then both waiting-callout reasons. */}
        {/* Number tab (#318): ghost on pending (A-*), fills with the deployed
            strut's system — gold (LS), grey (AT), LockStroke-cyan (LK). */}
        <ShorePointCard shorePoint={spFixture({ seq: 1, label: 'A-1', area: 'A side' })} />
        <ShorePointCard shorePoint={spFixture({ seq: 2, label: 'A-2', pendingReason: 'no-inventory' })} />
        <ShorePointCard shorePoint={spFixture({ seq: 3, label: 'A-3', pendingReason: 'no-match' })} />
        {/* In Process — the advance + step-back slide stack. */}
        <ShorePointCard
          shorePoint={spFixture({ seq: 4, label: 'B-1', status: 'process', deployedStrut: DEPLOYED })}
          onAdvance={() => setCommits((c) => c + 1)}
          onStepBack={() => setCommits((c) => c + 1)}
        />
        {/* Strut Set — step-back slide only (advance is workflow #222). */}
        <ShorePointCard
          shorePoint={spFixture({ seq: 5, label: 'B-2', status: 'strutset', deployedStrut: DEPLOYED })}
          onStepBack={() => setCommits((c) => c + 1)}
        />
        {/* Cutting — the promoted (28px) value shelf reading the cut length. */}
        <ShorePointCard
          shorePoint={spFixture({
            seq: 6,
            label: 'B-3',
            status: 'cutting',
            deductions: { headerWood: '6x6', footerWood: '6x6', topPlate: 'none', bottomPlate: 'none' },
            deployedStrut: DEPLOYED,
          })}
        />
        {/* Runner · Secured · Returned. */}
        <ShorePointCard shorePoint={spFixture({ seq: 7, label: 'B-4', status: 'runner', deployedStrut: DEPLOYED })} />
        <ShorePointCard shorePoint={spFixture({ seq: 8, label: 'B-5', status: 'secured', deployedStrut: DEPLOYED })} />
        <ShorePointCard shorePoint={spFixture({ seq: 9, label: 'B-6', status: 'returned', deployedStrut: DEPLOYED })} />
        {/* Hazard pill + removed slash (presentational props, #222 surfaces). */}
        <ShorePointCard
          shorePoint={spFixture({ seq: 10, label: 'C-1', status: 'process', deployedStrut: DEPLOYED })}
          hazard
          onAdvance={() => {}}
          onStepBack={() => {}}
        />
        <ShorePointCard
          shorePoint={spFixture({ seq: 11, label: 'C-2', status: 'cutting', deployedStrut: DEPLOYED })}
          removed
        />
        {/* Grey-system tab (AcmeThread) — apparatus caption line under location. */}
        <ShorePointCard
          shorePoint={spFixture({ seq: 12, label: 'C-3', area: 'Stairwell B', status: 'secured', deployedStrut: { model: 'AT 37-58', source: 'Squad 3', inventoryId: 'demo-inv-2' } })}
        />
        {/* LockStroke-cyan tab + a 3-digit number (Surfside scale). */}
        <ShorePointCard
          shorePoint={spFixture({ seq: 147, label: 'C-4', area: 'Stairwell B', status: 'process', deployedStrut: { model: 'LK 36-57', source: 'Rescue 41', inventoryId: 'demo-inv-3' } })}
        />
        {/* Design-audit additions: active (accent focus border) + the caption
            explainer line (design-system ShorePointCard props). The waiting
            presentation itself rides A-2/A-3 above — amber badge/stripe/shelf. */}
        <ShorePointCard
          shorePoint={spFixture({ label: 'C-4', status: 'process', deployedStrut: DEPLOYED })}
          active
          caption="Slide commits; reverse is always available — no timed undo."
          onAdvance={() => {}}
          onStepBack={() => {}}
        />
      </Section>

      <Section title="S12 — GroupedShorePoint: Double-T · 3-Post · expanded">
        {/* Collapsed rolodex — tap tabs to rotate, tap the card body (or the
            chevron) to expand. Mixed member statuses tint the tabs + dots. */}
        <GroupedShorePoint
          members={DOUBLE_T_MEMBERS}
          onAdvance={() => setCommits((c) => c + 1)}
          onStepBack={() => setCommits((c) => c + 1)}
        />
        <GroupedShorePoint
          members={THREE_POST_MEMBERS}
          onAdvance={() => setCommits((c) => c + 1)}
          onStepBack={() => setCommits((c) => c + 1)}
        />
        {/* Opens expanded — the staggered member list, each a full card. */}
        <GroupedShorePoint
          members={THREE_POST_OPEN}
          defaultExpanded
          onAdvance={() => setCommits((c) => c + 1)}
          onStepBack={() => setCommits((c) => c + 1)}
        />
      </Section>

      <Section title="S12 — RecommendationCard: gold · gold+ext · LockStroke · gated">
        {REC_STANDARD && (
          <RecommendationCard combo={REC_STANDARD} deductions={REC_DEDUCTIONS} source="Rescue 2" onDeploy={() => setCommits((c) => c + 1)} />
        )}
        {REC_GOLD_EXT && (
          <RecommendationCard combo={REC_GOLD_EXT} deductions={NO_DEDUCTIONS} source="Engine 14" onDeploy={() => setCommits((c) => c + 1)} />
        )}
        {REC_LOCKSTROKE && (
          <RecommendationCard combo={REC_LOCKSTROKE} deductions={NO_DEDUCTIONS} source="Squad 3" onDeploy={() => setCommits((c) => c + 1)} />
        )}
        {REC_UNRATED && (
          <RecommendationCard combo={REC_UNRATED} deductions={NO_DEDUCTIONS} source="Engine 1" onDeploy={() => setCommits((c) => c + 1)} />
        )}
        {REC_OVER_CAPACITY && (
          <RecommendationCard combo={REC_OVER_CAPACITY} deductions={NO_DEDUCTIONS} onDeploy={() => {}} />
        )}
      </Section>
    </div>
  );
}
