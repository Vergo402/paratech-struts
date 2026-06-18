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

**Focus card (selected state):** border becomes `--accent` at 60% opacity, background `--surface-card-hover`. **No size change, no scale animation** — scale/zoom on cards during an operation is nauseating when the user is watching a live list. The focus signal is border + fill only. (The styleguide class is `is-focus` — deliberately *not* `is-active`, to avoid colliding with the "Equipment Assigned" lifecycle status.)

Elevation discipline: **shadows are for sheets and modals, never cards.** A card that floats (rare) uses the 1pt top inner highlight to simulate a lifted lip. (Sunlight theme is the one exception — cards there gain a 2pt offset shadow because glare washes edges flat; see [`color.md`](../07-design-system/color.md).)

---

## `ShorePointCard` — the lifecycle card

The shore-point object moves through the seven v4 states (`pending → process → strutset → cutting → runner → secured → returned`, displayed Pending Equipment → Equipment Assigned → Strut Set → Cutting Station → Runner → Wood Shore Secured → Strut Equipment Returned; see [`color.md`](../07-design-system/color.md) status palette). The card is where that lifecycle is read and advanced.

### Deployed strut — carried cradle to grave

Once a strut is deployed, the card carries the **deployed-strut identity** through every state until equipment is returned: the **model** (mono — e.g. `AT 37-58`, or `LS 203 + 12"` with extensions) and the **apparatus it came from**. This is the operational thread — at any point the team can see *what strut is in this hole and where it came from*. It appears from **Equipment Assigned through Strut Equipment Returned**; **pending** shows no strut (nothing deployed yet), and the off-queue red-slash state suppresses it. (Faithful to v3, which renders the model + `Equipment from: <apparatus>` on every deployed card.)

**The apparatus is a caption under the location** (S12), not a sub-line under the model: the source (`deployedStrut.source` — "from Rescue 2", external / mutual-aid as "External · Dept 14") sits on its own tertiary line in the identity column beneath the division/building/area, and the strut block below carries **the model only** — the duplicate "from X" sub-line is gone. External / mutual-aid equipment is still flagged for return to the right agency by that caption.

### The left-edge status stripe — and its hidden tap zone

The card's left edge is a **4pt status-color stripe** (the `--status-*` color for its current state). This is the at-a-glance status read across a tablet board.

**The tap zone extends past the visible stripe to the full card height, 16pt wide (synthesis §3.1).** The visible color is 4pt; the *tappable* region is 16pt × full-card-height and triggers the card's primary action. This is the single most consequential mobile-UX call in the corpus: it falls exactly in the right-thumb wrap zone when the phone is held one-handed, so the IC reaches **any** card's primary action on a long list **without a grip shift** (the Apple Maps drag-handle-as-tap-target pattern). The card layout does not change; only the stripe's hit area grows.

The stripe color is **redundant**, never the sole status signal (Principle 9): the card also shows a status **badge with its label as text** (see [`badge.md`](badge.md)) and the status name.

**Stripe hue across themes.** The stripe renders the status's *saturated identifying hue* in every theme — the status **text** color in light / dark / broadcast, and the **solid fill** in the sunlight theme (where the status text is white, for the banner, so the text color can't carry the stripe). The status identity is the same in all four; only the source token differs. This is now a real token, **`--sp-solid`** (S12), minted on the `.is-{status}` hooks beside `--sp-text` / `--sp-bg`: in light / dark / broadcast it resolves to the status text hue, and the sunlight theme remaps it to the solid banner *fill* hue so the stripe stays the status color on the all-white card. The stripe `::before` reads `--sp-solid`, which is why the sunlight stripe is no longer a placeholder (it closes the gate-script's sunlight-stripe gap — see [`color.md`](../07-design-system/color.md) §`--sp-solid`). The same hook drives the value shelf, the waiting callout, the grouped-stack tabs/dots, and the tablet status-summary dot — every place a status hue must survive sunlight's white card.

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

The slash runs **corner-to-corner — upper-right to lower-left — contained within the card** (it does not extend past the card edges via a non-scaling stroke), at a weight heavy enough to read as a deliberate strike (≈5px, `--danger`). The card body dims to ~45% beneath it; the **"Removed from cut list"** label sits centered over the slash in `--danger` on a small chip so it stays legible across the line, and the pending action area + slide rows drop. **In sunlight the slash and chip flip to the solid red** (`--danger-bg`): there `--danger-text` is white and would vanish on the white card, so the stroke and chip ink take the saturated fill instead. **In v4.0 the `removed` prop is presentational only** (S12) — no slice schema state drives it yet; the gallery and the future cut-list workflow ([#222](https://github.com/Vergo402/paratech-struts/issues/222)) set it.

### The headline — "label · type"

The card's title is **one headline**: the point label and its shore type joined with a middle dot — **"B-2 · 3-Post"** — at `--type-headline-2` (20/600), with the location line and the apparatus caption beneath it (full S12 design audit; the design-system ShorePointCard title). A point with no label titles as the bare type. The shore type **no longer rides the meta row** — it is identity, not metadata.

### The created-order number tab ([ADR-029](../11-decisions/ADR-029-shore-point-number-tab.md))

The card carries its **created-order number** — `#7` — as a **top-left corner tab** (notched into the card's rounded corner; the header gets top clearance so the headline never underlaps it). The number is the crew's **stable radio handle**: assigned once at creation as `max(existing)+1` so it **survives deletion** (delete `#3` and the next add is still `#4`, never a reused `#3`), and **shared across a grouped shore's members** — one physical shore = one number; the group badge (`1 / 3`) tells its struts apart. The number is text (identity is never color-only — Principle 9), in `--font-mono` tabular figures, and scales to 3 digits (Surfside scale).

**The tab is tinted by the deployed strut's system** — it is a **ghost outline while no strut is assigned**, then **fills** with the strut's system color once deployed: **gold** (`--accent`, LongShore), **grey** (`--text-secondary`, AcmeThread), **LockStroke-cyan** (`--sys-lockstroke`). Outline-vs-fill is the key: it keeps a *Grey-system* point unmistakable from a *pending/no-strut* one (both would otherwise read grey), and the fill "lighting up" signals the point is now equipped. The system key is resolved from the deployed model via `strutSysKey` (`struts.ts`, shared with `RecommendationCard`). Inks are theme-paired for AA across all four themes (`wcag-contrast.mjs`); the grey fill collapses to black in sunlight (no mid-gray there). System-tint was Alex's call over a neutral marker; the ghost-when-pending mitigation is what makes it safe (full rationale in [ADR-029](../11-decisions/ADR-029-shore-point-number-tab.md)).

**Deleting a point keeps its number** ([ADR-030](../11-decisions/ADR-030-recoverable-shore-point-delete.md)). A confirmed delete is a *soft* delete: the card leaves its lane and collects in the board's collapsed **Deleted** section as a slim row (its `#N`, `label · type`, location, and a one-tap **Restore**). Restore reclaims the original number — the gap the deletion left (`#1 #2 #4`) is recoverable, which is the bargain that makes ADR-029's never-reuse numbering safe. This is distinct from the off-queue **"Removed from cut list"** red-slash above (the `removed` prop, #222) — *deleted* = gone from the operation but restorable; *removed* = regressed off a work queue.

### The meta row — group badge, status

The header's right-hand meta column carries, in order: the **group badge** when the point is one strut of a grouped physical shore, the **status badge**, and the hazard pill (below). The **group badge is a mono tabular-figure pill** (S12) — `"1 / 3"` in `--font-mono` with `tabular-nums`, a quiet `--surface-elevated` fill and hairline border, no status-colored fill — so the member index reads as a precise counter, not a second status chip. (See [`badge.md`](badge.md) for the badge variants; the group badge is the `label` variant, restyled mono in the card's meta scope.)

### Active + caption (presentational)

`active` draws the **accent focus border** — selected/focus styling, never a scale change (styleguide States doctrine). `caption` renders a small tertiary explainer line under the controls (the design-system demo uses it for slide-behavior notes). Both are presentational props with no slice schema state.

### Hazard badge

When the shore point's area has **unmitigated hazards** (the hazard log, synthesis §1.10), the card shows a **"⚠ Hazard" pill** — the danger pair (`--danger-text` on `--danger-bg`) at badge emphasis, after the status badge. The Safety Officer surfaces hazards; the app **does not** gate advancement on them (no `safety-hold` status — safety holds are a radio/face-to-face action, synthesis Q2). The badge is visible information, not a block. **In v4.0 the `hazard` prop is presentational only** (S12) — no slice schema state drives it yet; the gallery and the future hazard-log workflow set it. (Sunlight resolves the danger pair to white-on-solid-red, already the correct banner read.)

### The lifecycle value shelf (Treatment C — the KB-6 answer)

The card's one big number is the **measurement value shelf** — a full-bleed, status-tinted row that runs corner to corner across the card (its negative margins exactly cancel the card padding, then it re-pads its own content back in). It is the resolution of the KB-6 "cards read bland" kick-back: a B-class treatment would have tinted the whole card surface and needed an ADR-011 amendment; the shelf is the **C-class middle** — the status hue tints a *region*, not the surface, so the one-accent rule holds while the number finally pops at arm's length (recorded in [ADR-011 Addendum 2](../11-decisions/ADR-011-color-token-system.md)).

**The shelf number is the effective length in every phase; only the LABEL changes** (#248 Design 2 re-drive — amends the S12 "one length that matters" framing per Alex's direction). Pre-cutting the shelf is the **Required strut length** (the cut-to answer), and a **detail line above it** carries the v3 dual-length context — **Raw opening + (−total deduction) + load**:

| Status | Shelf label | The shelf number is… | Detail line above the shelf |
|---|---|---|---|
| `pending` / `process` / `strutset` | **Required strut length** | the effective length (raw − deductions, floored to ⅛″ per [ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)) — the cut-to answer | **Raw opening** (`measurementEighths`) + the total deduction in parens + the estimated load (`Raw opening 48″ (−3½″) · 0 lbs`). The deduction is rendered to the nearest ⅛″ (exact spec stays in the math, ADR-012); the `(−…)` segment is omitted when zero (v3 behaviour). |
| `cutting` / `runner` | **Cut length** | the *effective* length — the number the cutter cuts to | — (none; the shelf number IS the cut length) |
| `secured` / `returned` | **Set length** | the *effective* length the strut was set to (S12 SME review: showing the raw opening here would mislabel the setting) | — (none) |

> **#248 re-drive — restoring the v3 dual-length card.** v3 showed both lengths on every pre-cut card (`81" → Eff: 67⅛" (−13¹³⁄₁₆") @ 0 lbs`). The S12 shelf showed only one ("the one length that matters"); the re-drive brings the pair back as a promoted **Required strut length** shelf + a **Raw opening / deduction / load** detail line above (`.fs-spc-detail`). Terminology stays v4 ("Raw opening" = measured opening; "Required strut length" = after deductions). Recorded against [ADR-011 Addendum 2](../11-decisions/ADR-011-color-token-system.md).

The number always renders in **`--sp-solid`** (the saturated status hue, sunlight-safe) in mono tabular figures; the label stays muted. The tint is built from `--sp-solid` via `color-mix`: **13% over the card** in light/dark, **10% on white** in sunlight, **18%** in broadcast; the top/bottom hairlines mix **22%** into the stroke. Color is never alone — the label words the phase and the badge carries the status text.

### Cut-table emphasis

In the **`cutting` state** the value shelf is **promoted**: the **cut length is the one number the cutter reads** at the Cutting Station, so the number jumps to **28px / 700** (the diagonal fraction scales with `font-size` automatically — no per-size re-derivation, [ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md)) while the shelf's status tint, label, and `--sp-solid` ink carry over unchanged. It stands out at a glance without becoming a separate box or alarm — emphasis through size + weight on top of the same status-tinted shelf. (This is the v3 "cut length stands out" behavior, now landed as a real promotion, not a deferral.) Every other state keeps the shelf number at the body-lg mono size; the 28px/700 promotion is specific to the cut-table moment.

### Pending Equipment — no strut deployed yet (and its "waiting" reason)

**Pending Equipment is the pre-deployment state: the shore point is measured (length + load recorded) but no strut is deployed.** v3 confirms a point only *becomes* pending when a strut can't be deployed at save time. Crucially, pending is **not** advanced by a slide — the action is **Deploy / Assign Equipment**, because reaching Equipment Assigned *means* a strut was deployed. The card:

- Shows **"No equipment assigned"** + a **waiting callout**, then one primary action: **"Assign Equipment"** (a deploy action, full-width, process-blue) — **not** a slide-to-advance. (Faithful to v3, where the pending card shows an Assign Equipment button, never a status slider.)
- **"Waiting for inventory" is a *reason*, not a separate state.** v3 stores `pendingReason` — `no-match` (inventory exists but nothing fits the length + load) vs `no-inventory` (no apparatus stock to pull from at all). When a reason is present, v4 surfaces it as a **waiting callout** (S12): a waiting-tinted box (`--sp-bg` ground, `--sp-solid` border) with a clamp/strut glyph, a **bold title** per reason ("No matching strut" / "Waiting for inventory") over the **verbatim reason copy** beneath it ("No matching strut — nothing fits this opening at this load" / "Waiting for inventory — no apparatus stock to pull from"). Same card, same Assign action; only the reason differs, and a pending point with no reason shows no callout. (v3 stored the reason but never displayed it; v4 finally shows it, framed.) The reason is live — it appears and clears as inventory changes (the board computes it, never persists it).
- **The waiting card presents AMBER** (full S12 design audit — the styleguide's waiting card). A pending point with a reason swaps its whole status presentation to the **waiting family** (`--status-waiting-*`, the `.is-waiting` hook riding beside `.is-pending`): the badge reads **"Waiting"**, and the stripe, value shelf, callout, and rolodex tabs/dots all take the amber. **Waiting is a presentation of pending, never a lifecycle status** — lanes, lockstep, and the reducer see only `pending`. Sunlight waiting is the one authored **pale-fill exception**: dark amber ink on pale amber, not a white-on-solid banner (the void speaking, not a lifecycle banner; the ink darkened from the design's value to clear sunlight's 7:1 contract — see `wcag-contrast.mjs`).
- Uses the **pending status hue** like any pending point — *not* a separate gold "Waiting" badge/state. An earlier v4 pass split these into two cards (pending vs a gold "Waiting" state); that conflated a reason with a state and was reconciled back to v3's single pending model.
- Keeps the shore-point identity (name, area, **Raw opening** + load) so the point is actionable the moment equipment arrives.
- Clears when a strut is assigned: Assign Equipment deploys and advances the point to **Equipment Assigned** with the strut attached. (At v5 federal scale a resource request would tie in here — out of v4.0 scope.)

### The grouped rolodex stack (`GroupedShorePoint`)

A grouped physical shore (KB-7: one 3-Post = three points sharing a `groupId`, one card per strut) would clutter a lane with three near-identical cards. The board collapses same-`groupId` members within a lane into one **rolodex stack** (S12) rather than showing them all. The stack is a composition *of* `ShorePointCard`s — it never re-implements card internals; each member is the same interactive card the board renders for a singleton, with that member's own `sp`, group gate, and slides. This section owns the card-side view; the **board-side rule** (which members stack, when a group splits across lanes) lives in [`20-operations.md`](../08-information-architecture/20-operations.md) §Grouped shore points.

**Collapsed — the pile.** The active member's full card sits up front; the others fall **left** as **30px sliver tabs**, each a real `<button>` carrying that member's `--sp-solid` status stripe and a vertical "Post _n_" label reading bottom-to-top along the sliver. Tapping a tab brings that member to the front with a short **220ms cyclic roll** (the old front rotates to the bottom of the pile; direction follows the shorter way round, and `prefers-reduced-motion` drops the animation — the card still swaps). Beneath the front card, **status-tinted pager dots** (one per member, `--sp-solid`, the active one elongated) are `aria-hidden` decoration.

**The "_n_ cards" chip stays banned as the primary affordance.** A grouped stack must not advertise itself as a bare count the operator can't act on. Expand is offered two ways instead: a **dead-space tap** on the front card (a `closest()` guard keeps slide thumbs, the stripe button, and other controls from triggering it — the pointer convenience) and a **quiet chevron-down `<button>` beside the dots** (the keyboard/AT-canonical control, 40px hit area). *(Reality note: the count `· N cards` does appear as a passive **label** in the expanded header title — it is descriptive there, never the collapsed entry point. The KB-7 framing is "_N_ struts of one physical shore"; the in-code label currently reads "cards" — flagged for the copy pass.)*

**Expanded — the indented list.** Expanding swaps the pile for a **2px border-left indented column** of every member's full card (a 45ms-staggered entrance, reduced-motion-safe), headed by the group title and a **"Stack" pill** (chevron-up) that collapses it back. Now every member is reachable and advanceable at once.

**Scroll-into-view / front member.** Every member carries `data-sp-id` on the front wrapper, its tab, and its expanded row, so the board's scroll-target query resolves to the right element whichever form the stack is in. When a commit lands a group in a lane the board scrolls there and **fronts the just-committed member** (the stack mounts with `initialActiveId` set to the scroll target) — the operator lands looking at the piece they just moved, not at member 1.

---

## `RecommendationCard` — the result card

The output of Quick Find / shore search, and the card you Deploy from during an operation. **This card is grounded in the actual v3 deploy card** (`renderResults()`), not a simplification — it carries the full, safety-critical anatomy below, top to bottom. The S12 restyle gave it a **centered identity header** — the deliberate visual split from the left-aligned `ShorePointCard`, so the two never read as the same object (Principle 12).

### Card anatomy (top → bottom)

1. **Centered identity** — **`<Word> · <model>`**, e.g. **"Gold · LS 203"**, **"Grey · AT 37-58"**, **"LockStroke · LK 30-2"** — the system word in the **system color** (bold), the model beside it (`--type-headline-2`); the product/type name is off the face (the Deploy button's SR label keeps the full identity). The word is keyed off the strut **system**, not its raw color, so a physically-grey LockStroke strut earns its own **cyan** word (see the LockStroke note below). Centered, with the fit badge floated top-right *outside* the centering flow so it never shoves the identity off-center.
2. **Connectors line** — the selected top/bottom plate **names** joined " · " (from the SP's deduction selections), directly under the identity; omitted when neither plate is selected.
3. **Apparatus line** — **"Equipment located on: `<rig>`"** (labeled per Alex, post-S12), one weight heavier (600) than location, operation-mode only (Quick Find omits it).
4. **Location** — the optional shore-point identity (division · building · area), operation-mode only.
5. **Fit badge** (top-right) — **"Fits"** as a process-status pill, or the gated **danger** variant **"Unrated"** / **"Over capacity"** (resolves [99-OQ #40](../99-open-questions.md) — the unmistakable danger tell; see below).
6. **Extension block** — either **"No extensions needed"** (in the secured **green**, a positive signal) **or** the design-system ext anatomy (full S12 design audit): a **34px accent `[+]` tile**, the **added length over the word "extension"** (`12″` bold, the word quiet), and the **reach note** — *"LS 304 alone reaches 50″ — extension takes the assembly to 62″"* (bare strut reach vs assembly reach, plain numbers). Extensions are color-matched tubes the operator must also grab; the note is "what extra tube to grab and why." *(Replaces the S6 chip row + "strut alone" range line — the same information, stated as a sentence.)*
7. **Deduction ledger** — *the most important part* (see below).
8. A primary **Deploy** button (operation mode only; Quick Find omits it), then a **quiet rated-capacity footer**, then the permanent disclaimer (see Capacity, below). The apparatus source lives on header line 3 ("Equipment located on: …"), so there is no separate footer line for it.

**The left accent bar IS the strut color** (Principle 9: color named *and* shown). The strut color bar is identity, not lifecycle status — gold maps to `--accent`, grey to the secondary ink, and **LockStroke to its own cyan token** (`--sys-lockstroke`).

> **LockStroke is keyed off the strut *system*, not its color.** Every LockStroke model is physically grey, so coloring it grey would make it indistinguishable from AcmeThread on the face. Instead the LockStroke identity word, the left bar, and the fit/LockStroke tells take **cyan** (`--sys-lockstroke`) — the opposite pole from the brand gold and unmistakable from grey on screen. Cyan is a **strut-system identity** color, not a second UI accent (the one-gold-accent rule still binds all chrome — [`color.md`](../07-design-system/color.md) §System colors / [ADR-011 Addendum 2](../11-decisions/ADR-011-color-token-system.md)).

### The deduction ledger — fixed order, "N/S" when unselected

The ledger shows the **Raw opening → Required strut length** math and the four component slots that produce the total deduction. **The slots ALWAYS display top-down in physical order** (a v4 correction to v3's wood-then-plates grouping). **There is no "Deductions" section title** (S12) — the signed rows are self-describing, so a heading would be noise:

```
Raw opening                                   56"
  Header                                     −3½"
    4×4
  Top Connector                              −3⅜"
    Channel Base 4×4
  Bottom Connector                           −3⅜"
    Channel Base 4×4
  Footer                                     N/S       (red)
    not selected
  ─────────────────────────────────────────────────
Required strut length                        45 5/8"
```

Each slot is **label + signed deduction value on one line** (values align in a right column, the value side never wraps), with the wood size / plate name on a **sub-line beneath** — so a long plate name never wraps and shoves the value column out of alignment (the v3 mid-column wrap problem). The deductions read as **signed measurements** — `−3½″`, never "deducts 3.5″".

- **Ledger vocabulary** (S12): the top row is **"Raw opening"** and the total is **"Required strut length"** — the same words the [`DeductionPicker`](../03-primitives/input.md) speaks in Add Shore Point, so the read-only result card and the editable picker name the same quantities identically.
- **Order is rigid: Header → Top Connector → Bottom Connector → Footer** (top of the assembly to the bottom). Never reorder or alphabetize.
- **Every slot is always shown.** If a section is unselected, it renders **"N/S"** (not selected) in `--danger` so the gap is obvious at a glance — v3 silently omitted unselected slots; v4 surfaces them (visible state, Principle 7/10). The omission of a footer or a connector is a decision the operator should *see*, not infer.
- `Header` / `Footer` are wood (`WOOD_SIZES`: 4×4 = 3½″, 6×6 = 5½″) — exact eighths. `Top Connector` / `Bottom Connector` are base plates (`BASE_PLATES`, each with a `height` deduction); the sub-line shows the plate name. **Plate deductions display as the nearest-1/8″ fraction** (e.g., `3⅜″` for a 3.4″ plate) so the column reads as one consistent fraction set, **but the exact spec (3.4″) is used in the math** ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md); pre-rounding specs *in the math* would accumulate unsafe error). *(The on-card `≈` markers + the "≈ … exact … used in the math" footnote were removed in the #248 re-drive declutter — display-only; the exact-spec math is unchanged.)*
- Raw opening and Required strut length are emphasized (`--type-mono`); **Required strut length is promoted (larger, in the strut color) — it is the cut-to answer.** It **floors DOWN to 1/8″** ([ADR-012](../11-decisions/ADR-012-measurement-precision-eighth-inch.md)): short is taken up by wedge + strut thread, long is unsafe. *(The visible `↓ floored to 1/8″` note was removed in the #248 re-drive declutter — the flooring behavior is unchanged.)* Fractions render as diagonal fractions via the value font per [`typography.md`](../07-design-system/typography.md) / [ADR-028](../11-decisions/ADR-028-inter-numerals-diagonal-fractions.md) — not `42 3/16`, and not the illegible `42³⁄₁₆` codepoint hack.

### Capacity — the quiet footer, and the safety gates

- **Rated capacity is computed and available but never leads the card** (synthesis §3.4 — demoted; it was a vehicle-stabilization aid, not the shoring core). S12 lands it as a **quiet footer demoted below Deploy**: a full-bleed shelf reading **"Rated capacity at {effective}"** with `floor(combo.capacity)` lb in muted tertiary ink — it sits *under* the Deploy button and *above* the permanent disclaimer (which stays the card's final word). It is **suppressed on a gated card** (unrated or over-capacity) — a gated card has no honest number to print (0 for unrated; the per-strut best is meaningless once load exceeds 4-strut capacity). The load tables / conservative-floor engine are unchanged; this is display-prominence only.
- **The fit badge is the gated danger tell** (resolves [99-OQ #40](../99-open-questions.md)). On a clean card it's a calm process-status **"Fits"** pill, top-right; on a gated card it swaps to the **danger pair** and reads **"Over capacity"** (which wins over) or **"Unrated"** — an accent and a word, never a full red fill (Principle 3). The whole card's left bar also goes to `--danger` (`is-gated`), so a dangerous option is visually distinct from a deployable one *before* the Deploy tap.
- **Safety disclosures ride the result as the [`warning-gate`](warning-gate.md), never a toast.** An unrated-zone reach (LongShore > 16 ft), an over-capacity load (the qty>4 / 4:1 sentinel), and the standing *"Planning aid, not an engineering certification"* disclaimer render as the **persistent warning gate** on the `RecommendationCard` — inline, and they **never auto-dismiss** (Principle 7; copy in [`voice-and-tone.md`](../07-design-system/voice-and-tone.md) §Warnings). The unrated zone additionally **gates Deploy behind an explicit acknowledgment**; over-capacity **closes the Deploy path outright** (the button is disabled, no override).

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

- A tappable card is a real button (or `role="button"` + `tabindex="0"`) with an accessible name describing the object and its state ("Shore point B-2, Cutting Station, area Division 2").
- **The slide-to-advance gesture is the ONLY status commit path** ([ADR-026](../11-decisions/ADR-026-slide-only-status-commit.md) — the recorded exception to *assistive tech cannot slide*). No Advance/Step-back buttons, visible or AT-only. Assistive tech reads every card and hears every transition (below); it does not drive the lifecycle. Deploy/return/End-Op stay fully operable buttons/modals.
- **`aria-live="polite"`** announces status changes: "Shore point B-2, now Cutting Station." Reversal announces likewise.
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
