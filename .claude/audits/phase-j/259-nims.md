# Phase J Gate #259 — NIMS/ICS Doctrine Compliance Audit (v4)

**Scope:** `src/` (v4 app) + `docs/v4-design/` on `v4-redesign`. v3 root app out of scope.
**Judged against:** the project's own locked doctrine (ADR-008, ADR-021 + addenda,
`docs/v4-design/04-references/nims-org-structure.md`) plus the national sources those
ADRs cite (NIMS 2017, SM-0322, MANUAL 12-001, ICS 100, NFES 2731, ICS 420-1).
**Excluded (already tracked, not re-reported):** #447–#480, per
`.claude/audits/pre-phase-j-review-2026-07/TRIAGE-2026-07-28.md`.

---

## Verdict: PASS-WITH-CONDITIONS

The structural doctrine — the part that would be hard to fix late — is compliant and
well-built: the default org tree, the two-functional-Group model, span-of-control
math, the one-IC-of-record invariant under command transfer, the `assignedResource`
schema rename, Task-Force-as-configuration (not apparatus type), and the
floor-numbered/side-lettered Division model all match ADR-008 and national doctrine
exactly. Nothing here blocks cutover on structural grounds.

Two findings below are genuine, previously-untracked doctrine violations that should
be closed before or shortly after cutover — one is a straightforward oversight (a
label that should have been renamed with the field), the other is a labeling/scope
mismatch on the ICS-201 card. Neither is a data-integrity or safety risk; both are
"the doctrine reviewer's own locked ADR says this shouldn't happen" issues, which is
why this is PASS-WITH-CONDITIONS rather than a clean PASS.

---

## New Findings

### F1 — "Group" label survives on the `assignedResource` picker (Terminology, should-fix before cutover)

**File:** `src/ui/operations/AddShorePointModal.tsx:639-646`

```tsx
{(apparatusOptions.length > 1 || assignedResource) && (
  <BottomSheetPicker
    label="Group"
    options={apparatusOptions}
    value={assignedResource}
    onSelect={setAssignedResource}
  />
)}
```

**Doctrine violated:** ADR-008 §7 (the `group` → `assignedResource` rename is locked)
and `nims-org-structure.md` §11 ("The `group` Field and `assignedResource` Rename" —
"Displaying 'Group: Engine 3' on a shore-point card reads as 'this shore point is
being managed by an ICS Group called Engine 3,' which is not what is stored or
intended... `sp.assignedResource` is the canonical field.").

**Current behavior vs. doctrine:** The underlying data model did the rename correctly
— `sp.assignedResource` is the schema field everywhere (`src/core/schema/shorepoint.ts:126`),
and every other read site (`ShorePointCard.tsx:308`, `ShorePointDetail.tsx:158` — labeled
"Assigned", `DivisionView.tsx:66`, `ShorePointListRow.tsx:42`) shows it correctly with no
"Group" language. This one write site — the Add/Edit Shore Point form's picker for that
same field — was never updated and still shows the operator the pre-ADR-008 v3 label
"Group" (verified: `BottomSheetPicker`'s `label` prop renders as visible text,
`src/ui/picker/BottomSheetPicker.tsx:56-57`, not an ARIA-only string). `ShorePointDetail.tsx`
correctly saying "Assigned" for the exact same field is the tell that this is a missed
rename, not a considered decision.

**Severity:** Terminology. It is the operator-facing surface of the exact violation
ADR-008 exists to close — every other touchpoint in the app was fixed, this one form
control was not — so it's worth closing before cutover rather than carrying it as a v4.1
item.

**Recommended fix approach:** Rename the picker's `label` prop from `"Group"` to
`"Assigned Resource"` (or match whatever short label `ShorePointDetail.tsx` uses —
"Assigned" — for consistency across the two surfaces). No schema or data change; this
is a one-line label fix. Grep the rest of `src/ui/operations/` for any other
`assignedResource`-bound control with a stale `"Group"` label before closing (I found
only this one site, but re-verify at fix time).

---

### F2 — "ICS-201 briefing" label overclaims the form it renders (Terminology / doctrine labeling)

**File:** `src/ui/command/ICS201Brief.tsx:11-56`

```tsx
return (
  <section className="fs-201" aria-label="ICS-201 briefing">
    <div className="fs-201-head">
      <span className="fs-201-eyebrow">ICS-201 briefing · live</span>
    </div>
    ...
```

The card renders exactly six datums: Incident (name), Elapsed, Incident Commander,
Safety Officer, Open hazards, Shore points (set/total).

**Doctrine violated:** `nims-org-structure.md` §13 defines what FieldShore's ICS-201
"should provide": *"situation summary (editable), resources on scene (from apparatus
list), current organization (from positions), actions taken (from shore-point event
log), objectives (editable). PDF export."* The real federal ICS-201 (ICS 420-1) has
four required blocks: Map/Sketch, Current Organization, Resource Summary, Situation
Summary. This card supplies none of Resource Summary, Situation Summary, Current
Organization (beyond IC/Safety names), Objectives, or a PDF export — it is a live
stat strip, not the form.

**Current behavior vs. doctrine:** This is a **documented, deliberate v4.0/v4.1 scope
split**, not a hidden gap — `docs/v4-design/08-information-architecture/33-ic-command-checklist.md:63`
explicitly scopes v4.0 to "a real, auto-assembled ICS-201 brief — the six live SitStat
datums... assembled live data, not paraphrased doctrine," with the fuller doctrine
content deferred to v4.1 (OQ7/Open-Q5). The design intent is sound and the content that
does ship is genuinely useful and correctly assembled from live state (verified against
`ICS201Brief.tsx` — IC/Safety pulled from `currentIC`/`leaderOf`, hazards from
`openHazardsBySeverity`, no manual entry). **The gap is the built label, not the scope
call**: the `aria-label` and the on-screen eyebrow both say "ICS-201 briefing" with no
qualifier, so a reader (or a future PDF-export/ICS-201-claim built on top of this
component) would reasonably assume this is a compliant ICS-201, when by the project's
own doctrine reference it's missing 4 of the form's required informational blocks.

**Severity:** Cosmetic-to-terminology. Not compliance-blocking on its own (the design
doc already scoped it correctly and no PDF/export claiming ICS-201 compliance exists
yet — verified: no `ICS-203`/`-204`/`-207`/`-214` strings anywhere in `src/`, so no other
form makes a similar overclaim). Worth a small fix so the UI label matches what design
already knows it ships.

**Recommended fix approach:** Qualify the label rather than expand the form — e.g.
eyebrow text "ICS-201 brief · live snapshot" or "Command snapshot (ICS-201-style)."
This is a documentation/labeling fix, not new scope; expanding the card to the full
four-block ICS-201 is legitimately v4.1 per the already-accepted design doc.

---

## Observations Noted, Not Filed

- **"Div N" / "Sub Div N" abbreviated locator labels** (`src/core/operation/division.ts`,
  used throughout `ShorePointCard`, `DivisionView`, `OperationsBoard`, etc.). ADR-008 §7's
  "no acronyms in the UI" lock and `nims-org-structure.md` §3's "No acronyms" rule are
  explicitly scoped to *ICS position-title vocabulary* ("Operations Section Chief" not
  "OSC") — not to geographic locators. The doctrine-critical part of the Division model
  (numbered by floor, not "Division Alpha"; sides A–D as a separate scheme) is correctly
  implemented (`src/core/schema/shorepoint.ts:29-35`, `division.ts`). "Div" is a
  space-driven abbreviation, not an ICS acronym violation. Not filed.

- **"IC" used as a UI label in several places** — `src/ui/operations/OpsHeaderMeta.tsx:55`
  (`<span className="fs-ops-pill-k">IC</span>`, the desktop header pill), `src/ui/command/CommandRail.tsx:242,267`
  ("from {ic?.label ?? 'the current IC'}"), `src/ui/admin/AuditLogScreen.tsx:142`
  (`who: 'IC / Operations'`, rendered on screen and asserted by
  `AuditLogScreen.test.tsx`). This is the same category of violation as "OSC" under
  ADR-008 §7 / nims-org-structure.md §3's explicit "no acronyms in the UI" lock — and
  `ICS201Brief.tsx:49` spelling out "Incident Commander" in the same command surface is
  internal evidence the app knows the correct form. **Judgment call, flagged but not
  filed as a numbered finding** because: (a) "IC" is unlike "OSC" in that it's near-
  universal shorthand even within NIMS training materials themselves (unlike "OSC",
  which the doctrine reference calls out by name as specifically wrong), and (b) it's
  confined to compact chip/pill contexts under real space constraints, not full position
  titles on the org chart itself (which does correctly spell out "Incident Commander,"
  "Operations Section Chief," etc. — verified in `defaultTree.ts` and `library.ts`, no
  abbreviated titles anywhere in the position catalog). Recommend the Phase J gate owner
  make an explicit call on whether "IC" clears the acronym lock's intent, since the doc
  text is unqualified ("No acronyms in the UI... This is locked per the brief") and
  doesn't carve out an "IC" exception the way it might have.

- **Unified Command (multi-agency co-equal IC)** — the org model is single-root by
  construction: `rootPosition()` (`src/core/org/tree.ts:6-8`) finds the one node with
  `parentId === null`, and `CommandTransferAccepted` (`orgReducer.ts:120-134`) always
  collapses the IC slot to a single leader. Co-equal multi-agency Unified Command is
  therefore structurally impossible in v4. This is **not a gap** — `nims-org-structure.md`
  §6 explicitly defers full Unified Command to v5 ("FieldShore v4 renders the correct
  position structure in the org chart but multi-agency write permissions and Unified
  Command IC collection are v5 work"), citing ADR-003. Read ADR-003
  (`docs/v4-design/11-decisions/ADR-003-scope-everyday-expandable.md`) directly: its
  Consequences section confirms "Federal IST workflows, state mutual-aid authentication,
  and FEMA demob lifecycle stay deferred to v5." Verified-deferred, not a finding.

- **Span-of-control warnings** — ADR-008 §8 commits these to ship in v4.0 (level presets
  deferred, but "Span-of-control soft warnings (6/8/9) and the position vocabulary still
  ship"). Verified rendered, not just computed: `src/ui/command/OrgTree.tsx:2,92`
  imports and calls `spanOfControl`/`spanLevel` to drive a badge on each org node. Not a
  gap.

- **"Sector" leakage** — `library.ts:8` asserts "Sector is pre-NIMS, never used." Grepped
  `src/ui` for "Sector": zero matches. Confirmed clean.

---

## Verified-Compliant (checked against doctrine, no issue found)

| Area | Doctrine source | File(s) | Result |
|---|---|---|---|
| Default org tree (IC, Safety, Ops, Rescue Group, Shoring Group, Staging, Cutting Station) | ADR-008 §1–3 | `src/core/org/defaultTree.ts` | Exact match — titles, kinds, parentage, Search/Medical NOT seeded (add-on only) |
| Position library (add-on positions: PIO, Liaison, Deputy IC, Section Chiefs, Branch/Division/Group, Strike Team/Task Force/Single Resource, Units) | `nims-org-structure.md` §3, §7 new-positions table | `src/core/org/library.ts` | Titles use correct suffix law (Chief/Director/Supervisor/Leader); `addableUnder` keeps the tree NIMS-sane |
| Cutting Station as workstation, not command node | ADR-008 §3, §9 | `defaultTree.ts:35`, `library.ts:42` (`kind: 'workstation'`) | Correct — distinct kind, not `group`/`section` |
| Runner as shore-point/task attribute, not org node | ADR-008 §3, §10 | No `runner` position anywhere in `defaultTree.ts`/`library.ts`; shore-point status `runner` is a lifecycle state (`shorepoint.ts:13`) | Correct |
| `group` → `assignedResource` schema rename | ADR-008 §7, §11 | `src/core/schema/shorepoint.ts:123-126,183` | Field itself correctly renamed everywhere in core/data layer |
| Division = floor-numbered, side = separate A–D scheme | ADR-008 §4, §6 (Q1) | `shorepoint.ts:29-35` (`BuildingSide` enum), `src/core/operation/division.ts` | Correct — no "Division Alpha," sides combine as "N, side" |
| Span of control (3–5 ok / 6–7 caution / 8+ over; Command Staff excluded) | `nims-org-structure.md` §5 | `src/core/org/span.ts` | Exact match, and rendered (see Observations) |
| Task Force removed from apparatus types, modeled as position/resource config | ADR-008 §7, `nims-org-structure.md` §12 | `src/core/load/apparatus.ts:2-7` (no Task Force), `library.ts:46` (Task Force Leader as position) | Correct |
| One-IC-of-record invariant under command transfer | ADR-021 + Addenda 1/2 | `src/core/org/transfer.ts` (`currentIC`, `canAccept`), `src/core/org/orgReducer.ts:101-142` (`CommandTransferInitiated`/`Accepted`/`Declined`/`Cancelled`) | Outgoing IC verified as sole leader through initiate; incoming replaces index 0 on accept; pending/decline/cancel always resolve to exactly one leader. Matches the ADR's core safety invariant exactly. |
| 4-digit accept code / named-target reachability | ADR-021 Addenda 1 & 2 | `orgReducer.ts:101-118` (`claimCode`), `CommandRail.tsx:220-274` | Matches documented behavior (device-ref strict uid match; named/apparatus targets get the quiet-line + code gate) |
| `canReparent`/org-edit authority restricted to IC (Safety Officer excluded) | `nims-org-structure.md` §14 | `src/ui/command/useOrgDragDrop.ts:388,410` (`isICRef` gate), `src/ui/hooks/useCommandSelf.ts` | Correct — no Safety-Officer org-edit path found |
| No ICS-203/204/207/214 mislabeled forms | `nims-org-structure.md` §13 | grep across `src/` | Zero matches — no other form makes an unqualified compliance claim |
| "Sector" terminology leak | `library.ts:8` self-assertion | grep across `src/ui` | Clean, zero matches |
| Unified Command scope | `nims-org-structure.md` §6, ADR-003 | `src/core/org/tree.ts:6-8`, `orgReducer.ts:120-134` | Single-root by design; correctly and explicitly deferred to v5, not a silent gap |

---

## Summary for Gate Sign-off

**Blocking:** none.
**Should-fix before cutover:** F1 (`AddShorePointModal.tsx:641` — rename "Group" label
to match the `assignedResource` field it controls; one-line fix, no schema change).
**Can ship as-is / fix opportunistically:** F2 (qualify the "ICS-201 briefing" label so
it doesn't overclaim form completeness; the underlying scope decision is already
correctly documented for v4.1).
**Needs an explicit team call, not a fix:** the "IC" abbreviation usage (Observations) —
recommend Alex/gate owner decide once whether it clears the no-acronym lock's intent,
then either file it or add an explicit doctrine carve-out to `nims-org-structure.md` §3
so it doesn't get re-litigated at the next audit.

---
## Gate decisions (Alex, 2026-07-28)
- **"IC" as a UI label: BLESSED in space-constrained chrome** (operations header, command rail, audit log). The no-acronym rule continues to govern the org chart, briefs, and anywhere space allows the full title. Recorded here as a deliberate exception, not drift.
- **F1 ("Group" label)**: fixed in the Stage A fix batch (label → "Assigned", AddShorePointModal).
- **F2 (ICS-201 label)**: fixed in the Stage A fix batch (label qualified to "Command brief (ICS-201 condensed)").
