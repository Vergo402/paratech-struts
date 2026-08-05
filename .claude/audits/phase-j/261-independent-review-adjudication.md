# #261 Independent Review — Adjudication (2026-08-05)

Alex requested an independent chief + purchasing-officer review of the #261 gate work (the BC
review, its findings, and the four fixes in `9018aa8`). Three tracks ran: Fable's hands-on
edge-state hunt (`stress-driver.mjs` + `probe-chip-color.mjs`), the skeptical engineering audit
(`261-adversarial-audit.md`), and the independent purchasing review (`261-purchasing-review.md`,
verdict **BUY WITH CONDITIONS**). Every claim below was re-verified by Fable against code, the
live app, or the spec before inclusion. **Zero agent claims were refuted this round.** One of
Fable's own #261-session verification results was overturned: the theme sweep had probed the chip
*button*, not its value *span* — the independent audit caught the miss (B1).

## BROKEN — confirmed shipped defects

| # | Defect | Evidence | Source |
|---|---|---|---|
| R1 | Hazard chip's value text is `--text-primary` in every theme (`command.css` `.fs-ichip-v` beats the button-level severity color): severity color lost everywhere; **sunlight = black on #B91C1C ≈3.1:1, AA fail** (low-severity ≈2:1); `.fs-ichip-meta` location same failure. New WCAG regression after gate #258 closed. | `probe-chip-color.mjs` output; `command.css:507-510,521-537` | audit B1; probe confirms |
| R2 | **"3 HIGH" at 1 high + 2 low** — count of ALL open hazards paired with the WORST severity word, on three surfaces: both new chips + the pre-existing `CommandRail.tsx:383` entry row it was copied from. Reads as three life-threats when there is one. | `stress-command-hazardchip.png`, live innerText probe | Fable T1; audit I1 |
| R3 | #488 widened the By-Division headers and pushed the **spec-required Total column** off the 390px screen behind an unmarked horizontal scroll (no fade/shadow/scrollbar cue). Spec: `30-command-sitstat.md:77`. | `phone-command-division.png`; overflow measured 421 vs 356 | audit B2; Fable T1 |
| R4 | Chip tap targets are **32px** against the design system's ≥56px fireground floor (`craft.md:81`); Operations/Cutting header is fireground. | `command.css:486` | audit B4 |
| R5 | No text overflow handling on chips (`white-space: nowrap`, no ellipsis/min-width) — a long hazard location runs off the viewport mid-word; long SO names can't shrink. | `stress-command-hazardchip.png` (clipped), `command.css:491` | audit B5; Fable T1 |
| R6 | Transfer picker's **"Apparatus on scene" is the whole department roster** — no on-scene/assigned filter; 18 idle rigs all listed under "on scene," all "Available." The label asserts geography the data doesn't have. | `stress-transfer-top.png`; `TransferCommand.tsx:43,96-103` | audit I6 (elevated); Fable T1 |

## INCOMPLETE — gaps in fix or review

| # | Gap | Source |
|---|---|---|
| N1 | SO chip is in a non-sticky header — "persistent" (C-6) survives the tab switch, dies on first scroll. | audit B3 |
| N2 | Hazard chip a11y name is "3 HIGH, button" — no noun, no hint it navigates. | audit I2 |
| N3 | On Command the chip renders full-width banner (not the pill) AND duplicates the Hazards entry-row string ~250px below. | audit I3 |
| N4 | By-Division header labels centered over right-aligned numerals (mis-registration grows with divisions). | audit I4 |
| N5 | Legend `<p>` carries UA default margins — off the 4px grid. | audit I5 |
| N6 | `useSafetyOfficerLabel` empty-string-label drift vs CommandRail; both surfaces show only `assignedResources[0]` (second Safety resource silently hidden); no pinning test. | audit I9 |
| N7 | Review coverage: zero captures of light/sunlight/broadcast (direct cause of R1 escaping), Inventory/Quick Find/Settings, end-of-op + past-op archive, auth/join, Audit Log, empty/error states, Firebase-online states; instruments judged from a near-empty fixture (By-Division passed at one row, transfer at 3 candidates). | audit I7/I8; purchasing §1 |
| N8 | **Record integrity:** ADR-022 commits mutual aid to v4.0 — zero code (grep-verified); audit-log spec commits ICS-201/208/PAR PDF export "not deferred" — only CSV built; ADR-018 after-action email "on by default" — toggle exists, no send mechanism anywhere. Session records show email transport/forms were later deliberately deferred, but the ADRs/specs were never amended — the paper over-claims either way. | purchasing §2; Fable verified all three |

## QUESTIONS — need Alex's ruling

| # | Question | Source |
|---|---|---|
| Q1 | #488 re-reversed the #434 legend removal (a Alex-gated visual call). Keep the restored 3-line legend under the table, move it behind an info affordance, or re-remove? | audit Q1 |
| Q2 | The hazard-chip ruling amended the spec by fiat — `30-command-sitstat.md` still says hazards live below the fold. Who edits the spec + parity row? | audit Q2 |
| Q3 | Concern 5 ("N/S" connectors at Cutting Station) is simultaneously "refuted" and a TTX watch item. Both independent reviewers say the read-surface question (what should Quick View SAY to a cold reader) deserves an acceptance criterion, not a refutation. Closed, or live with criteria? | audit Q3; purchasing §3 |
| Q4 | C-6 says "every IC-facing screen" — PastOperationView, Hazard Log full-screen, Inventory have no SO chip. Narrow C-6 or extend #487? | audit Q4 |
| Q5 | Purchasing conditions: (a) mutual aid — build v4.0 as ADR-022 commits, or formally re-defer and amend the ADR; (b) ICS-forms export — build or amend spec to CSV-only-v4.0; (c) after-action email — build transport or flip the default off and amend ADR-018. | purchasing conditions 1-3 |

## Round 2 — prompted by Alex ("W3W is broken and you didn't report it — what else did you miss?")

Alex was right, and the miss was systemic: the failure was already recorded in session memory
(2026-07-11) and no track consulted it or probed any external dependency. A full-surface sweep
(`sweep-driver.mjs`, `probe-w3w.mjs`, `probe-places2.mjs`) then covered what no review had visited.

**Additional BROKEN:**

| # | Defect | Evidence |
|---|---|---|
| R7 | **what3words is dead in the production config** — the configured key returns HTTP 402 (no paid plan) on `convert-to-3wa`; every shore point's words stay "pending" forever (silent infinite backfill retry); users only ever get the coords chip. Known since 2026-07-11; [#441](https://github.com/Vergo402/paratech-struts/issues/441) is CLOSED as done; no open issue tracks the dead key. | `probe-w3w.mjs` → `FAIL: HTTP 402`; `src/data/w3w/w3w.ts` |

**Additional INCOMPLETE:**

| # | Gap | Evidence |
|---|---|---|
| N9 | Audit log (Administrative view) shows an **eternal "Loading…"** when the cloud is unreachable — no offline/error state. An offline admin gets a spinner, not an answer. | `sweep-auditlog.png` (network-blocked context) |
| N10 | Google Places autocomplete is referrer-locked to the beta domain (localhost probe: "Requests from referer http://localhost:3000/ are blocked") — correct security posture, but it means the address field is untestable in every local review harness and has not been re-verified on beta by anyone since 2026-07-11. | `probe-places2.mjs` |
| N11 | **Broadcast wall-board (C-13) doesn't exist in the product** — `30-command-sitstat.md` commits a read-only broadcast projection (own layout row, closed spec [#213](https://github.com/Vergo402/paratech-struts/issues/213)); the only "broadcast" in `src/` is a theme option in the dev-gated gallery. Joins the N8 over-claim family. | grep: no broadcast surface in `src/ui`/`src/app/routes` |
| N12 | Live-tested this round and CLEAN: Inventory screen renders + counts correct, Quick Find calc, all 7 Settings pages, User Manager screen, Help page, auth/join/create-department screens (my sweep's first "near-empty" flags were probe artifacts — content renders outside `<main>`; verified by screenshot). Feedback sheet exists (under Help & Reference) and inventory CSV export exists (unit-tested) — both still never live-verified end-to-end by any review. | `sweep-*.png` |

**Round-2 process finding (logged as observation 19):** every track scoped itself to the surfaces
the gate pointed at; none enumerated the feature list, the external dependencies
(`VITE_W3W_KEY`, `VITE_GOOGLE_MAPS_KEY`, callables), or the known-broken items already in session
memory. Future whole-product reviews start with that denominator.

## Reviewer scorecard

- BC review: praised fairly, but its 5 findings missed all 6 BROKEN items above (4 of 6 are defects
  *in the fixes it triggered*; R2's dishonesty predates the gate and was propagated by it).
- Fable's #261 verification: caught mockup fidelity, missed R1 (probed the wrong element) — logged.
- Skeptical audit: 18 claims, 18 confirmed, 0 refuted.
- Purchasing review: 3 not-built claims, 3 verified; Concern-5 pushback endorsed into Q3.
