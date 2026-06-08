# FieldShore — Plain-Language Glossary

**What this is:** a plain-English translation of the developer terms that show up
in FieldShore planning and design (mostly the v4 rebuild). It's a personal lookup —
not a spec. When a term in a chat or a doc trips you up, find it here.

**How to read an entry:** the everyday meaning comes first; the technical term is
**bolded**; and where a comparison to your world is genuinely strong, an *italic
line* maps it to ICS / shoring / the fireground. Some terms get no analogy on
purpose — a forced metaphor is worse than a clean definition.

> Pairs with the standing rule in `CLAUDE.md` § "How We Talk": in conversation I
> lead with plain words and tuck the technical term in parentheses. This doc is the
> place to look any of them up. New terms get added here as they come up.

---

## Architecture & code structure
*(how the app's code is organized)*

**Monolith** *(the "8,800-line app.js")* — When all the code lives in one giant
file, so any change risks bumping something unrelated. That's how v3 is built; the
v4 rebuild breaks it into smaller, separate pieces.
*Like one rig packed with every tool you own — fast at first, unworkable once it's full.*

**Module boundaries** — Clear dividing lines between pieces of code, so a change in
one piece can't quietly break another.
*Like keeping Operations, Logistics, and Planning as separate sections — each has a defined job and they coordinate through clean hand-offs.*

**Package** — One self-contained piece of the app with a single job — e.g. "the
rescue-strut math," "the cloud-saving layer," "the on-screen buttons." v4 is
assembled from a few of these instead of one big blob.
*Like a Task Force built from separate single-purpose resources rather than one crew doing everything.*

**Monorepo** — Keeping several of those pieces (and possibly future apps) together
in one code-storage location so they share and update as a set. (mono = one,
repo = the place code is stored.)

**Seam** — A deliberate clean break built into the code where one part plugs into
another, so you can change or swap one side without disturbing the other. (Main
example: the *data/sync seam*, under Data & sync.)

**Component library** — A set of pre-built, reusable screen pieces (buttons, cards,
pickers) that all look and behave the same, instead of rebuilding each by hand.
*Like standardized, pre-rigged equipment — same gear, same behavior, no improvising on scene.*

**Inline templates** *(HTML string concatenation)* — The v3 way of building screens
by gluing the page's text and code together as raw text. Error-prone and a security
hazard; v4 builds screens from the reusable pieces instead.

**Listener leak** — When the app keeps "listening" for updates it no longer needs
and forgets to stop, slowly hogging memory. A bug to clean up.
*Like leaving a radio scanning channels you've already cleared — it just keeps eating battery.*

**TypeScript strict** — A stricter version of the coding language that catches whole
categories of mistakes before the app ever runs, instead of in the field.
*Like a rig check that won't let you roll until every compartment's confirmed — catch the missing tool in quarters, not on scene.*

**Turborepo** — A behind-the-scenes tool that builds all those separate code pieces
efficiently, rebuilding only what actually changed. (Pairs with *monorepo*.)

---

## Data & sync
*(how the app stores information and keeps phones in agreement)*

**Event-sourced log** *(append-only log)* — Instead of only saving the app's current
state, we keep a running list of every change ever made, in order, and never erase
or edit past entries. "Now" is that list played back from the top.
*Like an ICS-214 unit log: you record each entry as it happens, and you can rebuild the whole picture from the log.*

**Projection** — What you see on screen right now, calculated by replaying that
running list of changes up to this moment. It isn't stored separately — it's the
sum of every entry so far.
*Like the current status board: it's whatever all the updates add up to.*

**Data/sync seam** — One walled-off spot where ALL the cloud-saving code lives, so
the rest of the app doesn't know or care which cloud service is behind it. Swap the
service later and nothing else changes.
*Like Operations going through a single liaison for outside coordination instead of every crew calling vendors directly — change the vendor and Ops never knows.*

**Local-first** — The app fully works offline. It saves to the phone first, then
syncs up to the cloud whenever a signal's available — so a dead zone never stops you.
*Like writing your size-up on paper now and radioing it in once comms come back.*

**CRDT** — A special way of storing data so that when two phones make changes offline
and then reconnect, the app merges both automatically with no clash and no lost work.
(The name — "conflict-free replicated data type" — is a mouthful; the point is "no
collisions when everyone syncs back up.")

**IndexedDB** *(Dexie)* — The phone's built-in storage drawer for the app's offline
data — bigger and sturdier than the basic one v3 uses. (Dexie is just a friendlier
tool for working with it.)

**Optimistic update** — Showing the result of your tap instantly — before the cloud
confirms it — then quietly correcting if the save ever fails. Makes the app feel
immediate even on bad signal.
*Like marking a task done on your board the moment the crew calls it, trusting the paperwork will catch up.*

**Build A / Build C** — Two candidate designs for keeping many phones in sync on
scene. **Build A:** each phone syncs through the cloud and reconciles when signal
returns. **Build C:** a local hub on the scene's own Wi-Fi relays updates
phone-to-phone even with no internet. (Still an open choice.)

---

## Process & workflow
*(how the v4 planning work itself is run)*

**Gate** *(gate-ready)* — A planned stopping point where work pauses for your review
and sign-off before the next phase starts. "Gate-ready" means a phase is finished
and waiting on your go/no-go.
*Like a go/no-go check before committing crews.*

**ADR** *(Architecture Decision Record)* — A short note that records ONE design
decision: what we chose, why, and what we gave up — so months later nobody
re-litigates a settled call.
*Like documenting why the IC went defensive over offensive — the decision and its reasoning, on the record.*

**Phase-based group/individual split** — A rule for shore points built as a set
(like a 3-post shore): early on they move through the steps together as one unit;
once cutting starts, each piece is tracked on its own.
*Up to cutting, the set moves as a crew; at the cut station, each piece is its own task.*

**Coverage / decision matrix** — A big table listing every recommendation from every
planning write-up, each marked accepted, deferred, or dropped — so nothing falls
through the cracks.
*Like a tracking board where every action item has an owner and a status.*

**Synthesis** — The step where we read all the separate planning write-ups, find
where they agree and where they clash, and boil them into one path forward.
*Like the Planning Section taking everyone's input and producing a single action plan.*

**Brainstorm essay** — A long, deep write-up of the rebuild from ONE expert's angle
(the architect's view, the field user's view, the doctrine view, etc.). We wrote a
set of these, then combined them in synthesis.

**Dispatch** *(as in "dispatch the agents")* — Kicking off several AI helpers to work
on different parts at the same time. Just my word for "send them out in parallel."
*Like toning out multiple units to separate assignments at once.*

**Squash-merge** — Housekeeping when combining branches of code: it collapses a pile
of small saves into one tidy entry in the history. Cosmetic — it doesn't change the
code itself.

---

## UI / UX & design
*(what's on screen and how it behaves)*

**Primitives** *(design primitives)* — The smallest reusable building blocks of the
screens — one button, one card, one picker — each with its behavior carefully
specified. Bigger screens get assembled from these.
*Like standardized struts and base plates: a defined set of parts you combine into any configuration.*

**IA spec** *(Information Architecture spec)* — A document that lays out, for one
screen: what information is on it, how it's arranged, what matters most, and how it
reflows on a phone vs. a tablet vs. a laptop.
*Like a pre-plan for a screen — what goes where, before anyone builds it.*

**Broadcast** *(Broadcast TV)* — The big-screen, read-only view meant to be seen from
across the command post (8–12 feet away). Nobody taps it; it just shows the picture
for everyone.
*Like the status board on the command-post wall.*

**Glove-friendly / sunlight-readable** — Design tested for real field conditions: big
enough to hit with gloves on, high-contrast enough to read in blinding sun. (Plainly:
"will this work on a real scene, not just at a desk.")

**Slide-to-commit** *(status-only, always reversible)* — To advance a shore point's
status you deliberately swipe (not a quick tap that's easy to hit by accident), and
any authorized person can slide it back — no countdown, no locked-in mistakes.
*Like a deliberate two-action confirm so nothing advances on a fat-fingered tap.*

**Red-slash** *(removed from cut list)* — Instead of a piece silently vanishing when
it's pulled from a queue, its card stays put with a red diagonal line through it —
visible proof it was removed, not lost.
*Like crossing a name off the board instead of erasing it: everyone still sees it happened.*

**Progressive density** — Showing the same information at different detail levels by
screen size: a phone shows just the next action; a tablet adds resources; a laptop
adds history; the big screen adds the map.
*Same picture, zoomed to fit whoever's holding what.*

**Shell** *(React tree)* — The outer frame that holds the whole app — the header,
the navigation, and the container the screens live in. v4 rebuilds it with modern
tooling (React).
*Like the apparatus body that all the compartments mount into.*

---

## Git & releases
*(saving code and shipping versions)*

**Branch** *(e.g. the `v4-redesign` branch)* — A separate working copy of the code
where we build and experiment without touching the live app. v4 lives on its own
branch until it's ready.
*Like drawing up and rehearsing a new plan off to the side while the current operation runs uninterrupted.*

**main** — The live, in-production copy of the code — what real users are actually
running. We never experiment directly on it.
*The version that's actually on scene.*

**Push on commit** — Your standing rule: whenever I save a batch of changes (a
**commit** = a saved checkpoint), I also send it up to the shared cloud copy (a
**push** = the upload) in the same step — no separate ask.

**Bucket 1 / Bucket 2** — How we sorted the v4 ideas: **Bucket 1** = safe
improvements we can ship to the current app now; **Bucket 2** = bigger changes that
have to wait for the full v4.
*Like triage: treat-now vs. hold-for-the-next-op.*

**Cutover** *(Phase J)* — The moment the finished v4 finally replaces v3 as the live
app. The last step of the whole plan.
*Like transfer of command: one clean hand-off to the new structure, on the record.*

---

## ICS / NIMS meets tech
*(where doctrine and software overlap)*

**Doctrine-aligned** *(defer to doctrine)* — Following official ICS/NIMS terms and
structure exactly as published, instead of inventing our own shorthand. When in
doubt, the app matches the book. (Plainly: "say it the way NIMS says it.")

**Traceability / audit trail** — The record of who did what, when, and from which
phone — kept so the operation can be reviewed or defended afterward.
*Like a complete, time-stamped command log for after-action and liability.*

---

*Missing a term? Tell me and I'll add it. This list is meant to grow.*
