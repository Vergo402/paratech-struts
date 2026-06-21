# Level V Sim — Issue Drafts

## Disposition (closed out 2026-06-21)

All Level V sim findings are now triaged — #252 closed.

| Finding | Outcome |
|---|---|
| Blank estimated load → "· 0 lbs" | **Already fixed — NOT filed.** Re-verified against current source: the card no longer carries the detail line (retired in the 2026-06-20 card compaction) and Quick View already renders "—" for a blank load (`ShorePointDetail.tsx:120,205`). The draft below was written 2026-06-19, just before those landed. |
| Lone IC on a phone has no at-a-glance status total | **WONTFIX-as-written** (Alex, 2026-06-19) — wrong persona + false repro, see the note on that draft below. Not filed. |
| **F-SETUP-1** — stale-schema event crashes the whole Operations board | **Verified real → filed as #362 → fixed in `2a5a9ba`** (validate-and-skip on read via `loadEvents()` + per-card `CardBoundary`; test `loadEvents.test.ts`). Was only in the observation log, never drafted. The sim's guessed cause (the `deployedStrut→deployedBom` rename) was wrong; real vector = unguarded required nested objects (`deductions`, `measurementEighths`). |

The original drafts are kept below as the point-in-time record.

---

## [SIM-V] Blank estimated load renders as '· 0 lbs' on shore-point cards and Quick View  (medium) — RESOLVED, NOT FILED (already fixed; see Disposition)

## Source
Level V sim — Verplanck Residential (car into 2-story wood-frame, single engine company). Surface: Shore point card pre-cut detail line + the read-only Quick View (ShorePointDetail) drawer. Roles affected: Shoring (FF-1) and any crew member reading the board at a glance. Observation-log O-1 (lines 21, 26).

## Finding
A load the operator leaves blank is correctly stored as `undefined` (AddShorePointModal.tsx:196,228 only write `estimatedLoad` when `loadNum > 0`; schema optional at shorepoint.ts:121). But the card coerces it for display — `const estLoad = sp.estimatedLoad ?? 0;` (ShorePointCard.tsx:248) — then unconditionally renders `` · ${estLoad.toLocaleString()} lbs`` (ShorePointCard.tsx:288). So an un-entered load reads '· 0 lbs', which a crew could misread as a measured no-load condition rather than 'not entered'. The same coercion + render repeats in the read-only Quick View drawer (ShorePointDetail.tsx:120,205), so both sites need the fix.

The app already contradicts itself: Quick Find uses the correct framing 'Leave blank if unknown — load doesn't change which strut fits' (QuickFind.tsx:114). And the SAME detail line already conditionally omits the deduction segment when zero (ShorePointCard.tsx:281-287) — the omit-when-absent pattern exists one line above the load segment and simply wasn't applied to it.

Bounded risk: load never loosens a safety gate (the engine only consults `estimatedLoad` when `> 0`, engine.ts:219; which strut fits is load-independent). This is misleading copy, not a math/data error.

## Reproduction (UI steps)
1. Operations → Start Operation → Add Shore Point.
2. Enter a measurement (e.g. 2'6"); leave the Estimated load (lbs) field blank.
3. Save as Pending.
4. Observe the card detail line: it reads 'Raw opening 30″ · 0 lbs'. Expected: '0 lbs' omitted, or shown as '—' / 'Load not entered'.
5. Open Details (Quick View) on the same card — same '0 lbs' appears in the drawer.

## Severity
Low operational impact (cosmetic/semantic copy on safety-adjacent text; no wrong recommendation, no data corruption, no false safety pass). Filed at medium for triage because it is shipped, reachable on the most common path, and inconsistent with the app's own correct framing.

## v4 Coverage
Gap (copy/spec refinement). Fix: render '—' or drop the load segment when `sp.estimatedLoad` is undefined, at both ShorePointCard.tsx:288 and ShorePointDetail.tsx:205 (mirror the existing conditional deduction segment). NOTE: the '· 0 lbs' literal is currently specified in the primitive doc (card.md:123,127), so amend that example in the same change. No existing docket/gate/issue covers this.

---

## [SIM-V] Lone IC on a phone has no at-a-glance status total — status-summary strip hidden below tablet width  (medium)

> **RESOLUTION: WONTFIX-as-written (Alex, 2026-06-19). Do not file as an Operations-board bug.**
> An 8-agent expert panel (NIMS doctrine · USAR multi-Division scale · IC/command ·
> field mobile · IA → synthesis → skeptical pass, 5/5 unanimous) found this finding
> rests on a **wrong persona** AND a **false reproduction**:
> - **Wrong persona:** the Operations tab is the multi-user *Operations Section* work
>   surface (≥1 Division inputter, growing with the incident), NOT a lone IC's glance.
>   The IC works the separate **Command tab** (`/command`); the op-wide status picture
>   is the Command tab's job, not this board's. An op-wide tally on the Operations
>   board only ever serves the Operations Section Chief — who coordinates from a
>   tablet/laptop, which is exactly where the bar already shows.
> - **False repro:** the bar was NOT hidden on phone at the time of this finding — a
>   prior fix had already promoted it to render compact at all widths. Step 3
>   ("strip is absent" on phone) described code state that did not exist. That fix was
>   reverted 2026-06-19 to the signed-off G-15 tablet-only design.
> The Division inputter's per-Division picture is already delivered by the per-lane
> count badges (computed post-filter) + the Division filter. No Operations-board
> change is warranted. The genuine residual (an IC command picture) lives in #323
> (Command tab), not here.

## Source
Level V sim — Verplanck Residential. Surface: Operations board status-summary strip (StatusSummaryBar) on a phone viewport. Role: IC (Capt. Torres), sole interim incident commander of a single engine company. IC AAR top friction; cross-cutting sim finding G-4.

## Finding
The per-status count summary that gives the IC a one-line command picture ('3 points · 1 pending · 1 cutting · 1 secured') is built and works (StatusSummaryBar, OperationsBoard.tsx:128) but is suppressed below tablet width by a 768px media query (operations.css:161-163 vs the gate around line 1274, design call G-15). On an actual phone — the device the lone IC always carries — there is no single-line incident total; the IC must eyeball seven collapsible status-lane headers and tally the incident manually.

This is friction, not a deliberate GAP: the code exists and renders correctly; only a viewport-width gate hides it. It bites precisely the one person who is always on a phone and most needs the total. Tolerable at 3 shore points; would not scale to a larger incident.

Honest caveat: this finding is sourced from the IC AAR's CSS citations and was not independently re-verified line-by-line in the moderator pass — confirm operations.css:161-163 / ~1274 before changing the gate.

## Reproduction (UI steps)
1. Load the app on a phone-width viewport (≤ ~767px) or resize the browser narrow.
2. Start an operation and add 2–3 shore points at different statuses.
3. Observe the Operations board: the per-status count summary strip is absent. On a tablet-width viewport (≥ 768px) the same strip appears.
4. Expected: a compact incident total visible at all widths (or a one-line total in the Operations header next to the op name).

## Severity
Medium — bounded to the lone-IC-on-phone case. No data or safety consequence; it forces manual tallying for the one role that most needs the glance view, and the smallest device is exactly where it's hidden.

## v4 Coverage
Gap (CSS/affordance). Fix options: show the summary (compact) at all widths by dropping/inverting the 768px gate, or surface a one-line incident total in the Operations header. Related to the broader Command-picture block (#323) but distinct — this is an existing, working component being hidden, not an unbuilt capability. Consider folding into #323's lone-IC command-picture scope rather than a standalone fix.