# Phase J Gate #261 — Battalion Chief Field Review

**Reviewer:** BC (on-scene IC lens), Phase J gate for #262 TTX
**Scope:** v4 built app, screenshots from live seeded scene "Meadowville Warehouse Collapse" (`.claude/audits/phase-j/261-shots/`)
**Verdict: APPROVE WITH CONDITIONS.**

The mechanism is sound — two-party command transfer with outgoing-retains-until-accept, an
always-visible Safety Officer slot, offline-tolerant Command with Transfer still live, and a Quick
View deep enough to hand a borrowed phone to a cold IC and have them orient in seconds. Nothing here
clears my own BLOCKER bar ("I'd put the phone away and use the radio instead"). But five FRICTION
items are real and worth closing before #262, because two of them — the Safety Officer disappearing
off the Operations screen, and the By-Division board losing its own spec'd text legend — sit right on
top of the two questions I lead with at every incident: where's my Safety Officer, and who's behind.
Conditions: close #1 (SO persistent header) and #3 (By-Division legend) before the TTX; the rest
(#2, #4, #5) can run through the TTX as-is and get fixed off its findings.

---

## 1. IC perspective per surface

### Command / SitStat (`phone-command.png`, `phone-command-2.png`, `desk-command.png`)
**Works.** The IC block (Incident Commander / Operations Section Chief / Safety Officer) sits above
the fold with the gold underline unambiguously marking who's in command — that's the E+0:09 question
answered in under a second, on phone or desk. The 7-status board is legible and matches the Operations
lane order. The "Div 1" hazard chip, Org Chart summary, and Resource Roster are all one scroll or one
tap away. This is a screen I could run an incident from.

**Friction:** the Safety Officer name only lives in this IC block — not in a header that persists
onto Operations (see Concern 1). On phone, the HIGH hazard chip is below the fold (behind the full
7-row status board) — see Concern 2.

### Operations board / Cutting Station (`phone-ops-board.png`, `phone-ops-cutting.png`)
**Works** for the primary job — advancing shore points, seeing what's pending, adding a point. Card
density is right for a phone. **Friction:** no Safety Officer indicator anywhere on this screen — the
crew working shoring (where a structural hazard actually matters most) can't see who's watching their
back without leaving the tab. See Concern 1.

### Quick View (`phone-quickview.png`)
**Works, with one open question.** Full BOM, deduction ledger, and timeline in one drawer is exactly
what I'd want if I inherit this incident on someone else's phone at hour nine. The one thing that
gave me pause: a leg already at Cutting Station showing "Top Connector — not selected · N/S" and
"Bottom Connector — not selected · N/S" in red, with Estimated load "—". See Concern 5.

### Command Transfer (`phone-transfer-1.png`)
**Works for the handshake model; friction on the target list.** The two-party handshake (I keep
command until you accept) is exactly the fireground rule, and the auto-assembled ICS-201-condensed
brief (incident, elapsed, IC, SO, hazards, shore points) means I'm not filling out a form while
handing off command. **Friction:** the target picker only offers individuals/devices already on the
org chart, plus free text — apparatus (Engine 1, Rescue 2, Squad 3) aren't selectable even though
they're sitting right there in the "Available rigs" row and the org chart. See Concern 4.

### IC Command Checklist (`phone-checklist.png`, `phone-checklist-2.png`)
**Works.** Auto-collapsing completed phases while keeping the active phase and its live ICS-201
condensed brief visible is the right shape for a deep doctrine tree under stress — I'm never hunting
for the next unchecked box. Nothing to flag.

### Org Chart / node detail / My Role (`phone-command-org.png`, `phone-org-node.png`, `phone-myrole.png`)
**Works.** "Available rigs" (Rescue 2, Squad 3) sitting above the tree, alongside Engine 1 shown
inline with its assigned position, answers "what do I have and where is it" in one glance — that's
accountability of every unit, structurally, not just as a promise. My Role's flat list with "under X"
sub-labels is fast to scan and fast to tap. No blockers.

### By Division (`phone-command-division.png`)
**Friction.** The table itself — one row per division, a Total column, a lagging-division flag — is
the right instrument for span-of-control at Surfside scale. But the column headers are bare colored
dots with no text and no legend. See Concern 3.

### Offline state (`phone-offline.png`)
**Works — this is the one I care about most, and it passes.** The banner is calm ("Offline — will
sync when you reconnect"), non-blocking, and Transfer Command stays live and gold-outlined. I can run
the incident through a 10-minute signal loss without the app getting in my way. This is exactly the
resilience posture I need.

### Desktop deck (`desk-command.png`, `desk-command-hazards.png`, `desk-command-node.png`)
**Works.** Same hierarchy as phone, same IC block, same hazard/org-chart summary — a chief walking up
to a Toughbook at the CP isn't relearning the app. The Hazard Log's "Export ICS-208" affordance is a
real plus for shift-transfer paperwork (see What's Good).

---

## 2. Specific concerns

### Concern 1 — Safety Officer isn't in a *persistent* header; it's Command-tab-only
**Severity: FRICTION**
**Evidence:** `phone-ops-board.png` / `phone-ops-cutting.png` (no SO name anywhere on Operations) vs.
`docs/v4-design/08-information-architecture/30-command-sitstat.md` line 96 — *"Persistent Safety
Officer + OP header on this and every IC-facing screen (C-6)"* — and the identical locked rule
repeated in `32-hazard-log.md` line 78.
**Bite:** at any point while I'm working the Operations board (which is most of the incident, not
just Command), if someone asks "who's my Safety Officer" or a hazard just got called, I have to tab
away to Command to answer it. The spec itself calls this out twice as a locked, cross-cutting rule —
this reads like the built app not yet honoring its own written requirement, not a design choice.
**What I'd want changed:** surface the Safety Officer name (or "Unassigned") in the same persistent
slot on Operations (and Cutting Station) that Command uses. It doesn't need to be large — a header
chip is enough — but it needs to survive the tab switch.

### Concern 2 — On phone, the HIGH hazard sits below seven rows of status counts
**Severity: FRICTION (spec-compliant placement, but I'd push back on the spec)**
**Evidence:** `phone-command.png` (unscrolled — ends mid status-board, no hazard visible) vs.
`phone-command-2.png` (scrolled — hazard chip appears after all seven status rows). Per
`30-command-sitstat.md` §Information hierarchy, the Hazard Log is explicitly **below the fold** on
phone by design (one-tap entry, not one of the six above-fold datums).
**Bite:** at E+0:09 on a collapse with a HIGH "north wall lean" already logged, a chief glancing at
Command for the first time sees the IC block and a wall of status counts before the one thing that
could kill someone. This isn't a build defect — it's a deliberate spec decision (hazards are visible,
never a gate, Principle 10) — but I'd ask for the open-HIGH-hazard chip to ride the persistent header
alongside the Safety Officer name, not wait a scroll behind the status board.
**What I'd want changed:** not a build fix — a spec conversation. Consider promoting "N open hazards
(highest severity)" into the always-visible header, distinct from the full Hazard Log entry point.

### Concern 3 — By-Division board's column headers regressed to unlabeled dots
**Severity: FRICTION**
**Evidence:** `phone-command-division.png` shows seven bare colored dots as column headers with no
text and no legend line, vs. `30-command-sitstat.md` line 77, which specifies **"abbreviated
headers — Pend / Assign / Set / Cut / Run / Secured / Ret'd, with a one-line legend mapping each to
its full `STATUS_LABELS` word."**
**Bite:** at Surfside scale with multiple divisions and a lagging-division flag doing real work, I'd
be cross-referencing seven colors against the (labeled) board above from memory, at night, possibly
color-vision-impaired. This is exactly the kind of "color never alone" violation the design system
elsewhere holds itself to (see the Hazard Log spec, Principle 9).
**What I'd want changed:** ship the abbreviated text headers and the one-line legend the spec already
calls for — this looks like a straightforward gap against an already-approved spec, not a design
question.

### Concern 4 — Transfer Command's target picker excludes apparatus
**Severity: FRICTION**
**Evidence:** `src/ui/command/TransferCommand.tsx` — the `candidates` list is built from org-chart
`assignedResources` filtered to `r.ref !== 'individual' && r.ref !== 'device'` → **continue** (i.e.
apparatus refs are dropped), plus a free-text field that always mints an `individual`-typed resource.
`ADR-021` Addendum 2 explicitly scopes the 4-digit accept code to **"named-individual and apparatus
targets"** — the code path is built for apparatus, but the picker never offers one. Engine 1 (already
assigned Shoring Group Supervisor) and the unassigned Rescue 2 / Squad 3 are all visible in the same
screen's "Available rigs" row and never appear as transfer candidates.
**Bite:** at E+0:09, if command is passing to a unit identified by its apparatus designation rather
than a name I already know, I'm typing free text on a phone in the rain instead of tapping a rig
that's already on the board — and what I type becomes an `individual`-typed resource in the org data,
which is a data-model mismatch for what's actually an apparatus.
**What I'd want changed:** include apparatus refs in the candidate list the same way individuals and
devices are offered, so the picker matches what the accept-code addendum already assumes.

### Concern 5 — Quick View shows an already-cut leg with unselected connectors and no load figure
**Severity: FRICTION** (raising it at this severity deliberately, not softening it — this is a
read-surface honesty question, squarely in my lane even though #260 closed the engine math)
**Evidence:** `phone-quickview.png` — shore point #1 · 3-Post, status **Cutting Station**, Top
Connector "not selected · N/S" (red), Bottom Connector "not selected · N/S" (red), Estimated load
"—", one strut (LS 304) in the BOM.
**Bite:** at E+9:00, Chief Whitaker takes the 12-hour shift transfer and opens Quick View on a shore
that's already been through cutting to ask "what's this leg rated for?" — and the honest answer the
drawer gives back is a blank load figure and two red "not selected" connector rows on equipment that's
already deployed and cut. Whether that's correct (a genuinely undocumented gap in what was placed) or
a fixture artifact (the seed script never ran the connector-picker step), the drawer's job at a shift
transfer is to be trustworthy about exactly this — and right now it can't distinguish "nobody recorded
this" from "this leg has no connectors by design" for the person reading it cold.
**What I'd want changed:** confirm whether a real deploy can reach Cutting Station with connectors
still unset. If yes, that's worth its own look (not engineering math — data completeness on the record
a shift-transferring IC relies on). If it's fixture-only, note it and move on — but don't assume it's
fixture-only without checking; put it on the TTX list either way (below).

---

## 3. What you'd want changed (rollup)

1. Give the Safety Officer name a persistent slot outside the Command tab (Concern 1) — condition for #262.
2. Ship the By-Division text headers + legend that `30-command-sitstat.md` already specifies (Concern 3) — condition for #262.
3. Reconsider hazard placement above the fold on phone Command (Concern 2) — spec discussion, not a #262 blocker.
4. Add apparatus to the Transfer Command candidate list (Concern 4) — can land before or shortly after #262.
5. Verify whether Cutting-Station-stage legs can legitimately carry unselected connectors, and if so what Quick View should say instead of a bare "N/S" (Concern 5) — TTX-appropriate, not a hard gate.

---

## 4. What's good

- **Offline is genuinely non-blocking.** The banner is calm, Transfer Command stays live and reachable,
  and nothing about the app tells me to put the phone away during a 10-minute signal loss. This is the
  single most important thing for a first-due IC and it passes cleanly.
- **The two-party transfer handshake matches the real handoff.** Outgoing IC keeps command (and
  End-Operation authority) until the incoming IC accepts — there's never a no-IC state, which is the
  exact failure mode I'd worry about with a "silent" handoff. ADR-021's reasoning is sound and the
  built flow (`phone-transfer-1.png`) reflects it faithfully.
- **The org chart answers "what do I have and where is it" in one glance.** "Available rigs" sitting
  above the tree, next to assigned apparatus shown inline with its position, is unit accountability
  solved structurally, not as a promise I have to go verify elsewhere.
- **The Safety Officer slot always renders, assigned or not.** It never silently disappears from the
  IC block on Command or the org chart's Command Staff column — an unfilled position stays visible as
  "Unassigned" rather than vanishing, which matters when the honest answer is that nobody's covering
  it yet.
- **Quick View's timeline + deduction ledger is real accountability depth**, not a summary — created,
  equipment deployed, strut set, cutting station, all timestamped with device attribution. That's what
  I'd want on a borrowed phone at hour nine.
- **The IC Command Checklist's auto-collapse is the right call under stress** — completed phases fold
  to a one-line header, the active phase stays fully open, and the live ICS-201 condensed brief rides
  along inside it. Nothing hides the next undone step.
- **Desktop and phone tell the same story.** A chief moving from a phone in the field to a Toughbook
  at the CP isn't relearning the hierarchy — same IC block, same hazard chip, same org-chart summary.

---

## 5. Verify-in-TTX list

Things stills and specs can't settle — #262 needs to exercise these directly:

1. **Multi-device transfer accept, live.** All transfer screenshots are single-device; the pending
   state (`phone-transfer-1.png` only shows the outgoing side). Run the actual two-device handshake —
   including the named-target 4-digit code path and the #401 single-device hand-the-tablet path — and
   confirm both render correctly, especially under signal loss on one end.
2. **Real elapsed-time rendering in the transfer brief.** Every screenshot's op clock reads `0m` /
   `00:00:09` / `00:00:17` — the fixture never ran long enough to show how the six-datum brief renders
   at, say, 2:41 elapsed with real status counts. That's the single most-needed datum in an actual
   E+0:09-style handoff; confirm it doesn't truncate or misformat at realistic durations.
3. **Span-of-control badge at 6–7+ direct reports.** The workflow spec (line 120, 131 of
   `20-role-assignment-command-transfer.md`) defines a caution/over badge — unobservable here since
   only one position (Shoring Group Supervisor → Engine 1) is staffed. Load a realistic org chart and
   confirm the badge actually appears and reads clearly at caution and over thresholds.
4. **Sync race on status slides during a reconnect.** The offline screenshot shows the banner state
   cleanly, but not a device coming back online mid-slide-to-advance with conflicting remote state.
   Exercise a genuine drop/reconnect while a status change is in flight.
5. **Whether a real deploy can reach Cutting Station with connectors unselected** (Concern 5) —
   confirm fixture-artifact vs. real gap, and if real, what Quick View should show a shift-transferring
   IC instead of a bare "N/S."
6. **Hazard visibility during an active reconnect / multi-device add.** Two Safety Officers or two
   devices logging the same structural hazard concurrently while offline — does the log dedupe sanely
   on sync, and does the shore-point badge propagate correctly (open question #3 in
   `32-hazard-log.md`)?
7. **Broadcast/wall-board surface**, not captured in this screenshot set at all — worth at least one
   pass during the TTX given C-13's left-third-org/center-status-board layout is a distinct code path.

---

*Files referenced: `.claude/audits/phase-j/261-shots/*.png`; `docs/v4-design/09-workflows/20-role-assignment-command-transfer.md`; `docs/v4-design/11-decisions/ADR-021-command-transfer-handshake.md`; `docs/v4-design/08-information-architecture/30-command-sitstat.md`; `docs/v4-design/08-information-architecture/32-hazard-log.md`; `docs/v4-design/09-workflows/22-ic-command-checklist.md`; `src/ui/command/TransferCommand.tsx`; `.claude/audits/phase-j/doctrine-walk.md`.*

---

## Gate decisions (appendix — Fable adjudication + Alex rulings, 2026-08-05)

Fable verified every concern against spec/code before it reached Alex:

| # | Concern | Adjudication | Alex ruling | Issue |
|---|---|---|---|---|
| 1 | Safety Officer not persistent outside Command | **CONFIRMED** — locked rule C-6 quoted verbatim in `30-command-sitstat.md` ("Persistent Safety Officer + OP header on this and every IC-facing screen"), repeated in `32-hazard-log.md`; no SO reference anywhere in the Operations header components | Fix before TTX | [#487](https://github.com/Vergo402/paratech-struts/issues/487) |
| 2 | HIGH hazard below the fold on phone Command | **CONFIRMED as spec-compliant** — deliberate placement per the SitStat information hierarchy; treated as a spec conversation, not a defect | Add persistent header hazard chip (spec amended by ruling) | [#490](https://github.com/Vergo402/paratech-struts/issues/490) |
| 3 | By-Division headers are unlabeled dots | **CONFIRMED** — spec calls for abbreviated headers + legend; `SitStatRollup.tsx:105` comment records the legend's deliberate removal in #434. Spec-vs-build conflict resolved in the spec's favor | Restore text headers + legend | [#488](https://github.com/Vergo402/paratech-struts/issues/488) |
| 4 | Transfer picker excludes apparatus | **CONFIRMED** — `TransferCommand.tsx:74` filters apparatus refs while the #425 claim-code comment (line ~103) explicitly anticipates apparatus targets; ADR-021 Addendum 2 scopes the accept code to individual AND apparatus | Fix before TTX | [#489](https://github.com/Vergo402/paratech-struts/issues/489) |
| 5 | Quick View "N/S" connectors on a cutting-stage leg | **MOSTLY REFUTED** — the drawer already distinguishes deliberate "None" from unrecorded red "not selected"; Estimated load "—" reflects an optional input never entered. The reachable-with-unset-connectors path is by design (ADR-010 always-advance). Kernel survives as TTX watch item 5 | No fix; on the #262 TTX watch list | — |

The verify-in-TTX list (§5, 7 items) transfers to [#262](https://github.com/Vergo402/paratech-struts/issues/262) as its exercise checklist (posted as a comment there). Verdict stands: **APPROVE WITH CONDITIONS**; the gate closes when #487–#490 are built, verified against the approved mockups, and the suite is green.

### Build + verification record (same session, 2026-08-05)

All four fixes built (mockups approved by Alex first, per the standing rule), reviewed, and verified:

- **#487 + #490** — new `IncidentChips.tsx` strip (`SafetyOfficerChip` always renders per C-6; `HazardChip` hidden at zero open hazards, never gates). Placed on the shared Operations/Cutting header; `HazardChip` with location rides above the Command staff card. Both chips reuse the exact CommandRail selectors (factored into `useSafetyOfficerLabel` / `useOpenHazards`).
- **#488** — `SitStatRollup` headers now dot + abbreviation with the full `STATUS_LABELS` word as the accessible name, plus the one-line legend the spec calls for. Full words sourced from `@core` only.
- **#489** — apparatus candidates in `TransferCommand` from the same roster source as the org chart's Available-rigs strip; position title or "Available" as secondary label; IC's own rig excluded. Core needed no changes (apparatus refs already valid through event schema, reducer, `canAccept`, and the #425 claim-code mint — verified, not assumed). **Group order ruled by Alex: Apparatus on scene → On the org chart → Department members** ("personnel change on rigs all the time; rigs stay pretty consistent").

Verification (run bare on the main loop): **1510/1510 tests, typecheck clean, lint clean**; built screens re-captured from the live seeded scene (`261-shots/`, same driver) and checked against the approved mockups by Fable directly — Operations chip strip (Unassigned state), Command hazard chip with location, labeled By-Division headers + legend (horizontal in-pane scroll on phone is the pre-existing `.fs-rollup-scroll` design), rigs-first transfer groups with secondary labels. Screenshot set in this folder reflects the post-fix app.
