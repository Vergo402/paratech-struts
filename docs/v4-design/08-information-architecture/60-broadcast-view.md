# IA Spec: Broadcast View

> Phase F information-architecture spec. Cites [`00-ia-foundation.md`](00-ia-foundation.md) for all cross-cutting rules and does not re-derive them.
> Source: [`06-synthesis.md`](../06-synthesis.md) §1.8 (four surfaces — "one event-log projection through four presentation adapters") + §2.7 (the dashboard tear → progressive-density adapters, "broadcast TV adds SP map + cutting queue"); **rec C-13** (the room board / SitStat broadcast layout); the design-system broadcast rules — [`color.md`](../07-design-system/color.md) §Broadcast (Theme 4), [`typography.md`](../07-design-system/typography.md) (≥ 32pt floor), [`motion.md`](../07-design-system/motion.md) (`--motion-instant`, 15s poll), [`badge.md`](../03-primitives/badge.md) ("the one primitive that renders on broadcast"), [`spacing-grid.md`](../07-design-system/spacing-grid.md) (72pt margin); [ADR-011](../11-decisions/ADR-011-color-token-system.md) (color), [ADR-015](../11-decisions/ADR-015-navigation-pattern.md) (no navigation on broadcast), [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md) (renders no interactive primitive). **Net-new as a mode** — v3's desktop view (v3.13.0) widens the layout for a *workstation*; there is no cast / projection-to-display. GitHub [#213](https://github.com/Vergo402/paratech-struts/issues/213). **The last Phase F screen spec** — a read-only projection over screens that now all exist.

---

## Purpose

Broadcast View is the **read-only projection mode** that renders an eligible operational screen as a **room board** — one display legible at 8–12 ft on a 1920×1080 screen, cast from the command-post tablet or laptop so the whole command post reads the same picture at a glance. It is not a destination you navigate to; it is a display mode you cast *into*. Its default projection is the SitStat / Command board (rec C-13).

## Where it lives

- **Tab / parent:** **None — it is a cross-surface projection, not a tab** (per the [tab map](00-ia-foundation.md), [ADR-014](../11-decisions/ADR-014-tab-structure.md)). The foundation defines the broadcast *adapter* once ([§Four surfaces](00-ia-foundation.md)); **this spec defines the projection *mode*** — what is eligible to cast, in what reduced form, and what is suppressed.
- **How it is reached:** **cast, never navigated** ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md) — "No navigation … a read-only projection of one chosen screen, driven by the casting device"). A cast is started from a small control on the casting device. There is **no bottom-nav tab, no rail entry, no deep link** to it.
- **Issue:** [#213](https://github.com/Vergo402/paratech-struts/issues/213).

## Primary role(s) and surface(s)

- **Primary role(s):** **the whole room reads it** — there is **no role gating on the output** (it is a wall display of status already visible to everyone present). The **caster** is whoever runs the command-post surface — typically the **Incident Commander** or **Operations Section Chief** (NIMS titles spelled out — [ADR-008](../11-decisions/ADR-008-nims-org-structure.md)).
- **Primary surface(s):** **the inversion** — this is the one spec whose primary *output* surface is **Broadcast TV**, not the phone. **Phone-is-the-floor still holds for the *control*:** a solo Incident Commander can start a cast from a phone to a TV. Phone / tablet / laptop are the **cast-control** surfaces; Broadcast is the **output**.

## Information hierarchy (above / below fold) — per surface

> Note the inversion this spec carries: for Broadcast View, the phone / tablet / laptop rows describe the **cast control**, and the Broadcast TV row describes the **projected output**.

### Phone (cast control — the floor)
- A single **"Cast to display"** control (in [Settings](50-settings.md) or a board's overflow): pick an eligible board, then **Start / Stop**. Castable phone-only — the floor holds for the control.

### Tablet (command post — the usual caster)
- The cast control plus a **live preview** of the projected board, so the operator switches the wall board without leaving the CP work.

### Laptop (Toughbook)
- Same, plus a **command-palette** entry ("Cast: Operations / SitStat / Hazard Log / Accountability …") per the [navigation model](00-ia-foundation.md).

### Broadcast TV (the projected output — no fold; one board)
- The **whole board at once** (a TV does not scroll). Default = the **SitStat C-13 layout**: left-third org chart to Section-Chief depth · center shore-point status board · a read-only header (incident · Incident Commander · Safety Officer · operational period + elapsed). Everything **≥ 32pt**; status renders as a **left-border accent + label, never a fill**; **zero motion**; refreshed on a **15-second poll**. No interactive primitive renders.

## Primary action + secondary actions

- **Primary action (one — Principle 4):** **the broadcast output has no action — it is read-only.** The single action lives on the *caster*: **select-and-cast a board** (an eligible-board [`sheet`](../03-primitives/sheet.md) / [`picker`](../03-primitives/picker.md) → a Start [`button`](../03-primitives/button.md)).
- **Secondary actions (caster only):** **switch the projected board**; **stop casting**.
- **Destructive / terminal:** **none** — nothing on the board mutates state, and the cast control raises **no destructive overlay** (stop-cast is non-destructive and instantly reversible). Broadcast appears in the [modal-vs-sheet table](00-ia-foundation.md) as the single row that raises **no overlay at all** ([ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)).

## Composed primitives

Two surfaces, two primitive sets.

**On the output (broadcast) — a strict read-only subset:**
- [x] [badge](../03-primitives/badge.md) — the board's primary content; the status badge is a 4pt **left-border + label** (never a fill, never a bare dot) per [`badge.md`](../03-primitives/badge.md) / [`color.md`](../07-design-system/color.md) §Broadcast — "the one primitive that renders on broadcast."
- [x] [card](../03-primitives/card.md) — read-only board tiles (the SitStat datums, shore-point cards, hazard rows, accountability rows) at broadcast density; **no slide, no tap zone, no Advance/Step-back** (the control lives on the source card).
- [x] [list](../03-primitives/list.md) — the board arrangement (the status grid, hazards-by-severity, the accountability board); a TV shows a fixed board, so virtualization is moot.
- [x] [empty-state](../03-primitives/empty-state.md) — the "No active operation" board and the all-clear filtered boards (below).
- [x] [loading-state](../03-primitives/loading-state.md) — the first cast handshake and the staleness indicator (below).

**On the cast control (the caster's normal-themed UI):**
- [x] [sheet](../03-primitives/sheet.md) / [picker](../03-primitives/picker.md) — pick the eligible board to cast.
- [x] [segmented](../03-primitives/segmented.md) — switch among eligible boards (a small scope control on the caster).
- [x] [button](../03-primitives/button.md) — Start / Stop cast.

- [ ] [modal](../03-primitives/modal.md) · [input](../03-primitives/input.md) · [toggle](../03-primitives/toggle.md) · [slider](../03-primitives/slider.md) · [toast](../03-primitives/toast.md) · [nested-checklist](../03-primitives/nested-checklist.md) · [warning-gate](../03-primitives/warning-gate.md) — **never on the output** (all interactive or transient). A checklist or ORM screen that casts renders as **headers + counts only** ([`nested-checklist`](../03-primitives/nested-checklist.md) toggles do not render); a `RecommendationCard`'s [`warning-gate`](../03-primitives/warning-gate.md) shows its disclosure **text** but cannot be acknowledged on the wall — the acknowledgment is interactive and happens on the source device.

> **Broadcast composes a strict read-only *subset* of the existing 14 primitives — it never adds one.** A new primitive would be a gate escalation.

## The projection registry (the heart of this spec)

Broadcast is **one adapter reading one event-log projection** ([`06-synthesis.md`](../06-synthesis.md) §1.8). Which screens are eligible to cast — and in what reduced form — is fixed here, so each screen spec's broadcast column has a single home to point at:

| Screen | Tab | Broadcast form | What renders (read-only) |
|---|---|---|---|
| **[Operations](20-operations.md)** ([#199](https://github.com/Vergo402/paratech-struts/issues/199)) | Operations | **Full board** | status lanes as a card grid; shore-point name + measurement largest; status = left-border + label |
| **[Command / SitStat](30-command-sitstat.md)** ([#201](https://github.com/Vergo402/paratech-struts/issues/201)) | Command | **Full board — the C-13 default** | left-third org chart · center status board · read-only header (incident · IC · Safety Officer · OP/elapsed) |
| **[Hazard Log](32-hazard-log.md)** ([#296](https://github.com/Vergo402/paratech-struts/issues/296)) | Command | **Full board** | open hazards ordered by severity |
| **[Accountability](41-accountability.md)** ([#297](https://github.com/Vergo402/paratech-struts/issues/297)) | Inventory | **Full board** | names + sync state — "who is accounted for and current" |
| **[Cutting Station](21-cutting-station.md)** ([#294](https://github.com/Vergo402/paratech-struts/issues/294)) | Operations | **Reduced board** | the cut queue; cut length the largest element |
| **[Org Chart](31-org-chart.md)** ([#295](https://github.com/Vergo402/paratech-struts/issues/295)) | Command | **Reduced board** | to Section-Chief depth, populated roles only (the C-13 left third, standalone) |
| **[Inventory](40-inventory.md)** ([#200](https://github.com/Vergo402/paratech-struts/issues/200)) | Inventory | **Reduced board (optional)** | a read-only stock summary — available counts per system |
| **[IC Command Checklist](33-ic-command-checklist.md)** ([#203](https://github.com/Vergo402/paratech-struts/issues/203)) | Command | **Minimal** | phase headers + completion % (no toggle affordance — the board cannot attest) |
| **[Task Level Checklist](22-task-level-checklist.md)** ([#204](https://github.com/Vergo402/paratech-struts/issues/204)) | Operations | **Minimal** | section headers + completion counts |
| **[ORM / TCRM](23-orm-tcrm.md)** ([#205](https://github.com/Vergo402/paratech-struts/issues/205)) | Operations | **Minimal** | a "briefing in progress / complete" indicator only |
| **[Quick Find](10-quick-find.md)** ([#198](https://github.com/Vergo402/paratech-struts/issues/198)) | Quick Find | **Not rendered** | an *input* screen (a calculator), not a board |
| **[Settings](50-settings.md)** ([#202](https://github.com/Vergo402/paratech-struts/issues/202)) | Settings | **Not rendered** | configuration, never a cast board |
| **[User Manager](51-user-manager.md)** ([#209](https://github.com/Vergo402/paratech-struts/issues/209)) | Settings | **Not rendered** | admin / member list — would expose roster PII to the room |
| **[Cross-Dept Invite](52-cross-dept-invite.md)** ([#210](https://github.com/Vergo402/paratech-struts/issues/210)) | Settings | **Not rendered** | admin; codes/grants are not a wall datum |
| **[Audit Log](53-audit-log.md)** ([#211](https://github.com/Vergo402/paratech-struts/issues/211)) | Settings | **Not rendered** | data-dense record, not a room board |
| **[Login / Register](70-login-register.md)** ([#206](https://github.com/Vergo402/paratech-struts/issues/206)) | pre-shell | **Not rendered** | auth is never projected |
| **[Department Setup](71-dept-setup.md)** ([#207](https://github.com/Vergo402/paratech-struts/issues/207)) | pre-shell | **Not rendered** | auth / config, never projected |
| **[Invite Code](72-invite-code.md)** ([#208](https://github.com/Vergo402/paratech-struts/issues/208)) | pre-shell | **Not rendered** | auth / config, never projected |

**The rule behind the split.** A screen is eligible to cast **iff it is a read-only status board with whole-room meaning**. Input, configuration, admin, and auth screens are ineligible for two reasons: (a) they carry **no glance-from-across-the-room value** (a calculator or a settings form is a one-operator task), and (b) projecting them would **expose credentials, member lists, audit detail, or configuration** to everyone in the room — Principle 7's "visible safety" is about *safety status*, not about leaking config/PII to a wall. The **default** projection is [SitStat](30-command-sitstat.md) (the C-13 board).

## Two governing decisions (made here, not deferred)

### 1. Pin, don't mirror
The broadcast holds the **chosen board steady** — it does **not** follow the caster's live navigation. When the Incident Commander taps from SitStat into a shore point on the tablet, the wall board does **not** jump; it stays on the cast board and refreshes its data on the poll. This is the room-board contract: the one display in the room that **does not move** ([`motion.md`](../07-design-system/motion.md) §What does not move), so a chief glancing up always finds the same board in the same place. *(Alternative considered — a live mirror of the caster's screen — **rejected**: it makes the room board lurch with one person's taps and turns a shared situational display into a single user's screen-share.)* Switching the projected board is a **deliberate caster action**, never a side effect of navigation.

### 2. The output is a sink; the control is elsewhere
The broadcast renders **no control of its own** — no nav, no buttons, no overlays ([ADR-015](../11-decisions/ADR-015-navigation-pattern.md) / [ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md)). All control — start, switch, stop — lives on the casting device's normal-themed UI. The display device is a **dumb, legible sink**: a TV with no input device attached is fully sufficient, and nothing on the wall can be tapped, mis-tapped, or walked-up-and-changed by someone in the room.

## Locked cross-cutting rules this screen honors

- [x] **Phone is the floor** — *with the documented inversion*: the **output** floor is Broadcast, but the **cast control** is castable phone-only (a solo Incident Commander + a TV).
- [x] **Renders no interactive primitive** ([ADR-016](../11-decisions/ADR-016-modal-vs-sheet-rules.md); [§Four surfaces](00-ia-foundation.md)) — no sheet / modal / button / slider / toggle / input on the output, ever.
- [x] **Status = slide-to-advance, always reversible** ([ADR-010](../11-decisions/ADR-010-status-commit-model.md)) — **not on broadcast**: status is **read-only** here; advancing happens on the source [Operations](20-operations.md) card. The board shows the *result*, never the control.
- [x] **Type ≥ 32pt** ([`typography.md`](../07-design-system/typography.md)) — nothing sub-32pt renders; the incident name at 40pt+.
- [x] **Zero motion** ([`motion.md`](../07-design-system/motion.md) `--motion-instant`) — no slide cross-fade, no spinner; data changes appear on the 15-second poll as an instant swap.
- [x] **Color never alone** (Principle 9) — status is **border + label word**, never a fill or a bare dot ([`badge.md`](../03-primitives/badge.md) / [`color.md`](../07-design-system/color.md) §Broadcast); all status pairs ≥ 7:1 AAA.
- [x] **No comms / no push / no life-safety signal** (Principle 10) — the board shows status and context; it **never** shows a PAR / evacuation / mayday alert, a message, or a notification. Doubly enforced here: a wall display is exactly where comms-creep would be tempting, and exactly where it must not happen.
- [x] **Visible safety** (Principle 7) — hazards and Safety-Officer status **do** render (the [Hazard Log](32-hazard-log.md) casts; the SitStat header shows the Safety Officer) — visible, never a blocking signal.
- [x] **NIMS terminology** — titles spelled out ([ADR-008](../11-decisions/ADR-008-nims-org-structure.md)); the org-chart projection reads "Rescue Group Supervisor," not an acronym.
- [x] **Capacity demoted** — not a board datum.
- [x] **Persistent header renders read-only** — incident · Incident Commander · Safety Officer · operational period + elapsed appear, but are **not tappable** (no Hazard-Log tap on the wall; [§Persistent chrome](00-ia-foundation.md) interactive elements do not project).

## The four-surface table (this screen)

For this spec the columns are **cast-control** (phone / tablet / laptop) vs. **output** (broadcast). Cites the [framework](00-ia-foundation.md).

| Dimension | Phone (cast control) | Tablet (cast control + CP) | Laptop (cast control) | Broadcast (output) |
|---|---|---|---|---|
| Layout | a "Cast to display" control | control + live preview | control + palette entry | the whole board, one screen |
| Above fold | pick board · Start/Stop | preview + switch board | switch via Cmd/Ctrl+K | default = the C-13 SitStat board |
| Primary-action affordance | select-and-cast | select-and-cast | select-and-cast (palette) | — (read-only) |
| Added density | — | live preview | palette | the board *is* the density |
| Does NOT render | — | — | — | every interactive primitive |

## Empty / error / loading states

(Posture set in [`00-ia-foundation.md`](00-ia-foundation.md) §Cross-cutting empty / error / loading.)

- **Empty — nothing to project / no active operation:** a calm broadcast [`empty-state`](../03-primitives/empty-state.md) — the incident header + "No active operation" at board scale (mirrors [Command](30-command-sitstat.md)'s `noActiveOpCommand`), never a blank screen. A board filtered to nothing (e.g. the [Hazard Log](32-hazard-log.md) with zero open hazards) shows the **all-clear** variant ("No open hazards") — never an alarm.
- **Error — stale / disconnected:** the poll model makes **staleness** the real failure mode. A lost connection shows a **persistent "Last updated HH:MM" indicator** on the board — honest, non-blocking, **never an `alert()`** and never a full-screen error (the room must still read the last-known board). This is the broadcast face of the ambient sync indicator ([§Persistent chrome](00-ia-foundation.md)).
- **Loading:** the **first cast handshake** is a genuine wait → a determinate "Connecting to display…" on the *caster* ([`loading-state.md`](../03-primitives/loading-state.md)); the board itself, once up, is **snapshot / local-first** — it shows the last-known state immediately and refreshes on the **15-second poll** rather than spinning.

## Accessibility / screen-reader notes

**Cite [`accessibility.md`](../07-design-system/accessibility.md), do not restate.**

- **Broadcast is a non-interactive wall display** — it is not an assistive-technology navigation target; **its accessibility *is* its legibility**: ≥ 32pt, AAA ≥ 7:1, and color-never-alone (border + label) ([`accessibility.md`](../07-design-system/accessibility.md) / [`color.md`](../07-design-system/color.md) §Broadcast). The underlying data is fully screen-reader-accessible **on the source device**, which the operator actually drives; broadcast projects already-accessible content.
- **"Assistive tech cannot slide" is satisfied trivially** — nothing on the board slides; the status control lives on the source screen, where the focusable Advance / Step-back button equivalents already exist ([`accessibility.md`](../07-design-system/accessibility.md) §Assistive tech cannot slide).
- **The cast control** (on the caster) is keyboard- and screen-reader-accessible like any [`sheet`](../03-primitives/sheet.md) / [`button`](../03-primitives/button.md); the "Casting to display" state announces via `aria-live`, and Stop is always reachable ([`accessibility.md`](../07-design-system/accessibility.md) §Focus & keyboard).

## Open questions (per-screen)

1. **Cast transport mechanism** — Chromecast / AirPlay / a browser opened directly on a TV / WebRTC screen-share. A platform-infrastructure decision (the class of PWA-vs-RN, [`99-open-questions.md`](../99-open-questions.md) #8) → **Phase H**; escalated to [`99-open-questions.md`](../99-open-questions.md) **#34**. The IA here (pin-not-mirror, the registry, the read-only output) is **transport-independent**.
2. **Multi-board rotation** — whether a caster can set the wall to *cycle* Operations ↔ SitStat ↔ Hazard Log on a timer; a **single-board cast is the v4.0 floor** → Phase G/H affordance.
3. **Cast-control role gating** — whether *starting* a cast is any-role or command-post-role-restricted → Phase G (the output is ungated regardless).
4. **The C-13 split sizing at 1920×1080** — the exact left-third / center proportions and datum sizing → affordance geometry, Phase H (carries [Command](30-command-sitstat.md)'s OQ3).
5. **Refresh cadence tuning** — the 15-second poll is the [`color.md`](../07-design-system/color.md) / [`badge.md`](../03-primitives/badge.md) default; whether it is configurable or command-post-pushable → Phase H.
