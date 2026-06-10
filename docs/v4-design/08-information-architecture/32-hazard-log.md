# IA Spec: Hazard Log

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: recs C-8 (first-class hazard log, ICS-208, per-area SP badge), C-6 (one tap from the Safety-Officer header); [`06-synthesis.md`](../06-synthesis.md) §1.10, Q2 (no safety-hold); [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); Principle 10; GitHub [#296](https://github.com/Vergo402/paratech-struts/issues/296). Grounded in v3 `renderHazardLog()` (app.js:4833), `confirmAddHazard()` (4752), `markHazardMitigated()` (4790), `addHazardModal` (index.html:715), the hazard schema (type / location / severity / notes / reported-by+at / mitigated-by+at).

---

## Purpose

The incident's ICS-208 hazard register: every identified hazard — type, location, severity, status — logged, visible, and tied to the areas it threatens, so the Safety Officer (and everyone) can see what's dangerous and what's been mitigated.

## Where it lives

- **Tab / parent:** **Command** — a first-class screen opened **one tap from [SitStat](30-command-sitstat.md) and from the persistent Safety-Officer header** (rec C-6/C-8; per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)).
- **How it is reached:** the Safety-Officer header tap (any IC-facing screen) and the Hazard Log entry on Command. Its hazards also surface **as badges on [Operations](20-operations.md) shore-point cards**.
- **Issue:** [#296](https://github.com/Vergo402/paratech-struts/issues/296).

## Primary role(s) and surface(s)

- **Primary role(s):** the **Safety Officer** (owns it), but **any role may add a hazard** (faithful to v3 — safety is everyone's job).
- **Primary surface(s):** **phone is the floor** (a hazard gets logged from wherever it's spotted). Tablet/laptop add the ICS-208 export + review depth; broadcast shows a read-only hazard board.

## Information hierarchy (above / below fold) — per surface

### Phone (the floor)
- **Above fold:** **Add Hazard** (the canonical action — anyone can log what they see); the **open hazards**, sorted by severity then recency.
- **Below fold:** mitigated hazards (de-emphasized); the ICS-208 export.

### Tablet / laptop
- **Above fold:** the full register as a denser list with severity columns; the **ICS-208 export** foregrounded; laptop is the natural after-action review surface.

### Broadcast TV (read-only projection)
- A read-only **hazard board** — open hazards by severity at ≥ 32pt; no Add, no overlays, no animation.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **Add Hazard** — a [`sheet`](../03-primitives/sheet.md) (the v3 modal re-homes to a sheet per ADR-016).
- **Secondary actions:** **mitigate / reopen** a hazard; **ICS-208 export**; filter by severity/area.
- **Destructive:** none in the common path (mitigate is reversible — reopen).

## Composed primitives

- [x] [list](../03-primitives/list.md) — the hazard register (open first by severity, then mitigated).
- [x] [sheet](../03-primitives/sheet.md) — **Add Hazard** (type / location / severity / notes); a hazard's detail/mitigate sheet.
- [x] [badge](../03-primitives/badge.md) — the **severity** badge (low / medium / high) and the **hazard type**; the **mitigated** state; the **hazard indicator badge that rides shore-point cards** ([`card.md`](../03-primitives/card.md)).
- [x] [button](../03-primitives/button.md) — Add Hazard; **ICS-208 export**; mitigate / reopen.
- [x] [empty-state](../03-primitives/empty-state.md) — "No hazards logged" (all-clear variant).
- [x] [input](../03-primitives/input.md) — the Add-Hazard fields (location text, notes) inside the sheet; a severity/area filter.
- [ ] picker · card · modal · toggle · segmented · slider · toast · loading-state · nested-checklist · warning-gate (not core; note the `warning-gate` is the *RecommendationCard* safety disclosure, a different concern — the hazard badge here is a `badge`, not a WarningGate).

## The hazard record

Faithful to the v3 schema:
- **Type** — Structural Instability · Utility · Atmospheric · Fall · Other.
- **Location** — required free text (the area/where).
- **Severity** — Low / Medium / High (a [`badge`](../03-primitives/badge.md), with text — never color alone, Principle 9).
- **Notes** — optional.
- **Reported by + at**, **Mitigated by + at** — attributed (the role + timestamp; under D7 this is the user, [`accessibility.md`](../07-design-system/accessibility.md)/audit). Open hazards sort first by severity then recency; mitigated drop to the bottom.

## Two things v4 adds (v3 lacked both)

1. **ICS-208 export.** The register exports to the ICS-208 Safety Message/Plan form (a [`button`](../03-primitives/button.md) action) — v3 only kept hazards in the archived-op snapshot with no formal export. (The doctrine-form export pattern is shared with the after-action/audit work.)
2. **Hazard badges on shore-point cards.** A hazard's **location ties it to an area**, so a shore point in a hazarded area shows the [`card.md`](../03-primitives/card.md) **hazard badge** — v3's hazard data was isolated to Command. The badge is **visible information, not a gate** (below). **v4.0 matching rule (decided):** resolve the free-text location to a **Division** and badge every SP card in it; if it can't resolve to a Division, show the hazard in the log + header only, **never** on the wrong card — structured per-area precision is Phase H (see the [`21-hazard-log.md`](../09-workflows/21-hazard-log.md) workflow).

## No safety-hold (Principle 10 / synthesis Q2)

The Safety Officer surfaces hazards **visibly** — on this screen, in the persistent header, and as the shore-point badge. The app **never gates advancement** on a hazard: there is **no `safety-hold` status**. A safety stop is a radio/face-to-face action; the app's job is to make the hazard impossible to miss, not to become the control that halts work. The hazard badge informs the slide-to-advance decision; it never blocks it.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — log + view + mitigate all work phone-only.
- [x] **No safety-hold / no comms / no push** (Principle 10) — visible, never blocking.
- [x] **NIMS terminology** — ICS-208 naming; spelled-out roles ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- [x] **Color never alone** — severity is a badge **with text** (Principle 9).
- [x] **Tap geometry** — 56pt Add-Hazard + rows; 8pt dead zones.
- [x] **Modal-vs-sheet** per the ADR-016 Hazard Log row: Add Hazard = sheet; export = sheet/direct (no destructive overlay in the common path).
- [x] **Visible safety** — hazards are never buried; they ride SitStat, the header, and the SP card (Principle 7).
- [x] **Persistent Safety Officer + OP header** — this screen is the header's destination.

## The four-surface table (this screen)

| Dimension | Phone | Tablet | Laptop | Broadcast |
|---|---|---|---|---|
| Layout | Add + open-first list | denser register + export | review surface + export | read-only hazard board |
| Above fold | Add Hazard + open hazards by severity | full register + ICS-208 export | register + export + filters | open hazards by severity |
| Primary-action affordance | Add Hazard sheet | Add Hazard sheet | Add + keyboard | — (read-only) |
| Added | — | export foregrounded | after-action review | — |
| Does NOT render | — | — | — | Add, mitigate, export, overlays |

## Empty / error / loading states

- **Empty — no hazards:** the all-clear [`empty-state`](../03-primitives/empty-state.md) — "No hazards logged" (a calm success state, not an alarm); Add Hazard remains available.
- **Error:** a failed write queues locally (sync indicator); export failure resolves inline; never `alert()`.
- **Loading:** local-first — the register renders instantly; the ICS-208 export is the only real wait → determinate ([`loading-state.md`](../03-primitives/loading-state.md)).

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**
- Each hazard row announces *type · severity · location · status* ("Structural Instability, High, Division 2, open"); severity is text + badge, not color alone ([`accessibility.md`](../07-design-system/accessibility.md) §Screen-reader scripts).
- The Add-Hazard sheet is focus-trapped with labeled fields; the type/severity pickers get a Power Select native `<select>` fallback under VoiceOver/TalkBack-or-Settings.
- The shore-point hazard badge announces "hazard in area" as text on the [Operations](20-operations.md) card (it's the same `badge`, announced, never color-only).

## Open questions (per-screen)

1. **Hazard ↔ area binding** — whether a hazard ties to a free-text location (v3) or to the structured building→division→area drilldown so the SP-card badge maps precisely; resolved alongside the [Operations](20-operations.md) drilldown + the Phase G hazard-log workflow.
2. **ICS-208 export format** — the exact export (PDF form vs. structured data) is shared with the after-action/audit export work ([#211](https://github.com/Vergo402/paratech-struts/issues/211)); finalized there.
3. **Per-area badge propagation** — how a mitigated hazard clears the SP-card badge (immediately vs. on confirm); affordance detail for the Phase G workflow.
