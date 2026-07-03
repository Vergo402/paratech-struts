import { useMemo, useState } from 'react';
import type { Deductions, ShorePoint } from '@core/schema';
import { NO_DEDUCTIONS } from '@core/schema';
import { sysKeyOf, type StrutSysKey } from '@core/load';
import { effectiveLengthFrom, findForShorePoint } from '@core/shorepoint';
import { Button, EmptyState, Sheet, TextField, useHasRailNav } from '@ui/primitives';
import { useInventory } from '@ui/hooks';
// Deep import (not the @ui/operations barrel) — Add Shore Point already imports
// from @ui/quickfind, so going through the barrel would close an import cycle.
import { RecommendationCard } from '@ui/operations/RecommendationCard';
import { MeasurementInput } from './MeasurementInput';
import { DeductionPicker } from './DeductionPicker';
import { SystemFilter } from './SystemFilter';

/** v3 MAX_LOAD_LBS — estimated load upper bound (planning input only). */
const MAX_LOAD_LBS = 500_000;

/**
 * QuickFind — the standalone strut calculator and the app's guest cold-open
 * (IA spec 10-quick-find.md). Enter an opening measurement → the Paratech struts
 * that fit, ranked as display-only RecommendationCards **in a dismissible results
 * sheet** (ADR-031): the calculator's output is terminal and non-actionable (no
 * Deploy here — that lives in Operations), so a sheet segregates the lookup from
 * the workspace and guarantees the result rises into view on any viewport. The
 * Gold/Grey/LockStroke filter rides in the sheet so you narrow within the result.
 * Pinned to v3 parity otherwise (runQuickSelect, app.js:420): catalog mode (no
 * inventory / no Deploy), the measurement drives the fit, load is an optional
 * capacity check. The v3 hold-to-start FAB is retired (button.md Principle 4).
 */
export function QuickFind() {
  const rail = useHasRailNav();
  const [measurementEighths, setMeasurementEighths] = useState(0);
  const [deductions, setDeductions] = useState<Deductions>(NO_DEDUCTIONS);
  const [estimatedLoad, setEstimatedLoad] = useState('');
  const [systems, setSystems] = useState<Set<StrutSysKey>>(() => new Set());
  const [dedOpen, setDedOpen] = useState(false);
  const [found, setFound] = useState(false);

  // #409: in-stock plates sort first in the plate pickers. Department-wide here
  // (Quick Find has no assigned rig). Only filters when plate stock is actually
  // tracked — a guest/empty inventory keeps the flat catalog (v3 parity intact).
  const inventory = useInventory();
  const availablePlateIds = useMemo(() => {
    const plates = inventory.filter((i) => i.type === 'plate' && i.plateId);
    if (plates.length === 0) return undefined;
    return new Set(plates.filter((i) => i.available > 0).map((i) => i.plateId!));
  }, [inventory]);

  const effective = effectiveLengthFrom(measurementEighths, deductions);
  const loadTrim = estimatedLoad.trim();
  const loadNum = loadTrim === '' ? 0 : Number(loadTrim);
  const loadValid = loadTrim === '' || (Number.isFinite(loadNum) && loadNum >= 0 && loadNum <= MAX_LOAD_LBS);

  const disabledReason =
    measurementEighths <= 0
      ? 'Enter the opening measurement'
      : effective <= 0
        ? 'Deductions consume the whole opening'
        : !loadValid
          ? 'Load must be between 0 and 500,000 lbs'
          : null;
  const canSearch = disabledReason === null;

  // Minimal draft shore point — only measurement / deductions / load drive the
  // engine, so opId / division / shoreType are required-by-type placeholders the
  // calc never reads. Null when the inputs can't produce a real search.
  const draftSp = useMemo<ShorePoint | null>(() => {
    if (measurementEighths <= 0 || effective <= 0) return null;
    return {
      id: 'draft',
      opId: '',
      division: '1',
      shoreType: 't-shore',
      measurementEighths,
      deductions,
      ...(loadNum > 0 ? { estimatedLoad: loadNum } : {}),
      status: 'pending',
    };
  }, [measurementEighths, effective, deductions, loadNum]);

  // Catalog mode (v3 parity — runQuickSelect passes null inventory): rate against
  // the whole Paratech catalog, not on-scene stock. Computed only while the result
  // sheet is open; closing it (re-search model) resets to nothing.
  const combos = useMemo(() => (found && draftSp ? findForShorePoint(draftSp, null) : []), [found, draftSp]);

  // System filter (v3 getActiveSystemFilter): empty = all systems; otherwise keep
  // only the selected ones. Client-side and live inside the sheet — the engine
  // already returns every fit.
  const filtered = useMemo(
    () => (systems.size === 0 ? combos : combos.filter((c) => systems.has(sysKeyOf(c.strut.system, c.strut.color)))),
    [combos, systems],
  );

  const emptyReason =
    combos.length > 0
      ? 'Nothing in the selected systems fits this opening — clear the filter or pick another system'
      : 'Nothing fits this opening at this load — adjust the deductions or re-measure';

  return (
    <div className="fs-quickfind">
      {/* Desktop carries no top command-header (the rail has the brand), so the
          screen owns its title here; phone gets it from AppHeader. */}
      {rail && (
        <h1 className="fs-qf-title" style={{ font: 'var(--type-headline-1)' }}>
          Quick Find
        </h1>
      )}
      {/* data-tour anchors feed the first-run guided tips (OnboardingHost). Plain
          wrappers — they add no layout, just a stable target the coachmark queries. */}
      <div data-tour="qf-measurement">
        <MeasurementInput value={measurementEighths} onChange={setMeasurementEighths} />
      </div>

      {/* Deductions collapsed by default (IA spec) — the optional refinement; the
          measurement alone drives the fit. */}
      <div className="fs-qf-deductions" data-tour="qf-deductions">
        <Button variant="tertiary" fullWidth onPress={() => setDedOpen((o) => !o)}>
          {dedOpen ? 'Hide deductions' : 'Add deductions (header, footer, plates)'}
        </Button>
        {dedOpen && (
          <DeductionPicker
            measurementEighths={measurementEighths}
            value={deductions}
            onChange={setDeductions}
            availablePlateIds={availablePlateIds}
          />
        )}
      </div>

      <div data-tour="qf-load">
        <TextField
          label="Estimated load (lbs) — optional"
          value={estimatedLoad}
          onChange={setEstimatedLoad}
          inputMode="numeric"
          maxLength={7}
          placeholder="e.g. 15000"
          helper="Leave blank if unknown — load doesn't change which strut fits"
        />
      </div>

      <div data-tour="qf-find">
        <Button
          variant="primary"
          fullWidth
          disabled={!canSearch}
          disabledReason={disabledReason ?? undefined}
          onPress={() => setFound(true)}
        >
          Find Struts
        </Button>
      </div>

      {/* Results = a dismissible sheet (ADR-031). Find Struts raises it; it always
          rises into view, so the result can't land below the fold on a short
          Safari viewport. The filter lives here so you narrow within the result. */}
      <Sheet open={found} onClose={() => setFound(false)} title="Struts that fit">
        <div className="fs-qf-sheet">
          <SystemFilter value={systems} onChange={setSystems} />
          {filtered.length > 0 ? (
            <div className="fs-qf-results">
              {filtered.map((combo) => (
                <RecommendationCard
                  key={`${combo.strut.inventoryId ?? combo.strut.id}|${combo.extensions.join('+')}`}
                  combo={combo}
                  deductions={deductions}
                  estimatedLoad={loadNum > 0 ? loadNum : undefined}
                />
              ))}
            </div>
          ) : (
            <EmptyState variant="filtered" headline="No matching struts" reason={emptyReason} />
          )}
        </div>
      </Sheet>
    </div>
  );
}
