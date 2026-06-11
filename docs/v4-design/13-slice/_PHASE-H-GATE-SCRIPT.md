# Phase H Gate — Your Drive Script

**Issue:** [#248](https://github.com/Vergo402/paratech-struts/issues/248) · **You're the gate.** Drive the slice, then either pass it (Phase I starts — building the rest of the app one workflow per session) or kick back the states that don't feel right.

This is the first running v4 code: the three workflows from the slice plan — **Start operation → Add shore point → Deploy strut** — built on the new design system. Everything you drive here is the real thing: real load engine (ported line-for-line from v3), real local database, real status doctrine. Cloud sync is deliberately stubbed (local-only for now; Firebase is its own later session).

The formal pass already ran — every state below passed on the production build with proof in [`_PHASE-H-SLICE-VERIFICATION.md`](_PHASE-H-SLICE-VERIFICATION.md). Your drive is the judgment call: **does it feel right in the hand?**

---

## Getting in

1. Ask Claude to "start the v4 preview" (or run `npm run build && npm run preview -- --port 5198` in the repo and open `http://localhost:5198`).
2. **Phone-sized window** — that's the floor every workflow was designed against. Narrow the browser or use device mode.
3. **Fresh practice data:** ask Claude to "wipe the preview data" (or DevTools → Application → Storage → Clear site data → reload). The app re-seeds itself with practice inventory: 17 items across Engine 1, Rescue 2, and Squad 3.

Theme lives in **Settings** (System / Light / Dark / Sunlight) if you want to check the others; the drive below works in any of them.

---

## The drive

### 1 · Start an operation, add a shore point, deploy a strut

- Operations tab → **Start Operation**. Name it anything. Notice you can't submit without a name — the button tells you why.
- **+ Add Shore Point** → leave Division 1 → measurement **2′ 6″** (tap + on feet twice, + on inches six times — and try the eighths strip while you're in there) → **Add Shore Point**.
- The card lands in Pending. Tap **Assign Equipment**.
- *What to judge:* the recommendation cards. Gold bar = LongShore, model + adjusted range up top, the **deductions ledger on every card** (each line says "not selected" in red until you pick wood/plates — nothing is hidden), the **Effective** number big at the bottom, "Equipment from:" naming the rig. Load capacity is deliberately *not* on the card face. Every card carries the "planning aid" line.
- Tap **Deploy** on the LS 203. The sheet closes, the card moves to **In Process** and now permanently shows **which strut from which rig**.
- Move it forward: use the **slide** ("Slide to set Strut Set") or the plain **Advance to Strut Set** button below it — the button is the same commit, built for gloves and screen readers.
- At **Strut Set** there's deliberately no "advance to Cutting" — the cutting workflow is the next build phase. Step-back is there.

### 2 · Grouped shore points

- **+ Add Shore Point** → set **Quantity 3** → 2′ 6″ again → submit.
- Three linked cards appear: **[1/3] [2/3] [3/3]** — one tap created all three.
- Deploy equipment on **one** of them. On its In Process card: the advance is **greyed with a reason** — "Waiting on group — 2 of 3 still Pending." The group moves together; equipment goes on one at a time.
- Deploy the other two, then advance **any one** of them → **all three** move to Strut Set together. (Step one back from Strut Set — all three come back. Lockstep both directions until cutting starts.)

### 3 · Taking a strut back off

- On an In Process card, use **Step back to Pending**.
- This one asks first — it's the only step-back that does, because it changes inventory: *"Return LS 203 to inventory? … returns it to Rescue 2's available count."* Cancel is the default.
- Confirm. Card's back to Pending, strut's back on the rig.

### 4 · When there's nothing to deploy

- Add a shore point at **1′ 4″** (16″ — too small for anything). Its Pending card says why right on it: *"No matching strut — nothing fits this opening at this load."* Open Assign Equipment anyway — it opens and tells you the same thing with what to do about it.
- Add one at **15′ 10″** (190″) and deploy what it offers; do it again; add a **third**. That one reads *"Waiting for inventory — no apparatus stock to pull from"* — a different problem (the strut exists, the rigs are empty) and the app knows the difference.
- These reason lines are **live** — return a strut and watch the line clear itself.

### 5 · The safety gates

- Add a shore point at **16′ 8″** (200″) → Assign Equipment.
- The card is flagged red: **LongShore above 16 ft isn't rated by Paratech.** Deploy is locked until you tick **"Team acknowledges the unrated zone"** — then it unlocks, and the warning stays put. The sheet never kicks you out.
- **The harder gate — load too heavy:** when the load on an opening exceeds what even 4 struts can carry, Deploy locks **completely** — no checkbox, no override, with the math spelled out ("…would require 14 struts"). **Where to see it:** the component showroom at **`/gallery`** (type it into the address bar), bottom section, third card — driven by the real engine at 180″ / 60,000 lb.
  - *Why the showroom (your own call, Option 1, 2026-06-10):* shore points don't carry a load number yet in this slice — the load field comes with Phase I — so nothing in the normal flow can overload. Same math, same card; re-verified in the real flow when the load field ships.
  - *Your raker note is recorded:* the direct Paratech vertical-shoring chart stops at 12′; the 16′ figures are raker territory — much later, nothing planned now. The 200″ scenario exists to fire the gate, not to model a real vertical shore.

### 6 · Changing things after the fact

- Pencil next to the operation name → rename it → Save → rename it back. Live both times.
- **Edit** on a Pending card → everything's changeable **except Quantity** — a group's size is locked once created. Change the measurement, Save, watch the card update; change it back.
- **Delete** on a Pending card asks first.

---

## Known gaps — don't judge these (all logged, all queued)

Things you'll notice that are **deliberately not built yet**. The slice proves the spine; these ride the next phases:

1. **Quick Find tab is a stub** (the shared measurement inputs were built inside Add Shore Point; the standalone screen is Phase I) — and the "no match → try Quick Find" link is likewise absent.
2. **Inventory and Command tabs are stubs** — honest "not built yet" screens. Inventory changes are real underneath (you watched counts move); the management screen comes later.
3. **End Operation button → placeholder confirm** — doesn't archive yet (workflow #238, Phase I).
4. **Extensions and base plates don't decrement stock** when deployed — only the strut itself does, for now (Phase I).
5. **The unrated-zone acknowledgment doesn't follow the deployed card** — once deployed, the In Process card doesn't re-show that the team acknowledged the unrated zone (needs a schema field; Phase I).
6. **After Deploy, focus doesn't land on the moved card** — the list scrolls and a screen reader announces it, but keyboard focus resets to the page (Phase I polish).
7. **No numeric keypad on measurement** — the tap-strip + steppers are the settled design (#20/#38); a 10-key entry may come later.
8. **Plate/connector pickers show letter swatches, not photos** — real thumbnails come with the Inventory work.
9. **Power Select** (the screen-reader fallback for pickers) is a placeholder.
10. **The deduction ledger in Add Shore Point is always expanded** rather than collapsed-by-default (Principle 7 polish, later).
11. **Sunlight theme: the card status stripe** uses a placeholder color mapping (cosmetic).
12. **The full-screen picker behaves as an overlay, not a browser "page"** — back-button behavior comes when something actually uses an 8+ item list.
13. **Strut Set can't advance to Cutting** — cutting/runner/secured/returned are the next workflows (#222–224, Phase I).
14. **Cloud sync is off by design** — everything is local to this device; Firebase + multi-device is its own later session.

*(The wording on the "waiting for inventory" reason is also slightly broader than v3's — flagged for the copy pass.)*

---

## Recording your verdict

- **Pass** → say "gate passes" (or comment on [#248](https://github.com/Vergo402/paratech-struts/issues/248)) → Phase I begins.
- **Kick back** → name the state(s) by number and what felt wrong — that becomes the fix list before Phase I.
