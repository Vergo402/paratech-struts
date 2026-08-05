# #261 Independent Review — Findings Master List

**One central location for every finding from the 2026-08-05 independent review** (Alex-requested:
"independent chief + purchasing officer... find all broken and incomplete items"), both rounds.
Every row was re-verified by Fable against code, the live app, or the spec before inclusion.
Source detail: [`261-adversarial-audit.md`](261-adversarial-audit.md) (skeptical engineering audit) ·
[`261-purchasing-review.md`](261-purchasing-review.md) (purchasing-officer review, verdict **BUY WITH
CONDITIONS**) · [`261-independent-review-adjudication.md`](261-independent-review-adjudication.md)
(adjudication + round 2) · evidence in [`261-shots/`](261-shots/).

**Totals: 7 BROKEN · 12 INCOMPLETE · 5 QUESTIONS.** Nothing fixed yet; the Disposition column is
blank pending Alex's rulings. Gate #261 remains closed.

---

## BROKEN — confirmed shipped defects (7)

| # | Finding | Evidence | Found by | Disposition |
|---|---------|----------|----------|-------------|
| R1 | Hazard chip's value text overrides the severity color in every theme (`.fs-ichip-v` → `--text-primary` beats the button-level red): severity color lost everywhere; **sunlight = black on `#B91C1C` ≈3.1:1, WCAG AA fail** (low-severity ≈2:1); chip's location text (`.fs-ichip-meta`) fails the same way. New regression after gate #258 closed. | `probe-chip-color.mjs` output; `command.css:507-537` | Skeptical audit (B1); Fable probe confirmed — Fable's first sweep probed the wrong element | — |
| R2 | **"3 HIGH" when reality is 1 high + 2 low** — count of ALL open hazards paired with the WORST severity word, on **three surfaces**: both new chips + the pre-existing Command Hazards entry row (`CommandRail.tsx:383`) they were copied from. Reads as three life-threats when there is one. | `stress-command-hazardchip.png`; live innerText probe | Fable Track 1; skeptical audit (I1) | — |
| R3 | #488's widened By-Division headers pushed the **spec-required Total column off the 390px screen** behind a horizontal scroll with **zero affordance** (no fade/shadow/scrollbar). Spec: `30-command-sitstat.md:77`. | `phone-command-division.png`; overflow measured 421px vs 356px | Skeptical audit (B2); Fable measured | — |
| R4 | New chips are **32px tap targets** against the design system's ≥56px fireground floor (`craft.md:81`, "the floor is untouchable"); Operations/Cutting header is fireground. | `command.css:486` | Skeptical audit (B4) | — |
| R5 | **No text overflow handling on chips** (`white-space: nowrap`, no ellipsis/min-width): a real-length hazard location runs off the viewport mid-word; a long Safety Officer name can't shrink. | `stress-command-hazardchip.png` (clipped mid-word); `command.css:491` | Skeptical audit (B5); Fable Track 1 | — |
| R6 | Transfer picker's **"Apparatus on scene" is the entire department roster** — no on-scene/assigned/checked-in filter; 18 idle seeded rigs all listed "on scene," each "Available." The label asserts geography the data doesn't have, at the top of the rigs-first list. | `stress-transfer-top.png`; `TransferCommand.tsx:43,96-103` | Skeptical audit (I6, elevated); Fable Track 1 | — |
| R7 | **what3words is dead in the production config** — the configured key answers **HTTP 402** (no paid plan) on `convert-to-3wa`; every shore point's words stay "pending" forever (silent infinite backfill retry); users only ever get the coords chip. Known since 2026-07-11 (session memory); [#441](https://github.com/Vergo402/paratech-struts/issues/441) sits CLOSED as done; no open issue tracks the dead key. | `probe-w3w.mjs` → `FAIL: HTTP 402`; `src/data/w3w/w3w.ts` | Alex (round-2 prompt); Fable probe confirmed | — |

## INCOMPLETE — gaps in fix, review, or record (12)

| # | Finding | Evidence | Found by | Disposition |
|---|---------|----------|----------|-------------|
| N1 | The "persistent" Safety Officer chip is in a **non-sticky header** — survives the tab switch, scrolls away on the first scroll. C-6's word is "persistent." | `OperationsBoard.tsx:1325`; no `position: sticky` anywhere in operations/app CSS (grep-verified) | Skeptical audit (B3) | — |
| N2 | Hazard chip's screen-reader name is just **"3 HIGH, button"** — no noun ("hazards"), no open/navigate hint. | `IncidentChips.tsx:75-90`; `AlertIcon` aria-hidden | Skeptical audit (I2) | — |
| N3 | On Command the hazard chip renders as a **full-width banner** (not the "quiet pill" the CSS comment claims) and **duplicates the identical hazard string** shown ~250px below in the Hazards entry row. | `phone-command.png`; `CommandRail.tsx:175` | Skeptical audit (I3) | — |
| N4 | By-Division **header labels centered over right-aligned numerals** — mis-registration grows with division count. | `phone-command-division.png`; `command.css:1822-1845` | Skeptical audit (I4) | — |
| N5 | New legend `<p>` carries **UA default margins** (no reset, no spec) — off the 4px spacing grid. | `command.css:1956-1963`; `styles.css` resets body only | Skeptical audit (I5) | — |
| N6 | `useSafetyOfficerLabel` **empty-string-label drift** vs CommandRail's derivation (unassigned styling with no text vs assigned-empty); both surfaces show only `assignedResources[0]` — a second Safety resource is silently hidden; no test pins the two together. | `IncidentChips.tsx:22-28` vs `CommandRail.tsx:119-121`; `core/org/resource.ts:6-8` | Skeptical audit (I9) | — |
| N7 | **BC review blind spots**: zero captures of light/sunlight/broadcast themes (direct cause of R1 escaping); Inventory/Quick Find/Settings never opened; end-of-op + past-op archive, auth/join flows, Audit Log, empty/error states, Firebase-online states all unexamined; "Surfside-scale instruments" passed from a 3-rig/4-point/1-division fixture (By-Division judged at one row, transfer at 3 candidates). | Audit I7/I8; purchasing §1 | Both reviewers | — |
| N8 | **Record integrity — the paper over-claims**: (a) ADR-022 commits mutual aid to **v4.0** — zero code (grep-verified: no join/guest/QR-incident implementation); (b) audit-log spec commits ICS-201/208/PAR assembled export as "v4.0, not deferred" — only raw CSV built (`AuditLogScreen.tsx:135-137`); (c) ADR-018 after-action email "on by default" — toggle exists (`deptPoliciesStore.ts`), **no send mechanism anywhere**. Session records show later deliberate deferrals of (b)/(c) — but the ADRs/specs were never amended, so the record over-claims either way. | Purchasing §2; Fable verified all three | Purchasing review | — |
| N9 | Audit log (Administrative view) shows an **eternal "Loading…"** when the cloud is unreachable — no offline/error state; an offline admin gets a spinner, never an answer. | `sweep-auditlog.png` (network-blocked context) | Fable round-2 sweep | — |
| N10 | Google Places autocomplete key is **referrer-locked to the beta domain** (localhost: "Requests from referer... are blocked") — correct security posture, but it means the address field is untestable in every local harness and **has not been re-verified on beta by anyone since 2026-07-11**. | `probe-places2.mjs` | Fable round-2 sweep | — |
| N11 | **Broadcast wall-board (C-13) doesn't exist in the product** — `30-command-sitstat.md` commits a read-only broadcast projection (own layout-matrix column; spec [#213](https://github.com/Vergo402/paratech-struts/issues/213) closed as done); the only "broadcast" in `src/` is a theme option in the dev-gated gallery. Fourth member of the N8 over-claim family. | grep: no broadcast surface in `src/ui` / `src/app/routes` | Fable round-2 sweep (audit I7 hinted) | — |
| N12 | **Never live-verified by any review** (exist, unit-tested, no end-to-end proof): the feedback form (lives under Help & Reference) and the inventory CSV export/import round trip. | `sweep-driver.mjs` results | Fable round-2 sweep | — |

## QUESTIONS — need Alex's ruling (5)

| # | Question | Source | Disposition |
|---|----------|--------|-------------|
| Q1 | #488 re-reversed the #434 legend removal (an Alex-gated visual call). Keep the restored 3-line legend under the table, tuck it behind an info affordance, or re-remove? | Audit Q1 | — |
| Q2 | The hazard-chip ruling amended the spec by fiat — `30-command-sitstat.md` still says hazards live below the fold. Who edits the spec + parity row so the next reviewer doesn't re-flag it? | Audit Q2 | — |
| Q3 | Concern 5 ("N/S" connectors at Cutting Station) is simultaneously "refuted" and a TTX watch item. Both reviewers say the read-surface question — what Quick View should SAY to a cold shift-change reader — deserves acceptance criteria, not a refutation. Closed, or live with criteria? | Audit Q3; purchasing §3 | — |
| Q4 | C-6 says "every IC-facing screen" — PastOperationView (the archive a shift-transferring IC reads), Hazard Log full-screen, and Inventory have no SO chip. Narrow C-6, or extend #487? | Audit Q4 | — |
| Q5 | The four over-claims (mutual aid v4.0 · ICS-forms export · after-action email · broadcast C-13): build each as promised, or formally re-scope and amend the ADR/spec so the record tells the truth? W3W joins this family: buy a w3w plan, or officially degrade to coords-only and say so. | Purchasing conditions; round 2 | — |

---

## Swept and clean (checked with proof, not assumption)

- All 4 themes resolve the new chip/rollup CSS (no dropped declarations) — the *contrast* failure is R1, a token-pairing defect, not a resolution failure.
- Chip strip correctly absent with no active op and after end-op; present on the Cutting tab.
- Transfer reorder left no dead code; empty-state logic correct; tests order-agnostic; render perf of the new hooks checked and fine.
- `useSafetyOfficerLabel` agrees with CommandRail in null-op / deleted-position / multi-leader cases (residual: N6).
- Inventory screen + counts, Quick Find calc, all 7 Settings pages, User Manager screen, Help page, auth / join-department / create-department screens — all render correctly (`sweep-*.png`; the sweep's first "near-empty" flags were probe artifacts reading the wrong container).
- Zero filtered console errors across the whole sweep.

## Reviewer scorecard

- **BC review**: 5 findings, all confirmed as raised; missed all 7 BROKEN above (4 live in the fixes it triggered; R2 predates the gate; R7 was in session memory).
- **Fable's gate verification**: caught mockup fidelity; missed R1 (probed the button, not the span) and R7 (never probed externals) — both logged (observations 18, 19).
- **Skeptical audit**: 18 claims → 18 confirmed, 0 refuted.
- **Purchasing review**: verdict BUY WITH CONDITIONS (single-department use today); 3 not-built claims → 3 verified; Concern-5 pushback endorsed into Q3.
- **Alex**: caught R7 — the finding that exposed the coverage-denominator process gap now logged as observation 19.
