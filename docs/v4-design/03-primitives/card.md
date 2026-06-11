# UI Primitive: The Card

> Phase E primitive spec. The **gate primitive** — reviewed alongside [`color.md`](../07-design-system/color.md) and [`typography.md`](../07-design-system/typography.md) before the rest of the system cascades. Authored at the depth of [`picker.md`](picker.md).
> Source: essay [`05-essays/02-visual-language.md`](../05-essays/02-visual-language.md) "Card" + [`06-synthesis.md`](../06-synthesis.md) §1.5, §1.6, §3.1, §3.2, §3.4. Reconciled against Alex's PR #282 review — four of his changes land on this primitive (status-stripe tap zone, red-slash off-queue state, inline deduction ledger + capacity demotion, slide-to-advance). The status-commit model is governed by [`ADR-010`](../11-decisions/ADR-010-status-commit-model.md).

---

## Purpose

A card is a bounded, tappable surface holding one object — a shore point, a strut recommendation, an apparatus, an operation. It is the most-used primitive in FieldShore and the one the IC and team officer touch hundreds of times an incident.

v4 has **one base card** with a small set of variants and **two domain specializations** that exist because a shore point is not a search result and must not look like one (Principle 12 — structural collapse is a different data class):

- **`ShorePointCard`** — a live object moving through the seven-state lifecycle. Carries status, the slide-to-advance commit, hazard state, and the off-queue red-slash state.
- **`RecommendationCard`** — a strut/shore search result. Carries the inline deduction ledger; capacity is present but demoted.

The synthesis named the collapse of these two into one card (v3's behavior) as a predicted tear at scale (§2.7, §3.2). v4 ships both.

---

## The variants

| Variant | When | Example | Min height | Elevation |
|---|---|---|---|---|
| **Base card** | Any single object, tappable | Apparatus card, operation card, settings group | 56pt (44pt WCAG floor) | 0 (rest) — stroke + 1pt top inner highlight |
| **Status-bar card** | Object with lifecycle status | `ShorePointCard` in Operations | **60pt** | 0 |
| **Result card** | Search/recommendation output | `RecommendationCard` in Quick Find | content-driven | 0 |
| **Active / focus** | The currently-acted-on card | Selected SP, focused result | (variant's) | 0 — **no scale change** |
| **Off-queue (removed)** | A card that regressed off an active work queue | SP removed from the Cutting Station list | (variant's) | 0 + red-slash overlay |

All variants share the base shell; the table is which behaviors layer on.

---

## Base card — anatomy

| Property | Value | Token |
|---|---|---|
| Corner radius | 12pt | (the global card radius; see [`color.md`](../07-design-system/color.md) corner vocabulary) |
| Border | 1pt hairline | `--surface-stroke` |
| Padding | 12pt top/bottom, 16pt left/right | `--space-3` / `--space-4` |
| Background | card surface | `--surface-card` |
| Elevation (rest) | **no drop shadow** | 1pt top inner highlight at 6% (`inset 0 1pt 0 …`) — a lifted lip, not a shadow |
| Touch target | full width tappable | **56pt** min height for any tappable card (60pt for `ShorePointCard`); 44pt is the never-below WCAG floor, not a design target; any in-card **primary action ≥56pt** |

**Focus card (selected state):** border becomes `--accent` at 60% opacity, background `--surface-card-hover`. **No size change, no scale animation** — scale/zoom on cards during an operation is nauseating when the user is watching a live list. The focus signal is border + fill only. (The styleguide class is `is-focus` — deliberately *not* `is-active`, to avoid colliding with the "In Process" lifecycle status.)

Elevation discipline: **shadows are for sheets and modals, never cards.** A card that floats (rare) uses the 1pt top inner highlight to simulate a lifted lip. (Sunlight theme is the one exception — cards there gain a 2pt offset shadow because glare washes edges flat; see [`color.md`](../07-design-system/color.md).)

---

## `ShorePointCard` — the lifecycle card

The shore-point object moves through the seven v4 states (`pending → process → strutset → cutting → runner → secured → returned`, displayed Pending → In Process → Strut Set → Cutting → Runner → Shore Secured → Strut Equipment Returned; see [`color.md`](../07-design-system/color.md) status palette). The card is where that lifecycle is read and advanced.

### Deployed strut — carried cradle to grave

Once a strut is deployed, the card carries the **deployed-strut identity** through every state until equipment is returned: the **model** (mono — e.g. `AT 37-58`, or `LS 203 + 12"` with extensions) and the **apparatus it came from** (`from Rescue 2`, on its own sub-line beneath the model). This is the operational thread — at any point the team can see *what strut is in this hole and where it came from*. It appears from **In Process through Strut Equipment Returned**; **pending** shows no strut (nothing deployed yet), and the off-queue red-slash state suppresses it. External / mutual-aid equipment shows the source in the **runner/external hue** ("External · Dept 14") so it's flagged for return to the right agency. (Faithful to v3, which renders the model + `Equipment from: <apparatus>` on every deployed card.)

### The left-edge status stripe — and its hidden tap zone

The card's left edge is a **4pt status-color stripe** (the `--status-*` color for its current state). This is the at-a-glance status read across a tablet board.

**The tap zone extends past the visible stripe to the full card height, 16pt wide (synthesis §3.1).** The visible color is 4pt; the *tappable* region is 16pt × full-card-height and triggers the card's primary action. This is the single most consequential mobile-UX call in the corpus: it falls exactly in the right-thumb wrap zone when the phone is held one-handed, so the IC reaches **any** card's primary action on a long list **without a grip shift** (the Apple Maps drag-handle-as-tap-target pattern). The card layout does not change; only the stripe's hit area grows.

The stripe color is **redundant**, never the sole status signal (Principle 9): the card also shows a status **badge with its label as text** (see [`badge.md`](badge.md)) and the status name.

**Stripe hue across themes.** The stripe renders the status's *saturated identifying hue* in every theme — the status **text** color in light / dark / broadcast, and the **solid fill** in the sunlight theme (where the status text is white, for the banner, so the text color can't carry the stripe). The status identity is the same in all four; only the source token differs. (Captured in the styleguide as a single `--sp-solid` variable.)

### Slide-to-advance — the status commit model (governed by ADR-010)

Status advances by a **deliberate slide gesture, not a tap.** This is deliberate: wet screens fire ghost taps and gloves miss small targets (synthesis §1.5), so a tap is the wrong commit gesture for a safety-consequential state change. The operator slides the card's advance control to commit the next status.

- **Commit is immediate** and writes the new state to the event log.
- **Always reversible from the card.** An authorized user can step the status **back** at any time via the card's reverse affordance — there is **no time-limited undo toast.** A stray advance self-heals because reversal is always one gesture away. This *amends Principle 6's mechanism* (the 5-second undo toast) to spatial, always-available reversibility while preserving its intent (doubt-free escape, no "Are you sure?" modal) — see [ADR-010](../11-decisions/ADR-010-status-commit-model.md).
- **Reverse is a deliberate slide-back, not a tap, and shows no confirmation pop-up.** "Step back" is a secondary **slide** affordance that mirrors the forward slide **in the opposite direction** — the forward slide advances **rightward** (handle on the left); the reverse slides **leftward** (handle on the right). So reversing committed work is intentional and cannot fire from a stray tap, the gesture reads as "undo / go back," and it still never raises an "Are you sure?" modal (reversibility, not confirmation, handles regret). The *only* reversal that confirms is one that is itself **destructive/terminal or mutates inventory** (un-deploying a strut, un-returning equipment) — that hits a [`modal.md`](modal.md) confirmation, per the destructive-action rule above. The reverse affordance is visually secondary to the forward slide (smaller, lower-emphasis) — the next step is the canonical action (Principle 4).
- **Medium-impact haptic on commit**, light haptic on slide-start (see [`motion.md`](../07-design-system/motion.md)).
- **The track is the prominent, full-width primary action; its next-status label ("Slide to set Runner") is always fully legible — never truncated**, including on the phone (the floor surface). The reverse control ("step back") is a *secondary* affordance placed below the track, not competing for its width. (Surfaced in phone-view review — a side-by-side layout squeezed the label to "Slide to set Run…".)
- **The slide is the only commit affordance — no Advance / Step-back button twins on the card, visible or hidden** ([ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md), the Phase H KB-5 ruling). A gated slide shows its reason as a visible text line under the track ([`slider.md`](slider.md)).
- **Heavy confirmation is reserved only for destructive/terminal actions** — End Operation, or a return that decrements inventory. Those use a [`modal.md`](modal.md), never the slide. The everyday lifecycle advance never shows a confirm.
- **Grouped shore points:** pre-cutting transitions apply to all group members; the cutting workflow operates per-card (the v3.8.0/v3.9.0 phase-based split crosses verbatim). The slide on a grouped card pre-cutting advances the group; post-cutting it advances only that piece. Detailed in the Operations workflow (Phase G).

### Off-queue (removed) state — the red slash

When a `ShorePointCard` **regresses off an active work queue** — e.g., its status steps back out of `cutting` while it is shown in the Cutting Station list — the card **does not silently vanish** (Principle 10: visible state, not a silent change). It shows a passive **red diagonal slash across the whole card with "Removed from cut list" stated over the slash.** The operator sees *why* the card left the queue, then dismisses it from that view. Silent removal is forbidden — a card disappearing reads as data loss under stress.

The slash runs **corner-to-corner — upper-right to lower-left — contained within the card** (it does not extend past the card edges), at a weight heavy enough to read as a deliberate strike (≈4px, `--danger`). The card body dims beneath it; the "Removed from cut list" label sits centered over the slash in `--danger` on a small chip so it stays legible across the line.

### Hazard badge

When the shore point's area has **unmitigated hazards** (the hazard log, synthesis §1.10), the card shows a hazard badge. The Safety Officer surfaces hazards; the app **does not** gate advancement on them (no `safety-hold` status — safety holds are a radio/face-to-face action, synthesis Q2). The badge is visible information, not a block.

### Cut-table emphasis

In the **`cutting` state**, the **cut length is the one number the cutter reads** at the Cutting Station, so the card promotes it: the measurement value renders **larger and bold, in the status hue** (`--sp-solid`), while its label stays muted. It should stand out at a glance without becoming the loudest thing on the screen — emphasis through size + weight + the cutting color, not a fill or a box. (This is the v3 "cut length stands out" behavior, carried forward into the v4 card.) Other lifecycle states keep the measurement at the normal mono body size; the promotion is specific to the cut-table moment.

### Pending — no strut deployed yet (and its "waiting" reason)

**Pending is the pre-deployment state: the shore point is measured (length + load recorded) but no strut is deployed.** v3 confirms a point only *becomes* pending when a strut can't be deployed at save time. Crucially, pending is **not** advanced by a slide — the action is **Deploy / Assign Equipment**, because reaching In Process *means* a strut was deployed. The card:

- Shows **"⏳ No equipment assigned"** + a **reason line**, then one primary action: **"🔧 Assign Equipment"** (a deploy action, full-width, process-blue) — **not** a slide-to-advance. (Faithful to v3, where the pending card shows an Assign Equipment button, never a status slider.)
- **"Waiting for inventory" is a *reason*, not a separate state.** v3 stores `pendingReason` — `no-match` (inventory exists but nothing fits the length + load) vs `no-inventory` (no apparatus stock to pull from at all) — and the reason line surfaces it ("No matching strut — nothing fits 84″ at this load" / "Waiting for inventory — no apparatus stock to pull from"). Same card, same Assign action; only the reason differs. (v3 stored the reason but never displayed it; v4 finally shows it.)
- Uses the **pending status hue** like any pending point — *not* a separate gold "Waiting" badge/state. An earlier v4 pass split these into two cards (pending vs a gold "Waiting" state); that conflated a reason with a state and was reconciled back to v3's single pending model.
- Keeps the shore-point identity (name, area, **Required** length + load) so the point is actionable the moment equipment arrives.
- Clears when a strut is assigned: Assign Equipment deploys and advances the point to **In Process** with the strut attached. (At v5 federal scale a resource request would tie in here — out of v4.0 scope.)

---

## `RecommendationCard` — the result card

The output of Quick Find / shore search, and the card you Deploy from during an operation. **This card is grounded in the actual v3 deploy card** (`renderResults()`), not a simplification — it carries the full, safety-critical anatomy below, top to bottom.

### Card anatomy (top → bottom)

1. **`COLOR — SYSTEM`** — e.g. **"GOLD — LONGSHORE"**, **"GREY — ACMETHREAD"**, **"GREY — LOCKSTROKE"** (uppercase, in the strut color). The color is a real Paratech field-ID attribute — `gold` = LongShore, `grey` = AcmeThread / LockStroke — and it's how the operator physically finds the right strut in the cache.
2. **Model** — the real model number (e.g. **"AT 37-58"**, **"LS 203"**), `--type-headline-2`/700.
3. **Range** — the reach range, **large and in the strut color** (e.g. **"37″ – 58″"**). With extensions this is the *adjusted* range (strut + extensions); without, the strut's own collapsed–extended range.
4. **Extension block** — either **"No extensions needed"** (in the secured **green**, a positive signal) **or** **"Extensions: `12″`"** (chip per extension) followed by **"strut alone 26″ – 36″"**. Extensions are color-matched tubes the operator must also grab.
5. **Deduction section** — *the most important part* (see below).
6. **`Equipment from: <apparatus>`** + a primary **Deploy** button (operation mode only; Quick Find omits these).

**The left accent bar IS the strut color** (Principle 9: color named *and* shown). The strut color bar is identity, not lifecycle status.

### Deductions — fixed order, "N/S" when unselected

The deduction section shows the **Opening → Effective** math and the four component slots that produce the total deduction. **The slots ALWAYS display top-down in physical order** (a v4 correction to v3's wood-then-plates grouping):

```
Deductions
Opening                                       56"
  Header                                     −3½"
    4×4
  Top Connector                              −3⅜"     (≈)
    Channel Base 4×4
  Bottom Connector                           −3⅜"     (≈)
    Channel Base 4×4
  Footer                                     N/S       (red)
    not selected
  ─────────────────────────────────────────────────
Effective               ↓ floored to 1/8″    45 5/8"
≈ plate heights to nearest 1/8″ — exact 3.4″ used in the math
```

Each slot is **label + deduction value on one line** (values align in a right column), with the wood size / plate name on a **sub-line beneath** — so a long plate name never wraps and shoves the value column out of alignment (the v3 mid-column wrap problem).

- **Order is rigid: Header → Top Connector → Bottom Connector → Footer** (top of the assembly to the bottom). Never reorder or alphabetize.
- **Every slot is always shown.** If a section is unselected, it renders **"N/S"** (not selected) in `--danger` so the gap is obvious at a glance — v3 silently omitted unselected slots; v4 surfaces them (visible state, Principle 7/10). The omission of a footer or a connector is a decision the operator should *see*, not infer.
- `Header` / `Footer` are wood (`WOOD_SIZES`: 4×4 = 3½″, 6×6 = 5½″) — exact eighths. `Top Connector` / `Bottom Connector` are base plates (`BASE_PLATES`, each with a `height` deduction); the sub-line shows the plate name. **Plate deductions display as the nearest-1/8″ fraction** (e.g., `≈3⅜″` for a 3.4″ plate) so the column reads as one consistent fraction set, **but the exact spec (3.4″) is used in the math** — a footnote marks the plate rows approximate ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md); pre-rounding specs *in the math* would accumulate unsafe error).
- Opening and Effective are emphasized (`--type-mono`); **Effective is promoted (larger, in the strut color) — it is the cut-to answer.** It **floors DOWN to 1/8″** ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)) with a `↓ floored to 1/8″` note beside it: short is taken up by wedge + strut thread, long is unsafe. Fractions render via the digit-pair component (stacked) per [`typography.md`](../07-design-system/typography.md) — not `42 3/16`, and not the illegible `42³⁄₁₆` codepoint hack.
- **Rated capacity is computed and available but is *not* on the card face** (synthesis §3.4 — demoted; it was a vehicle-stabilization aid, not the shoring core). The load tables / conservative-floor engine are unchanged; this is display-prominence only.
- **Safety disclosures ride the result as the [`warning-gate`](warning-gate.md), never a toast.** An unrated-zone reach (LongShore > 16 ft), an over-capacity load (the qty>4 / 4:1 sentinel), and the standing *"Planning aid, not an engineering certification"* disclaimer render as the **persistent warning gate** on the `RecommendationCard` — inline, and they **never auto-dismiss** (Principle 7; copy in [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) §Warnings). The unrated zone additionally gates **Deploy** behind an explicit acknowledgment.

> **Lesson recorded:** the first v4 pass mocked a generic "Required − plate − plate = Effective" ledger and missed the real structure (color/system, range, extension block, the four ordered deduction slots, equipment source, Deploy). Result cards are safety-critical — the v4 card is built from the v3 `renderResults()` anatomy, not from the design essays' abstraction.

---

## Generic cards (apparatus, operation, settings)

Base card + content. An operation card leads with operation name (`--type-body-lg`) + status summary; an apparatus card with apparatus name + type + assignment. No status stripe (no lifecycle), no deduction ledger. They exist to keep "a bounded tappable object" consistent across the app — the v3 sin was the *same object looking different in five places* (see [`picker.md`](picker.md) Purpose).

---

## Universal rules (apply to every card)

1. **The whole card is the tap target** for its primary action; the 16pt left-stripe zone is a *secondary* reach for the same action, not a different one.
2. **One primary action per card** (Principle 4). Secondary actions live in a disclosure / long-press / overflow, never competing for the card face.
3. **No icon-only primary action** (Principle 9). A card's action has a text label or is the whole-card tap with a labeled outcome.
4. **No drop shadow** at rest (sunlight excepted). Elevation is stroke + inner highlight.
5. **No scale/zoom animation** on state change. Status badge cross-fades color (250ms); the card body does not move (see [`motion.md`](../07-design-system/motion.md)).
6. **Status is never color-alone** — stripe + badge-with-text + label (Principle 9).
7. **Reversibility, not confirmation.** Lifecycle advance commits immediately and is reversible from the card; only destructive/terminal actions confirm.
8. **List reorder is a snap, not an animated move** in v4.0 (animated reorders are expensive on long lists; the user just tapped sort).

---

## Surface adaptations

| Surface | Card behavior |
|---|---|
| **Phone (team officer)** | Single-column, full-width cards. The 16pt left-stripe tap zone is the one-handed-reach solution. Slide-to-advance is the primary commit. 60pt min height. |
| **Tablet (CP)** | Cards in a board/grid (the resource board). Status stripe carries the glance-across-a-room read. Active card may reveal more inline. Slide-to-advance still applies; a tablet also affords drag for priority reorder on the Cutting Station (Phase G enhancement). |
| **Laptop (Toughbook)** | Denser cards, **keyboard-navigable**: arrow keys move focus card-to-card, Enter opens. The slide-to-advance is **pointer-drag here too — no keyboard commit path** ([ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md)). |
| **Broadcast TV** | **Read-only.** 4pt left-border status accent, **no fill, no tap zone, no slide affordance** (broadcast renders no interactive primitives — see [`picker.md`](picker.md)). The SP name and measurement are the largest elements; status is the left border + label at ≥32pt ([`typography.md`](../07-design-system/typography.md)). No animation. |

---

## Accessibility floor

- A tappable card is a real button (or `role="button"` + `tabindex="0"`) with an accessible name describing the object and its state ("Shore point B-2, Cutting, area Division 2").
- **The slide-to-advance gesture is the ONLY status commit path** ([ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md) — the recorded exception to *assistive tech cannot slide*). No Advance/Step-back buttons, visible or AT-only. Assistive tech reads every card and hears every transition (below); it does not drive the lifecycle. Deploy/return/End-Op stay fully operable buttons/modals.
- **`aria-live="polite"`** announces status changes: "Shore point B-2, now Cutting." Reversal announces likewise.
- The **off-queue red-slash** state is conveyed by the real text "Removed from cut list" (announced), not the slash alone.
- **Color never alone** (Principle 9): stripe + badge text + status label; the deduction ledger labels every row in text.
- Touch targets: card ≥60pt (`ShorePointCard`), in-card primary action ≥56pt, 8pt dead zone between adjacent targets ([`spacing-grid.md`](../07-design-system/spacing-grid.md)).
- **Reduce Motion:** the status cross-fade becomes an instant swap; no card motion to suppress (see [`motion.md`](../07-design-system/motion.md)).
- Per-variant VoiceOver/TalkBack scripts are consolidated in [`accessibility.md`](../07-design-system/accessibility.md).

---

## Anti-patterns (do not do these)

- **Tap-to-advance status.** A safety-consequential commit must be a deliberate slide; wet-screen ghost taps would advance state. (Tapping the card opens it / triggers its read action; sliding advances.)
- **A timed "Undo (5s)" toast for a status change.** v4 uses always-reversible-from-the-card instead (ADR-010). The toast primitive is for confirmations/notifications only ([`toast.md`](toast.md)).
- **Silently removing a card from a queue.** Show the red-slash "Removed from cut list" state (Principle 10).
- **Leading a result card with rated capacity.** Capacity is demoted; the deduction ledger leads (synthesis §3.4).
- **Burying the deduction math in a disclosure.** It is inline, always (Principle 7 — visible safety).
- **Drop shadow on a card** at rest (sunlight excepted).
- **Scale/zoom/shake animation** on a card during operations.
- **Making `ShorePointCard` and `RecommendationCard` the same component.** They are different data classes (Principle 12); collapsing them is the predicted tear (§2.7).
- **Icon-only card action** (Principle 9).
- **A second primary action** competing on the card face (Principle 4).

---

## Open questions for the gate / downstream

1. **Exact slide mechanics** — full-card horizontal swipe vs. a dedicated slide-toggle control on the card. The *principle* (deliberate slide, immediate commit, always reversible, medium haptic) is fixed here; the exact gesture is finalized in the Operations workflow (Phase G) and proven in the vertical slice (Phase H).
2. **`returned` / terminal card de-emphasis** — beyond the warm-neutral hue, should a returned card reduce opacity or collapse into an archive group? Cross-ref [`color.md`](../07-design-system/color.md) OQ3; resolved in the Operations IA (Phase F).
3. **`ShorePointCard` vs `RecommendationCard` dedup in Operations** — how alternatives nest under a shore point (synthesis §2.7 resolution: group by shore point, alternatives nested). An IA decision (Phase F), not a primitive one.
4. **Grouped-card slide affordance** — how the group-vs-individual phase split is signposted on the card face. Finalized with the grouped-shore workflow (Phase G).
