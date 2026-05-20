# `mod-ux` Observation Checklist — Field UX / Mobile Ergonomics

> Reference: WCAG 2.2 Quickref (plan.md Appendix F); F1–F10 baseline from `.claude/audits/interactive-findings.md`; MASTER-PLAN audit findings (U*, A*, F-*).
>
> **Mode:** silent observation. Notes appended to `notes/moderator-mod-ux-notes.jsonl`.

## Checklist (12 items)

### Item 1 — F2 regression: section-button dead-end
- **Observe:** When sections (Assigned Apparatus, External Equipment, Individuals, My Role) start collapsed on Operations tab, do the "Assign / Add / Change" buttons inside them auto-expand the parent section? F2 in prior interactive-findings was a complete dead-end UX. v3.5.2 partially fixed Apparatus.
- **Surface:** Operations tab — section action buttons
- **v4.0.0 Phase:** `none` (v3.5.2 partial fix — verify all four sections)

### Item 2 — F3 regression: offline status update UI lag
- **Observe:** Force offline via `db.goOffline()`, then status-advance an SP. Does the card visually update immediately, or only after reconnect? v3.5.3 local-first architecture should have fixed this.
- **Surface:** Operations tab — SP cards
- **v4.0.0 Phase:** `none` (v3.5.3 fix — verify no regression)

### Item 3 — Drilldown responsiveness at 250 SPs
- **Observe:** As SP count climbs through OP3 toward 220+, does the Building → Floor → Area drilldown remain instant (<50ms per level)? F4 baseline at 41 SPs was 5.6ms for Operations; at 250 estimate ~30ms.
- **Surface:** Drilldown view
- **v4.0.0 Phase:** 3F / **NEW** (virtualization absent)

### Item 4 — Legibility on smallest target device (375px)
- **Observe:** Open preview at 375px viewport (iPhone SE). Do all SP cards, buttons, status pills remain legible without horizontal scroll? Specifically: status badge readable; label not truncated.
- **Surface:** All tabs at 375px (use preview_resize)
- **v4.0.0 Phase:** **NEW** (375px responsive baseline)

### Item 5 — Plate picker scroll under rapid use
- **Observe:** Open the plate picker (bottom sheet) and scroll vigorously. Does the scroll remain reliable per v3.5.1 (`touch-action: pan-y` + `translateZ(0)` + visibility toggle)? Test in Add SP modal and Deploy modal.
- **Surface:** Plate picker bottom sheet
- **v4.0.0 Phase:** `none` (v3.5.1 fix — verify no regression)

### Item 6 — Dark mode contrast on status pills (WCAG 1.4.3 + 1.4.11)
- **Observe:** Switch to dark mode (Settings → Theme → Dark). Inspect status pill backgrounds + text colors. WCAG 1.4.3 AA requires 4.5:1 text contrast; 1.4.11 requires 3:1 non-text UI component contrast. All 7 status pills (pending, process, strutplaced, cutting, runner, secured, returned) must pass.
- **Surface:** All tabs — dark mode
- **v4.0.0 Phase:** `none` (v3.5.2 A2 fix for cutting/runner — verify all 7)

### Item 7 — "+ Shore Point" reachable in ≤2 taps
- **Observe:** From any tab, count taps to reach Add Shore Point. Should be ≤2 (current: 1 if Operations active, 2 if elsewhere).
- **Surface:** Bottom nav + Operations tab
- **v4.0.0 Phase:** **NEW** (review)

### Item 8 — Long-press reparent discoverability + accidental triggering
- **Observe:** Does the participant discover the org-chart reparent gesture? Are accidental triggers common? Per v3.6.0 2D.3, movement >8px cancels long-press.
- **Surface:** Command tab — org chart
- **v4.0.0 Phase:** `none` (v3.6.0 fix — verify no regression) / **NEW** (discoverability)

### Item 9 — Status filter at card-list level (F7)
- **Observe:** After 3+ drilldown levels (Building → Floor → Area), with multiple SPs in different statuses, is there a "show only Pending" filter? F7 in prior interactive-findings flagged this absent.
- **Surface:** Drilldown card list
- **v4.0.0 Phase:** **NEW** (filter feature)

### Item 10 — Headcount reads "X apparatus, Y personnel" (F10)
- **Observe:** Command page header headcount. Does it say "21 apparatus assigned" only, or "21 apparatus, 84 personnel"? F10 + MASTER-PLAN N10 flagged the personnel count as missing.
- **Surface:** Command tab header
- **v4.0.0 Phase:** 3C.6 (personnel + PAR)

### Item 11 — 44px min touch targets on gloveable buttons (WCAG 2.5.5 AAA)
- **Observe:** Cut Table tab — "Send to Runner", "Mark Secured", "Return Equipment" buttons. Measure rendered size via preview_inspect. WCAG 2.5.5 AAA = 44×44 CSS px minimum for glove-friendly use.
- **Surface:** Cut Table tab cards
- **v4.0.0 Phase:** **NEW** (44px AAA target — currently many app buttons are below)

### Item 12 — Quick Find inventory quick-view during input
- **Observe:** While typing measurement in Quick Find, can the participant invoke the inventory quick-view (cube icon) without losing input state? Or does it dismiss the form?
- **Surface:** Quick Find tab — inventory quick-view button
- **v4.0.0 Phase:** `none` (current — verify behavior)

---

## Calibration anchors

- WCAG 2.5.8 (AA) target size = **24×24 CSS px** minimum
- WCAG 2.5.5 (AAA) target size = **44×44 CSS px** minimum (used for cut-table buttons per gloved-firefighter requirement)
- WCAG 1.4.3 (AA) text contrast = **4.5:1** standard, **3:1** large text (18pt+ / 14pt+ bold)
- WCAG 1.4.11 (AA) non-text contrast = **3:1** for UI components and states
- WCAG 4.1.3 (AA) status messages = programmatically determinable without receiving focus
- F1–F10 from prior interactive-findings.md — baseline regression checks
- F4 performance baseline: 41 SPs @ 5.6ms Operations render

## Render time smoke deck (run at each OP boundary)

At E+4, E+16, E+28, E+36, the moderator runs these 5 fixed Quick Find queries via preview_eval and verifies output drift:

```
1. measurement 36", load 10000, no deductions, all systems → expect: AT 19-25, LK 25-36, LS 304
2. measurement 96", load 25000, 4x4 header + 4x4 footer + hinged6 top + hinged6 bottom → expect: specific strut + qty
3. measurement 132", load 15000 → expect: LS 610 (this is the v3.5.2 corrected 132" row)
4. measurement 24", load 8000 → expect: AT 19-25 (this is the v3.5.2 corrected 24" row)
5. measurement 200", load 5000 → expect: LS 1016 + unrated-zone warning (per v3.5.2 NEW-2)
```

Any output drift between OP boundaries = critical finding (algorithm regression mid-op).
