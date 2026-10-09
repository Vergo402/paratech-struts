> **APPROVED 2026-10-09** at the re-run mockup checkpoint (recovered 2026-10-09 from the
> 2026-08-22 planning session after the harness plan folder purged the original).
> Alex's question — *"how is it possible to select an unknown connector?"* — answered: it cannot
> be selected; the picker only offers this build's catalog. An unknown id arrives only (1) via a
> peer `ShorePointEdited`/`ShorePointAdded` from a device on a newer catalog, or (2) when a later
> release removes/renames a plate id under a saved point. The reducer keeps the point (rejecting
> would wedge sync), so the fix is a tell, not a gate.
> Rulings re-confirmed 2026-10-09: #484 amber tell on every length surface, **no deploy gate**;
> deployed-side gap folded in; #485 raw opening until every leg is cutting; build all four fixes.
> Code basis `0364d04`; line refs below are approximate against `182aecf` — re-locate by symbol.

# Pre-TTX safety mini-batch — #484 · #485 · #486 · #481

## Context

Phase J, Stage-1 of the approved sequence: four safety-adjacent audit residuals fixed before the #262 TTX so the exercise doesn't trip on known false readings. Branch `v4-redesign`. Alex's rulings (this session): #484 amber tell (no deploy gate); **include the newly-found deployed-side gap** (unknown connector shows nothing on Board/List/Division — #457 only reached the Quick View drawer); #485 value rule = **raw opening until cutting** everywhere the compact value shows (tri-views AND board card shelf — also fixes the pre-existing "opening"-label-but-effective-number mislabel). Mockups shown + confirmed in chat (amber ledger row + marked total + caution line; "56″ opening" tile/shelf).

Board hygiene at execution start: set #484/#485/#486/#481 to In Progress on Project 2 (commands in CLAUDE.md).

---

## Fix A — #484 unknown connector on pending surfaces + deployed-side gap

**Core:**
- `src/core/shorepoint/reducer.ts` — `deployedCapacityFlag` (:188-204): add an unknown-connector outcome when `unknownPlateIds(sp.deductions).length > 0` (new flag kind, label "⚠ Unknown connector"), so `CapacityFlag` renders it on all three deployed surfaces (Board card via `OperationsBoard.tsx:1132`, List row, Division tile — same threading as the existing unrated/over-capacity flags; `PastOperationView.tsx:48` comes free). Reuse `unknownPlateIds` (reducer.ts:46-48) + `isKnownPlateId` (`src/core/load/plates.ts:99`).
- Fix the stale header comment in `src/ui/operations/shoreSafety.ts:12-14` (claims board surfaces read it; only the drawer does).

**Pending UI (per accepted mockup):**
- `src/ui/operations/RecommendationCard.tsx` — `plateRow` (:84-95): distinguish unknown id (`id !== 'none' && !isKnownPlateId(id)`) from not-selected → new slot state: amber "⚠ Unknown connector" / "−?″" (new `is-unknown` class beside `is-ns`, `LedgerSlot` :97-113). "Required strut length" total (:369-372) gets the amber marker; one amber caution line under the ledger reusing the `fs-rec-caution` idiom (:241-246): "A connector on this shore isn't in this app's catalog — its height is missing from this length. Update the app or re-check the connectors." No deploy gate. `riskKey` (:137-152) already includes plate ids → ack-reset (#456) free.
- `src/ui/operations/ShorePointDetail.tsx` — mirror ledger `plateRow`/`LedgerSlot` (:31-58) gets the same unknown state (deliberate copy of the card's, same `.fs-rec-*` CSS).
- CSS: amber row/marker styles next to the existing `.fs-rec-ns` rules.

**Tests:** `capacityFlagSurfaces.test.tsx` — add unknown-plate three-surface parity case (mirror the stale-catalog-strut case :242-260). `RecommendationCard.test.tsx` — unknown-plate ledger case (careful: :104-105 uses single-match `getByText('Not recorded')`; the unknown state must NOT reuse that copy). `reducer.test.ts` — first direct `unknownPlateIds` unit test + `deployedCapacityFlag` unknown case. `ShorePointDetail` mirror case.

## Fix B — #485 split-group value + raw-until-cutting rule

- `src/ui/operations/cardParts.ts` — `cardValueEighths` (:102-106) takes the phase source explicitly: `cardValueEighths(sp, phaseStatus: ShorePointStatus)` → `isCutPhase({status: phaseStatus}) ? cutLengthInches(sp)*8 : sp.measurementEighths` (**raw**, no deduction — drops `effectiveLengthFrom` here entirely).
- Callers: `ShorePointCard.tsx:288` passes `sp.status`; `ShorePointListRow.tsx:64` and `DivisionView.tsx:94` pass the `groupDisplayStatus` value they already compute (:44 / :60 — plumbing exists, no new props).
- Labels: `ShorePointCard.tsx:324-330` `valueLabel` simplifies to two states: `'opening'` pre-cut, `'cut'` at cutting+ (the `'effective'` stage goes away). Tri-view rows/tiles print the matching suffix ("opening"/"cut") per mockup.
- Too-small chip (`CutTooSmallFlag`) unchanged — any-leg firing stays per the #483 ruling.
- **Out of scope:** `RecommendationCard`/Details ledgers keep required-strut-length — that's their job. Board grouped stack renders per-leg cards — already correct.

**Tests:** amend `ShorePointCard.test.tsx:190-215` (value = raw now) + `:236` (cut at cutting); `triViewGroupStatus.test.tsx` — add value assertions for the split-group fixtures (currently pins status/chip only); new direct unit tests for `cardValueEighths` + `groupDisplayStatus` (first ever — no cardParts test file exists).

## Fix C — #486 per-member extension re-resolution (validated by Plan agent)

- `src/core/load/engine.ts` — extract the compat predicate (~:275-284) into exported `extensionRowCompatible(row, length, system)` (exact length + same system OR LockStroke↔AcmeThread interchange). Byte-equivalent behavior; no cycle (core/load imports nothing from core/shorepoint); barrel re-exports.
- `src/core/shorepoint/bom.ts` — rewrite the extension loop in `assembleBom` (:94-107) to mirror `pushPlate` (:157-179): (a) engine's `extensionSources` row only if `available - claimed > 0` in the passed inventory; (b) else any `extensionRowCompatible` row with unclaimed availability, preferring the strut's rig; (c) else `UNTRACKED_SOURCE` (never dropped). `claim()` both consulted AND recorded (fixes the never-consulted wart; 2× same length takes 2 units). `inventoryId` only set when a row is actually found (fixes latent untracked-with-id inconsistency). No signature changes; deploy gates untouched (modal `baselineOffBook` :460, sheet `bomSourceStatus` :287-292).
- Behavior deltas to note in the commit: catalog-mode combos now auto-source extensions like plates; in the sheet, a cross-rig extension fallback → `cross-truck` → member stays Pending (gate untouched, correct).

**Tests:** `bom.test.ts` — keep :64-78 green; add exhausted-row→other-rig fallback, double-claim same-length (model = plate cases :25-46) with and without a second row, prefer-strut's-rig, LockStroke↔AcmeThread fallback, catalog-mode auto-source. `AddShorePointModal.test.tsx` #452 block (:656+) — real-engine strut+extension fixture, one ext per rig → both members deploy, distinct ext inventoryIds. `AssignEquipmentSheet.test.tsx` (beside :385-407) — strut+ext per rig → member 2 falls back to own rig's ext, 2 deploys, 0 pending.

## Fix D — #481 per-element salvage (validated by Plan agent)

- `src/data/sync/stateSync.ts` — two combinators beside `wrapBlob`: `salvageArray(element, label)` = `z.array(z.unknown()).catch([]).transform(...)` safeParsing each element, dropping failures; `salvageRecord(...)` over `Object.entries`. Dev-only `console.warn` on drops gated `import.meta.env.MODE === 'development'` (vitest = 'test' → no noise). No import cycle (verified).
- One-liner swaps: `apparatusStore.ts:52`, `customTitlesStore.ts:39`, `apparatusTypesStore.ts:40` → `salvageArray`; `checklistTemplateStore.ts:48` → `salvageRecord`; `deptPoliciesStore.ts:36` → per-field `.catch(undefined)` inside, keep outer `.catch({})` (raw non-object blobs reach `resolve()`).
- `applyRemote`/stamp semantics untouched — the five no-echo tests + `stateListener.test.ts` LWW pins stay green; existing `'[{"id":"x"}]'` fixtures still yield `[]` (sole element bad).

**Tests:** mixed good/bad array via `applyRemote` (stamp preserved) for apparatus/titles/types + boot variant; checklist record one-good-one-bad key; deptPolicies bad-field-degrades-alone.

---

## Delegation (standing rule)

| Piece | Model | Effort | Why |
|---|---|---|---|
| Fix D (#481 salvage + tests) | sonnet | medium | Zod transform subtleties + fixture work; no UI |
| Fix B (#485 value rule + tests) | sonnet | medium | Small wiring, but touches pinned tests across 4 files |
| Fix A (#484 + deployed flag) | sonnet | medium | Established idioms (CapacityFlag threading, ledger slots) |
| Fix C (#486 bom resolver) | opus | high | Deploy-path inventory correctness — safety-adjacent, claim-ledger interplay |
| Architecture, diff review of every agent, mockup-fidelity verification, commits | main loop (Fable) | — | not delegated |

Fixes are independent — D and B can run in parallel; A and C after (or all four in parallel via worktrees; shared-index memory says isolate or pathspec-commit).

## Verification

1. `npm test` + `npm run typecheck` + `npm run lint` — all green (1185/1185; the pre-existing `nativeControls.test.tsx` failure is out of scope, don't touch).
2. Main-loop diff review of each delegated piece before accepting.
3. Drive the dev server (`run-fieldshore` skill / preview MCP): (a) pending point with a hand-injected unknown plate id → amber ledger row + marked total on the recommendation card + Details; (b) deployed point same → "⚠ Unknown connector" on Board card, List row, Division tile; (c) split group straddling strutset/cutting → tile prints "N″ opening" with STRUT SET, flips to cut when all legs advance; (d) board card pending shows raw opening. Screenshot vs the accepted mockups — my own check, not an agent's.
4. #486/#481 are logic-level — the new tests are the proof; spot-check a 2-rig group deploy with extensions in the UI if fixtures allow.
5. Commit per fix (4 commits, pathspec-scoped), push on commit (standing rule). Close #484 #485 #486 #481 manually (`gh issue close` — v4 rule), board flips to Done automatically.

