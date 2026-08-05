# Phase J #261 — Adversarial Audit

**Scope:** (1) the battalion-chief field review artifact, (2) the four fixes in `9018aa8`, (3) scale honesty.
**Baseline:** `v4-redesign` @ `9018aa8`. The 7 blessed deviations in `doctrine-walk.md` are excluded and not re-flagged.
**Method:** line-read of every changed file, token-mirror walk of `src/app/tokens.css`, and re-read of the shipped screenshot set against the specs the review cites.

Counts: **5 BROKEN · 9 INCOMPLETE · 4 QUESTION.**

---

## BROKEN — shipped defects

### B1. The hazard chip's own text is unreadable in sunlight, and loses its severity color in every theme

`src/ui/command/command.css:506-510`

```css
.fs-ichip-v {
  font: var(--type-body-medium);
  font-weight: 600;
  color: var(--text-primary);
}
```

The severity color is set on the **button** (`.fs-ichip--hazard.is-high { color: var(--danger-text) }`, `command.css:521-536`), but the visible text `{count} {SEVERITY}` lives in `<span class="fs-ichip-v">` (`IncidentChips.tsx:85-87`), which re-declares `color` and wins. The button's color only reaches `AlertIcon` (`currentColor`).

Consequence per mirror:

| theme | `.is-high` bg | text (`--text-primary`) | contrast |
|---|---|---|---|
| dark (`tokens.css:171`) | `#2A1416` | light | fine — the only theme that was screenshotted |
| light (`tokens.css:132`) | `#FEF2F2` | dark | passes, but the severity is no longer red — color coding silently lost |
| sunlight (`tokens.css:212`) | `#B91C1C` | `#000000` | **≈3.2:1 — fails AA, and blows sunlight's own 7:1 contract** |
| sunlight `.is-low` (`tokens.css:211`) | `#44403C` | `#000000` | **≈2.0:1** |

Same defect on `.fs-ichip-meta` (`--text-tertiary` = `#000000` in sunlight, `tokens.css:203`) — the Command chip's hazard location, black on dark red.

The code comment asserting safety is wrong on its own terms:

```css
/* No sunlight override needed — like the entry-row chip above, this pairs
   -text + -bg (not standalone ink), which already resolves correctly there. */
```

`.fs-cmd-entry-chip` (`command.css:453-455`) sets `color` on the element that **holds** the text. `.fs-ichip` does not. The precedent the author needed is 160 lines up in the same file — `command.css:339-347` is a block of `[data-theme='sunlight']` overrides written for exactly this failure mode.

This is a **new WCAG regression landed after gate #258 closed**, and it is only invisible because the entire #261 capture set is dark-theme.

### B2. #488 pushed the spec-required Total column off the phone screen

`.claude/audits/phase-j/261-shots/phone-command-division.png` — the seventh header renders as a clipped `Re` with half a dot; the **Total column is not on screen at all**, and neither is the Total value for Div 1 or for the "All divisions" row.

`docs/v4-design/08-information-architecture/30-command-sitstat.md:77` requires the seven abbreviated headers **"plus a Total column"** and the All-divisions totals row. #488 shipped the first half and, by widening seven columns from an 8px dot to a text label, evicted the second.

The only affordance is `command.css:1806`:

```css
.fs-rollup-scroll { overflow-x: auto; }
```

No fade, no edge shadow, no scrollbar, no `scroll-snap`. Nothing in the rendered sheet tells an IC there is more table to the right. The review's own praise of this instrument — *"one row per division, a Total column, a lagging-division flag — is the right instrument for span-of-control at Surfside scale"* (line 65) — now describes a column that is unreachable without discovering a hidden gesture. This is a regression **introduced by the fix**, and it does not get better with more divisions: the overflow is horizontal and constant at 390px.

### B3. The "persistent" Safety Officer chip is not persistent — it scrolls away

`OperationsBoard.tsx:1325` renders `<IncidentChipStrip />` inside `<header className="fs-ops-header">`. `src/ui/operations/operations.css:28-32` is a plain flex column, and **`position: sticky` does not appear anywhere in `src/ui/operations/*.css` or `src/app/*.css`** (verified by grep).

C-6 (`30-command-sitstat.md:96`) is *"**Persistent** Safety Officer + OP header on this and every IC-facing screen."* What shipped survives the tab switch and dies on the first scroll — scroll to the Cutting lane on the Operations board and the SO name is gone, which is the same fireground failure Concern 1 describes (*"if someone asks who's my Safety Officer... I have to tab away"*), just with a scroll instead of a tab.

This is the gate's headline condition, half-met. And the verification screenshot (`phone-ops-board.png`) is unscrolled, so the capture set can never have caught it.

### B4. 32px tap targets on a fireground screen

`command.css:486` — `.fs-ichip { min-height: 32px; }`

`docs/v4-design/07-design-system/craft.md:81`: *"Control hit areas stay ≥ 56px (the floor is untouchable)."* The #435 tap-target sweep raised fireground controls to 56px and exempted only back-office surfaces (settings editor, ImportFlow) at 44px. The Operations board and Cutting Station header are fireground by any reading.

Two adjacent 32px pressable pills, gloved thumb, wet screen. The 8pt dead zone is satisfied (`gap: var(--space-2)`), the target itself is 43% under floor. No `padding`/`::before` hit-area expansion is applied.

### B5. Chip text has no overflow handling — long locations and long names break the layout

`command.css:491` sets `white-space: nowrap` on `.fs-ichip`, and neither `.fs-ichip-v` nor `.fs-ichip-meta` declares `min-width: 0`, `overflow: hidden`, or `text-overflow: ellipsis`. Compare `.fs-cmd-entry-meta` (`command.css:456-465`), which does all three.

- **Long hazard location.** `HazardChip showLocation` on Command already renders full-width (see I3). A location like `"north wall lean — C/D corner, 2nd floor exterior"` (free text, `schema/hazard.ts:23`, `z.string().min(1)`, no max) cannot wrap and cannot ellipsize; it overflows the chip.
- **Long Safety Officer name.** `.fs-ichip-strip` has `flex-wrap: wrap`, so the Safety chip drops to its own line — but the chip itself still can't shrink. `"SAFETY  Battalion Chief Katherine Whitaker-Ramirez"` at `--type-body-medium` blows past 375px.

Zero-hazard and short-name fixtures hide both. The tests (`IncidentChips.test.tsx`) use `"Div 2"` and `"FF Alvarez"`.

---

## INCOMPLETE — gaps in the fix or in the review

### I1. "3 HIGH" is not honest — the count is all open hazards, the word is only the top one

`IncidentChips.tsx:84-86`:

```tsx
<span className="fs-ichip-v">
  {openHazards.length} {severityWord(top.severity)}
</span>
```

`openHazards.length` counts every open hazard of any severity; `top.severity` is the single worst. **1 high + 2 low renders "3 HIGH."** On a fireground that reads as three life-threats when there is one.

The review asked for exactly the honest form — Concern 2, line 109: *"N open hazards (highest severity)"*. What shipped collapses the two datums into an unqualified pair.

It shipped because no test covers a mixed-severity set: `IncidentChips.test.tsx` `HIGH` is a single high hazard; `LOW_AND_MITIGATED` yields `"1 LOW"`. Add a `{2 low, 1 high}` case and word it so the count and the severity are visibly separate (`3 open · HIGH`).

Note this is inherited from `CommandRail.tsx:383`, which has the same construction — so the new chip faithfully propagated an existing dishonesty to a second surface instead of fixing it.

### I2. The hazard chip's accessible name has no noun

`IncidentChips.tsx:75-90` — `AlertIcon` is `aria-hidden` (`icons.tsx`), there is no `aria-label` on the button, and the only text node is `"3 HIGH"`. A screen reader announces **"3 HIGH, button."** Not "hazards", not "open", not "opens Command".

`CommandRail`'s equivalent entry row includes the word "Hazards" in its name (`CommandRail.tsx:377`). The Safety chip is acceptable ("Safety Unassigned"), though it also gives no hint that pressing it navigates.

Gate #258 (WCAG) closed before these controls existed.

### I3. Command's hazard chip renders as a full-width banner, not the "quiet pill" the code claims

`.fs-ichip { display: inline-flex }` — but on Command the chip is a **direct child of the rail's flex column** (`CommandRail.tsx:175`), so it stretches to full width. `phone-command.png` shows a full-bleed red bar; `phone-ops-board.png` shows a compact pill from the same class, because `.fs-ichip-strip` constrains it there.

One class, two visibly different treatments, and the file comment (`command.css:473-475`, "Quiet pill idiom... reads as the same chrome family everywhere it lands") describes only one of them.

Compounding: that banner sits directly above the Hazards entry row, which prints the identical string. `phone-command.png` shows `1 HIGH · Div 1 — north wall lean` **twice within 250px of vertical space**. Concern 2 asked for a *persistent header* chip; what landed is a second copy inside the same scrolling rail.

### I4. By-Division header labels are centered over right-aligned numbers

`command.css:1822-1830` sets `text-align: right` on `.fs-rollup-colhead`; `command.css:1840-1845` gives the new inner wrapper `align-items: center`. Visible in `phone-command-division.png` — `Pend` / `Assign` / `Set` float left of the digits they head. At one division it's cosmetic; at 8+ divisions the eye is tracking a column of numerals against a mis-registered label.

### I5. The new legend `<p>` has no margin control

`command.css:1956-1963` declares only `font` and `color`. There is no global `p { margin: 0 }` — `src/app/styles.css:76` resets `body` only — so the legend inherits the UA's `1em` top/bottom. Off the 4px spacing grid (`docs/v4-design/07-design-system/spacing-grid.md`), and unspecified, so it will drift with the font size.

### I6. "Apparatus on scene" is actually the whole department apparatus roster

`TransferCommand.tsx:43`:

```tsx
const { roster: apparatusRoster } = useApparatus(); // same source as the org chart's "Available rigs"
```

`useApparatus().roster` (`src/ui/hooks/useApparatus.ts:18`) is the department-wide Dexie apparatus store. There is no on-scene, assigned, or checked-in filter — `apparatusCandidates` (`TransferCommand.tsx:96-103`) only drops the current IC.

The comment is accurate about the source and that source is the problem: `RosterStrip.tsx:19` labels the identical data **"Available rigs"**, which is at least not a claim about geography. The transfer picker upgrades it to **"Apparatus on scene."**

In the 3-rig fixture the two are indistinguishable. In a real department the picker leads — per Alex's rigs-first ruling — with every rig the department owns, labeled as being on this incident, above the people who actually are. Either filter to rigs with an org-chart position (`positionForResource` is already called per rig on line 101) plus recent activity, or rename the group to something true.

### I7. Review coverage — what got zero scrutiny

The review draws a whole-app verdict ("APPROVE WITH CONDITIONS", gate for the #262 TTX) from 16 dark-theme screenshots of Command / Operations / transfer / checklist / offline. Untouched:

- **Themes.** Light, sunlight, and broadcast got **zero** captures. This is not an abstract gap — it is the direct cause of B1 shipping undetected, and sunlight is the theme a chief actually uses on a sunny collapse.
- **Whole tabs.** Inventory, Quick Find, Settings — none reviewed. Inventory is IC-facing at a resource-constrained incident.
- **Lifecycle ends.** End-of-operation, `PastOperationView.tsx`, `PastOperationsList.tsx` — the archived read-only surface a shift-transferring IC reads is entirely unexamined, and (see Q4) carries no SO chip.
- **Auth and joining.** `routes/auth.tsx`, `join-department.tsx`, `create-department.tsx`, mutual-aid guest/QR — the first 60 seconds of a mutual-aid company arriving on scene.
- **Audit Log** (both the incident-event and administrative-governance views).
- **Empty and error states.** No-active-operation board, empty org chart, zero shore points, roster-fetch failure, a rejected write. Every screenshot is a happy path on a populated scene.
- **Firebase up.** The fixture was network-blocked throughout. The offline banner was reviewed; the *online* states — sync banner clearing, a write in flight, a conflicting remote update — never appeared.

### I8. The fixture is smaller than the states the review passed judgment on

3 rigs · 4 shore points · 1 division · 1 hazard · 1 staffed position · single device · op clock under 20 seconds.

§5 honestly flags span-of-control badges and elapsed-time formatting as unobservable. But the same objection applies to things the review **approved**: the By-Division table was passed as "the right instrument for span-of-control at Surfside scale" on a **one-row** rendering (and B2 shows what the second dimension actually does to it); the transfer picker was assessed at 3 candidates; the status board is six zeros and two small numbers; the org chart has one assignment.

A gate that clears a Surfside-scale instrument from its empty state is clearing the empty state.

### I9. The `useSafetyOfficerLabel` "agree by construction" claim is nearly but not exactly true, and untested

The artifact (line 251) claims the chips "reuse the exact CommandRail selectors... factored into `useSafetyOfficerLabel`". Verified: both use `positions[defaultPositionId(op.id, 'safety')]` + `leaderOf` (`IncidentChips.tsx:22-28` vs `CommandRail.tsx:119,121`). I could not find a divergence in the null-operation, deleted-position, or multi-leader cases — CommandRail early-returns at `!operation` (line 116), and both take `assignedResources[0]` (`core/org/resource.ts:6-8`).

One residual drift: an assigned resource with an **empty-string label**. The chip's `(… )?.label ?? null` doesn't catch `''`, then `label ? '' : ' is-unassigned'` renders unassigned *styling with no text*; CommandRail keys its class on `safety && leaderOf(safety)` and renders `''` as an assigned name. Narrow — but it is precisely the class of drift the "by construction" claim exists to eliminate, and no test pins the two against each other.

Separately, both surfaces show only `assignedResources[0]`. A Safety position with two assigned resources silently hides the second. Consistent, and consistently incomplete as an answer to "who is watching my back."

**Render perf — checked, not a finding.** `IncidentChipStrip` subscribes to `useOperation`/`useOrg`/`useHazards` and *not* to shore points, so hundreds of shore points do not drive it; `useOpenHazards` is memoized (`IncidentChips.tsx:32-35`); `positionForResource` in the transfer picker is O(rigs × positions) inside a `useMemo`, negligible at 20 rigs. The only nit: `IncidentChipStrip` is not `memo`'d and takes no props, so every `OperationsBoard` render re-runs three store selectors. Cheap; noted, not raised.

**Transfer picker — checked, not a finding.** No dead code left by the reorder; the empty-state ternary correctly requires all three groups empty (`TransferCommand.tsx:169-173`) and the group blocks are independent; the new tests use `getByRole('list', { name })` and are order-agnostic; no existing test pins the old order (grepped `TransferCommand`/`CommandRail` suites).

---

## QUESTION — needs Alex

### Q1. #488 reverses a decision Alex may have made himself

The comment #488 deleted read: *"Status color dots (#434) — the 150-char abbreviation legend is gone; the dot carries the column identity."* That removal is **not** among the 7 blessed deviations in `doctrine-walk.md`, so it was an unrecorded divergence — fair to catch. But the adjudication (artifact line 241) resolved it "in the spec's favor" without establishing whether #434's removal was Alex's own visual-elevation call.

The legend is now back as **three wrapped lines at the bottom of a phone sheet** (`phone-command-division.png`), which is what "150-char legend wall" was describing. Ask before the TTX: does he want it back, and if so, does it belong under the table or behind an info affordance?

### Q2. The spec was amended by ruling but not edited

Concern 2 was adjudicated "CONFIRMED as spec-compliant", then overridden by ruling. `9018aa8` changes no file under `docs/` except the audit artifact — `30-command-sitstat.md` §Information hierarchy still describes hazards as deliberately below the fold. The spec now contradicts the build in the opposite direction from before the gate. Who edits it, and does this need a docket / parity-matrix row so the next reviewer doesn't re-flag it?

### Q3. Concern 5 is closed and open at the same time

Row 5 of the appendix rules "**MOSTLY REFUTED** … No fix" and simultaneously keeps it as TTX watch item 5. The refutation answers *whether* a leg can reach Cutting Station with connectors unset (yes, by ADR-010) — not the BC's actual question, which was what Quick View should **say** to a shift-transferring IC in that state. Which is it: closed, or a live TTX item with an acceptance criterion?

### Q4. Does C-6 cover the surfaces the fix skipped?

"Persistent Safety Officer + OP header on this and **every IC-facing screen**." The fix covers Command, Operations, and Cutting Station. Not covered: `PastOperationView` (the archived read-only op a shift-transferring IC reads), the Hazard Log full-screen/sheet, Inventory. Either those aren't IC-facing — say so and narrow C-6 — or #487 is a third done.

---

*Anchors: `src/ui/command/IncidentChips.tsx`, `src/ui/command/command.css:472-537,1806,1822-1850,1956-1963`, `src/ui/command/CommandRail.tsx:119-121,175,383`, `src/ui/command/SitStatRollup.tsx:10-22,120-135`, `src/ui/command/TransferCommand.tsx:43,96-103,169-215`, `src/ui/operations/OperationsBoard.tsx:1325`, `src/ui/operations/operations.css:28-32`, `src/app/tokens.css:110-260`, `src/app/styles.css:76`, `src/core/schema/hazard.ts:23`, `src/core/org/resource.ts:6-8`, `docs/v4-design/08-information-architecture/30-command-sitstat.md:77,96`, `docs/v4-design/07-design-system/craft.md:81`, `.claude/audits/phase-j/261-shots/phone-command.png`, `phone-command-division.png`, `phone-ops-board.png`, `phone-transfer-1.png`.*
