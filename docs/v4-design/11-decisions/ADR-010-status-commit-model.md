# ADR-010: Status commit model — slide-to-advance + always-reversible (amends Principle 6)

## Status

- [ ] Proposed
- [x] Accepted *(Phase E gate — Alex, 2026-06-01)*

**Date:** 2026-05-31
**Author:** Claude Opus 4.8 (Phase E session) — from the Phase D synthesis + Alex's PR #282 review
**Reviewer(s):** Alex (Phase E gate — approved 2026-06-01)

---

## Context

[Principle 6](../02-principles.md) ("Doubt-free escapes") is written with a **specific mechanism**: when the operator taps a state-changing action, the app commits immediately *and surfaces a 5-second toast — "Sent back. Undo (5s)"* — explicitly adopting Apple Mail's "Undo Send" pattern. [`02-principles.md`](../02-principles.md) also states principles are "immutable post-approval" and that changes require an ADR.

The Phase D synthesis overturned this mechanism. [`06-synthesis.md`](../06-synthesis.md) §1.5 and §4 (Field UX), reflecting Alex's review, specify that **status advances via a deliberate slide gesture (not a tap) and is always reversible from the card** — an authorized user can step a shore point back at any time — **with no time-limited undo toast.** The decision-tracking matrix marks the timed-undo recommendations superseded (B-11, G-4, F-21). No existing ADR records this change to Principle 6, so the principles file and the synthesis are currently in conflict. Phase E (the card primitive, the toast primitive, the motion doc) cannot be authored until the conflict is resolved.

The driver is field physics (synthesis §1.5): structural-glove fingertips contact at 18–22 mm and miss the 44pt floor ~30% of the time; wet screens fire ghost taps; and the team officer's eyes are on the rubble, not the screen — so a 5-second window expires unseen.

---

## Decision

**Amend Principle 6's *mechanism* while preserving its *intent*.** State-changing lifecycle transitions commit immediately via a **deliberate slide gesture** and are **reversible from the card at any time** by an authorized user (spatial, always-available reversibility), **replacing** the 5-second timed undo toast. Heavy confirmation is reserved **only** for destructive/terminal actions (End Operation; a return that decrements inventory). A card that regresses off an active work queue shows a **visible red-slash "Removed from cut list" state**, never a silent disappearance. Principle 6's intent stands: doubt-free escape, no "Are you sure?" modal in the everyday flow.

---

## Rationale

- **A 5-second timer doesn't survive the field.** The team officer commits a status, then looks back at the void; the undo window closes unseen. Always-available reversibility removes the race entirely — the escape is there in 5 seconds or 5 minutes.
- **A deliberate slide is the right commit gesture for a safety-consequential change.** Tap is for reads/opens; a slide can't be triggered by a wet-screen ghost tap or a gloved brush. (Synthesis §1.5.)
- **Reversibility self-heals mistakes** without a transient UI element competing for attention during an incident (Principle 3 — calm in chaos). A stray advance is one reverse-gesture away.
- **Visible state over silent change** (Principle 10): the red-slash off-queue state tells the operator *why* a card left a queue; a vanishing card reads as data loss under stress.
- **The event log already supports it** (synthesis §1.1, §3.6): every transition is an append-only event; a reversal is simply a new event, so "always reversible" needs no special undo buffer — and it produces a better audit trail than a toast that either fired or didn't.
- Principle 6's *intent* — never trap the user, never make them second-guess with a modal — is fully preserved; only the *implementation* changes from temporal (a timer) to spatial (an always-present control).

---

## Alternatives Considered

- **Keep the 5-second undo toast (Principle 6 as written).** Rejected — the timer assumes eyes-on-screen, which the in-building role does not have; the window is the weakest link in the field (synthesis §1.5).
- **Confirm modal per advance ("Advance to Cutting?").** Rejected — Principle 6 explicitly forbids "Are you sure?" modals; modal-stacking under stress is the exact failure the principle was written against.
- **Undo toast *plus* always-reversible.** Rejected — two mechanisms for one concern; the toast adds motion noise (Principle 3) and implies the reversal window is time-bound when it isn't. The toast primitive is better repurposed to confirmations/notifications.
- **Tap-to-advance (no slide).** Rejected — ghost taps on wet screens would advance safety-critical state.

---

## Consequences

- **Positive:** robust to gloves/sun/wet/eyes-off; one simple mental model ("slide forward, slide back, anytime"); fewer transient UI elements; a cleaner audit trail (reversal = event).
- **Negative:** "always reversible by an authorized user" requires the authorization model (who may reverse — owner/admin/member/IC) to be defined in the auth/roles work (D7); reversal events must be attributed in the audit log. Both are already on the v4.0 roadmap.
- **Neutral:** the **toast** primitive is repurposed to confirmations/notifications only ([`toast.md`](../03-primitives/toast.md)); **motion.md** drops the 5-second undo-progress-line micro-interaction and adds the slide-commit + red-slash reveal; **card.md** owns the slide affordance, the reverse affordance, and the red-slash state. Principle 6's text in `02-principles.md` should carry a pointer to this ADR (the amendment is recorded here, not by rewriting the principle's history).

---

## Related

- **Principles:** 6 (amended — mechanism), 10 (visible state, not silent), 3 (calm in chaos), 4 (one canonical action).
- **Other ADRs:** none superseded; first ADR to touch a principle's mechanism.
- **Synthesis:** §1.5 (field-conditions commit model), §4 (Field UX direction), §3.2 (red-slash off-queue).
- **Matrix dispositions confirmed:** B-11, G-4, F-21 (timed-undo superseded).
- **Primitives affected:** [`card.md`](../03-primitives/card.md), [`toast.md`](../03-primitives/toast.md), [`motion.md`](../07-design-system/motion.md).
- **Open questions surfaced:** exact slide mechanics (full-card swipe vs. slide control) → Phase G/H; reversal authorization model → D7 auth work.

---

## Notes

This ADR changes a *mechanism*, not the principle's purpose. If Alex prefers, Principle 6's wording in `02-principles.md` can be revised in place at the gate to point here; the conservative default taken in Phase E is to leave the principle text intact and let this ADR be the authoritative amendment (the principles file is treated as append-only history, ADRs as the live decision record — consistent with how ADR-002/003/004 amended Principles 1 and added Principle 12).
