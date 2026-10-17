# #531 — 5+ struts render like ×4 (implementation spec)

Worktree: `/Users/alex/Developer/paratech-struts/fieldshore-531`, branch `fix/531-five-plus-struts` off v4-redesign 20fafb4.

Doctrine (Alex, 2026-10-17): the 4:1 factor makes rated load 1/4 of failure load; struts share load equally;
`recommendedQty = ceil(load / capacity)` with NO ceiling. Nothing caps a shore at 4. A 5+ load renders exactly
like ×4 does today (×N "struts needed for this load" tell, short-deploy ack gate). The LongShore unrated zone
(>192″, capacity 0) path is untouched. The per-strut check (one strut's share vs its rating) stays.

## Per-consumer decisions

| File | Change |
|---|---|
| `src/core/load/engine.ts` | Delete `ExceedsCombo`, `bestExceedsCapacityCombo`, the `recommendedQty > 4` block, the NEW-3 sentinel. Remove `exceedsCapacity` / `exceedsCapacityReason` from `StrutCombination`. Sort: warnings = `unrated` only. strut-only filter: drop the `exceedsCapacity` terms. Comments updated. |
| `src/core/shorepoint/reducer.ts` | `deployVerdict` returns `{ unrated, overCapacity, noFit }` (field gone). `deployedCapacityFlag`: drop both `exceedsCapacity` branches; `'over-capacity'` keeps its per-strut meaning. Fix comments that say "≤4-strut" / "above 4 never reach a real combo". |
| `src/data/store/operationStore.ts` | Drop the `verdict.exceedsCapacity` rejection; the per-strut ack rejection stays. |
| `src/core/shorepoint/pendingReason.ts` + `src/core/schema/shorepoint.ts` | `pendingReasonFor`: any stocked combo → undefined; any catalog combo → `'no-inventory'`; else `'no-match'`. `pendingNeedModels`: drop the exceeds check. Remove `'over-capacity'` from the `PendingReason` enum (live-computed, never persisted). |
| `src/ui/operations/ShorePointCard.tsx` | Drop `'over-capacity'` from `PENDING_REASON_COPY` / `PENDING_REASON_TITLE`. `'no-match'` copy → `Nothing fits this opening` (load never removes a fit now). |
| `src/ui/operations/cardParts.ts`, `AddShorePointModal.tsx`, `AssignEquipmentSheet.tsx` | Delete `OVER_CAPACITY_EMPTY` and the `reason === 'over-capacity'` empty-state branches. AssignEquipmentSheet: drop `!combo.exceedsCapacity` (≈181) and the `.filter((c) => !c.exceedsCapacity)` (≈337). |
| `src/ui/operations/DeployResolution.tsx` | Drop `!m.exceedsCapacity` (≈224). |
| `src/ui/operations/shoreSafety.ts` | Drop the two `exceedsCapacity` branches (≈70-77). |
| `src/ui/operations/RecommendationCard.tsx` | Drop `exceedsCapacity` from riskKey, `needed`, `gated`, `showCapacity`, `deployBlocked`, `overCapacityGate`. ×N tell copy: see Alex-approved copy below. |
| `src/ui/primitives/WarningGate.tsx` | Remove the `'over-capacity'` use + its GATE_COPY entry (no caller left). Header comment: uses = unrated, short of struts, disclaimer. |
| `src/app/routes/gallery.tsx` | Replace `REC_OVER_CAPACITY` with a 5+ example; drop the `<WarningGate use="over-capacity" />` demo. |

## Tests
Update every test that asserted the sentinel/gate. Add: engine 5+ (30″@100,000 → LS 203 ×5 and AT 25-36 ×5; 30″@500,000 →
5 combos, LS 203 ×23 first; same model set as load 0); card 5+ (×23 tell, no shore type named, ack → "Deploy 1 of 23 anyway");
store 5+ deploy without ack rejected, with ack accepted; deployedCapacityFlag 5+ T-Shore → 'over-capacity'.

## Approved copy (Alex, 2026-10-17)
- ×N tell copy is UNCHANGED, word for word — for N with no shore type (4+): "This load needs {N} struts — plan additional shore sets, or consult rescue engineering." Do not edit RecommendationCard's tell JSX copy.
- Short-deploy gate unchanged: the team checkbox still unlocks "Deploy {struts} of {needed} anyway" at any N (Alex: keep it, like ×4).
- `'no-match'` waiting-card copy → `Nothing fits this opening`.

## SME safety fix — model-independent over-capacity (replaces the sentinel's per-point guarantee)
The sentinel was the only load verdict that did not depend on matching the deployed model. Keep that guarantee:

```ts
// reducer.ts — export it (shoreSafety uses it)
/** The highest per-strut rating among the catalog fits — the most any strut that spans this
 *  opening can carry. 0 when none is rated (LongShore unrated zone only). */
export function bestRatedCapacity(combos: StrutCombination[]): number {
  return Math.max(0, ...combos.filter((c) => !c.unrated).map((c) => c.capacity));
}
```
- `deployVerdict`: `const cap = match ? (match.unrated ? 0 : match.capacity) : bestRatedCapacity(combos);`
  `overCapacity = cap > 0 && strutLoadShare(sp) > cap`. (No match = a model this catalog doesn't list: over the strongest fit, no strut here carries the share, whichever was deployed. The store's existing ack rule then applies.)
- `deployedCapacityFlag`: right after the `no-fit` return, compute `share` (deployedCount ?? groupTotal, as today) and
  `if (sp.estimatedLoad != null && best > 0 && share > best) return 'over-capacity';` BEFORE model matching. Keep the matched per-strut check after.
- `shoreSafety`: after the no-fit return, `if (load != null)` and share > bestRatedCapacity(combos) > 0 → `warn` with
  single strut: `Over capacity — estimated load ${shareTxt} exceeds the ${capTxt} rating of the strongest strut that fits this opening.`
  group: `Over capacity — this strut's share of the load (${shareTxt}) exceeds the ${capTxt} rating of the strongest strut that fits this opening.`
  (same shareTxt/capTxt formatting as the existing per-strut message).
- `reducer.test.ts` "flags over-capacity when the load exceeds every ≤4-strut combo — regardless of the deployed model" (≈line 765) is the guard: keep BOTH expectations (`LS 406` and the unlisted `LS 812`) → `'over-capacity'`; only reword the test name (no "≤4-strut").
