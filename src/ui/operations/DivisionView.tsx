import type { ShorePoint, ShorePointStatus } from '@core/schema';
import { bomModelLabel } from '@core/shorepoint';
import { MeasurementValue } from '@ui/primitives';
import { cardLocation, cardLabelType } from './cardParts';

/**
 * DivisionView (tri-view) — the incident read by BUILDING LEVEL: floors stacked
 * top → ground → basement, each shore point sitting on the floor it's actually
 * on, with a dashed Grade · Ground line between the ground floor (Div 1) and the
 * first sub-grade level (Sub 1). Sub-grade bands carry a striped background.
 * The novel spatial paradigm from the "3 Views × 2 Devices" prototype — a
 * situational overview. Each point is a tile carrying the SAME card anatomy as
 * the Board card and List row (Alex 2026-07-03 unified anatomy), at the TIGHTEST
 * density: SP-# + apparatus pill on top, the LOCATION as the focus, `label · type`
 * secondary, a quiet `model · length` line. Tap opens the detail drawer. Color
 * comes from the .is-<status> tokens (primitives.css), never raw hex.
 */

/** A representative point for a tile — a single, or a group's front leg + count. */
interface BandTile {
  sp: ShorePoint;
  /** >1 when this tile stands for a grouped shore (rolodex of N legs). */
  count: number;
}

type LaneItem =
  | { kind: 'single'; sp: ShorePoint }
  | { kind: 'group'; groupId: string; members: ShorePoint[] };

export interface DivisionBand {
  division: string;
  /** Signed floor number (Div 1 = ground, −1 = basement), or null for legacy text. */
  n: number | null;
  items: LaneItem[];
}

export interface DivisionViewProps {
  bands: DivisionBand[];
  onOpenDetail: (sp: ShorePoint) => void;
}

// Compact status abbreviations for the tile (the full labels are too long for a
// 96px chip). Keyed by the status id — 'strutset' → STRUT, etc.
const STATUS_ABBR: Record<ShorePointStatus, string> = {
  pending: 'PEND',
  process: 'PROC',
  strutset: 'STRUT',
  cutting: 'CUT',
  runner: 'RUN',
  secured: 'SEC',
  returned: 'RET',
};

function tilesOf(items: LaneItem[]): BandTile[] {
  return items.map((it) =>
    it.kind === 'group'
      ? { sp: it.members[0]!, count: it.members.length }
      : { sp: it.sp, count: 1 },
  );
}

function DivisionTile({ sp, count, onOpen }: BandTile & { onOpen: (sp: ShorePoint) => void }) {
  const model = bomModelLabel(sp);
  return (
    <button
      type="button"
      className={`fs-divtile is-${sp.status}`}
      data-sp-id={sp.id}
      onClick={() => onOpen(sp)}
    >
      <span className="fs-divtile-top">
        <span className="fs-divtile-seq">{sp.seq != null ? `#${sp.seq}` : ''}</span>
        {sp.assignedResource ? <span className="fs-divtile-appar">{sp.assignedResource}</span> : null}
      </span>
      <span className="fs-divtile-loc">
        {cardLocation(sp) || '—'}
        {count > 1 ? <span className="fs-divtile-grp"> ×{count}</span> : null}
      </span>
      <span className="fs-divtile-sub">{cardLabelType(sp)}</span>
      <span className="fs-divtile-val">
        <span className="fs-divtile-ml">
          {model ? <span className="fs-divtile-model">{model} · </span> : null}
          <MeasurementValue eighths={sp.measurementEighths} className="fs-divtile-num" />
        </span>
        {/* Status stays a TEXT abbrev here (not color-only): tiles group by floor,
            so the left-edge hue is the only other status cue (Principle 9). */}
        <span className="fs-divtile-st">{STATUS_ABBR[sp.status]}</span>
      </span>
    </button>
  );
}

/** The gutter label for a band: floor number + short descriptor. */
function bandGutter(band: DivisionBand): { big: string; small: string } {
  if (band.n === null) return { big: '—', small: band.division || 'Unplaced' };
  if (band.n > 0) return { big: String(band.n), small: band.n === 1 ? 'GROUND' : `DIV ${band.n}` };
  return { big: `S${-band.n}`, small: `SUB ${-band.n}` };
}

export function DivisionView({ bands, onOpenDetail }: DivisionViewProps) {
  return (
    <div className="fs-div" role="list" aria-label="Shore points by division">
      {bands.map((band, i) => {
        const gutter = bandGutter(band);
        const isSub = band.n !== null && band.n <= -1;
        // Grade · Ground line: between the ground floor (last n ≥ 1) and the first
        // sub-grade band (first n ≤ −1). Drawn just BEFORE this band when it's the
        // first sub-grade one and a prior band was above grade.
        const prev = bands[i - 1];
        const grade = isSub && prev != null && prev.n !== null && prev.n >= 1;
        return (
          <div key={band.division || `unplaced-${i}`}>
            {grade && (
              <div className="fs-div-grade" aria-hidden="true">
                <span>Grade · Ground</span>
                <span className="fs-div-grade-ln" />
              </div>
            )}
            <div className={`fs-div-lvl${isSub ? ' is-sub' : ''}${band.n === null ? ' is-unplaced' : ''}`} role="listitem">
              <div className="fs-div-gutter">
                <b>{gutter.big}</b>
                <span>{gutter.small}</span>
              </div>
              <div className="fs-div-bay">
                {tilesOf(band.items).map((t) => (
                  <DivisionTile key={t.sp.id} {...t} onOpen={onOpenDetail} />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
