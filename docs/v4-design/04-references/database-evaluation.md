# Database / Backend Evaluation for v4.0

> A reference + decision document answering Alex's question: **"Is Firebase the best database to use moving forward?"** The recommendation here is intended to become an ADR (proposed number ADR-007). It is scoped to the v4.0 data layer and the v5.0 React Native fork. Author: data-resilience agent (Opus 4.8 1M), 2026-05-31. Status: **Proposed** — pending Alex's sign-off before promotion to `11-decisions/`.

---

## TL;DR

**Stay on Firebase Realtime Database for v4.0.** Keep RTDB as the sync backend, move the *client* to the modular SDK, move *local storage* from `localStorage` to IndexedDB (Dexie), and put a thin repository seam (`data/sync`) between the app and Firebase so the backend is swappable. RTDB is the only candidate that satisfies all seven hard constraints today at zero incremental cost, and the v3 hardening (local-first writes, `pendingWrites` flush, diagnostics ledger, schema-generated rules) was *bought against RTDB's exact semantics* — it crosses verbatim only if RTDB stays.

**Second choice: PowerSync + Supabase (Postgres).** This is the option to switch to *if and only if* the multi-device offline-reconcile story (D5 Build A) proves it needs a real SQLite-backed sync engine with a typed conflict model — i.e., if RTDB's last-write-wins-per-path semantics produce field-level data loss in Level II/I field testing. PowerSync is the only managed product in this set with first-class, multi-hour offline support and a credible React Native path.

The event-sourced append-only log (synthesis §3.6, §4 "Data model") is the structural decision that *de-risks* this choice: if every write is an immutable append, the backend is reduced to "an append-and-fan-out pipe," and LWW conflicts mostly disappear regardless of which backend wins. **The data model matters more than the database.**

---

## Why this doc exists

The v4 synthesis (`06-synthesis.md` §1.7, §4 "Offline / sync", §4 "Data model") is written assuming **Firebase RTDB + IndexedDB/Dexie**. That assumption was inherited from v3, not re-derived for v4. Before we pour a ground-up rewrite onto it, the assumption deserves an honest adversarial pass against the alternatives. This is that pass.

The audience is a technical decision-maker who has to defend the choice to a USAR program manager or a HIPAA-adjacent department admin reading the "how sync works" page (synthesis §3 / Phase G marketing brief). The standard is: *would this survive a skeptical chief asking "what happens when the cell tower is down for six hours and three iPads edited the same shore point?"*

---

## The seven hard constraints

Restated from the brief, in priority order, with the test each must pass:

1. **Offline-for-hours.** Cell and internet down for hours at an incident. Each device fully self-sufficient offline; persists locally; reconciles when comms return. **The #1 constraint.** Test: pull the plug for 6 hours, make 50 writes, restore — zero data loss.
2. **Multi-device reconcile (D5 Build A).** Multiple teams, multiple devices, edit the same operation offline, reconcile on reconnect. Needs a *credible* conflict story (LWW / CRDT / OT / doctrine-aware merge). Test: two iPads advance the same shore point offline; reconcile produces a defensible result, not a silent clobber.
3. **Append-only event log / audit ledger.** v4 is event-sourced (synthesis §3.6, §4). The audit log (who-did-what, for after-action + liability) is a *filtered view* of that same log. Backend should make append-only streams natural. Test: an `events/` collection per operation that only ever grows, indexed by time, queryable for ICS-209 reconstruction.
4. **PWA now, React Native at v5.** Must work in a browser PWA today and have a viable RN path. Test: same `core` + `data/sync` package compiles and runs under RN with the same sync semantics.
5. **Role-gated security rules.** Per-device UID → Owner/Admin/Member/Observer, server-enforced. **Offline auth token must survive multi-hour windows.** Test: device offline 6 hours still authorized to write locally and flush on reconnect.
6. **Cost at department scale.** Small departments, handful of concurrent devices per incident, not SaaS-scale. Free/cheap tier matters. Self-host is a plus, but departments won't run servers. Test: a 30-device federal incident for 36 hours stays inside a free or <$25/mo tier.
7. **Migration cost off the v3 Firebase investment.** Quantify honestly what's forfeited: local-first write architecture, `pendingWrites` flush, `/diagnostics/sync/` ledger, first-fire listener guards, schema-generated rules, SRI-pinned SDK.

---

## Scoring matrix

Scoring: **A** = strong fit, no caveats · **B** = works with known caveats · **C** = works but needs significant glue/cost · **D** = poor fit / disqualifying gap. Notes explain — the letter alone is not the argument.

### Constraint 1 — Offline-for-hours (the #1 constraint)

| Candidate | Score | Notes |
|---|---|---|
| **Firebase RTDB** (incumbent) | **B** | True offline persistence on web requires the SDK cache; the v3 app layers its own `localStorage`/`pendingWrites` queue on top precisely because the web SDK's offline cache historically lagged the mobile SDKs. With the v3 local-first contract this is a solved, *battle-tested* problem — but the resilience lives in *our* code, not the platform. |
| **Firestore** | **C** | Offline persistence exists, but the billing model punishes long offline windows: *"if the listener is disconnected for more than 30 minutes… you will be charged for documents and index entries read as if you had issued a brand-new query."* ([Firestore pricing](https://firebase.google.com/docs/firestore/pricing)). A 6-hour offline window followed by a full re-read on every device is a cost and bandwidth footgun for exactly our scenario. |
| **Supabase (alone)** | **D** | No first-class offline. "Offline support" is the single most-upvoted, most-commented discussion in the Supabase org and remained unsolved for years ([supabase #357](https://github.com/orgs/supabase/discussions/357)). Realtime drops on disconnect; you must bolt on PowerSync or ElectricSQL. |
| **PocketBase** | **C** | SQLite server-side, but **no built-in offline sync** — community 2-way-sync examples only ([PocketBase #67](https://github.com/pocketbase/pocketbase/discussions/67)). You build the offline engine yourself. |
| **RxDB + replication** | **A** | Purpose-built for offline-first. Local RxDB store survives indefinitely; replication resumes on reconnect; only newest revision stored on client ([RxDB CouchDB replication](https://rxdb.info/replication-couchdb.html)). |
| **ElectricSQL** | **B** | Local-first on Postgres with formal consistency guarantees ([Supabase × Electric](https://supabase.com/partners/integrations/electricsql)); offline is real but the product has churned heavily (read-path rewrite) — maturity risk. |
| **PowerSync** | **A** | "The only [Supabase sync engine] with first-class offline support" — writes go to a local SQLite upload queue and flush when connectivity returns ([PowerSync × Supabase](https://www.powersync.com/blog/offline-first-apps-made-simple-supabase-powersync)). Designed for exactly hours-offline-then-reconcile. |
| **Convex** | **D** | Server is the single source of truth; **you cannot write data offline** ([offline-first landscape 2025](https://marcoapp.io/blog/offline-first-landscape) and PkgPulse comparison). Disqualifying on constraint 1. |
| **InstantDB** | **B** | Optimistic local-first writes, server-authority-wins on conflict, offline-friendly, "spiritual successor to Firebase" ([landscape](https://marcoapp.io/blog/offline-first-landscape)). Caveat: reported query perf cliffs (200–500ms) and immature TS types as of 2025. |
| **Triplit** | **B** | CRDT-based, genuine offline. Caveat: reported to fail under load — "under 100,000 entities, subscriptions would time out, fail, and become out of date" ([landscape](https://marcoapp.io/blog/offline-first-landscape)). Our entity counts are low (250 SPs max), so this may not bite us, but it is a yellow flag on production-readiness. |
| **IndexedDB (Dexie) + Yjs/Automerge** | **A** | The local store *is* the source of truth; offline is the default state, not a mode. Fully self-sufficient by construction ([Dexie](https://dexie.org/), [Yjs](https://github.com/yjs/yjs)). |

### Constraint 2 — Multi-device reconcile (D5 Build A)

| Candidate | Score | Notes |
|---|---|---|
| **Firebase RTDB** | **B** | Conflict model is **last-write-wins per path**. Our mitigation (synthesis §1.9, v3.6.0/v3.9.0) is granular `update()` on changed keys + the `STATUS_ORDER` progression guard that refuses to regress a shore point past its current status. That is a *doctrine-aware merge* hand-built on top of LWW — it works, and it's the most field-tested merge in this whole set, but it's our code, per write site. |
| **Firestore** | **B** | Same LWW-per-document story; document granularity is coarser than RTDB paths, which is *worse* for two devices editing different fields of one shore point unless you decompose into subdocuments. |
| **Supabase + PowerSync** | **B+** | Postgres is server-authority; PowerSync's upload queue replays local writes against server state. Conflict resolution is *your* `CrudTransaction` handler — explicit, typed, testable. More principled than RTDB's path-LWW, at the cost of writing the handler. |
| **ElectricSQL** | **A−** | "Conflict-free programming model and formal guarantees for consistency and integrity" ([Electric × Supabase](https://supabase.com/partners/integrations/electricsql)) — CRDT-backed merge on Postgres. Strongest *automatic* story, but you inherit CRDT merge semantics whether or not they match doctrine. |
| **PocketBase** | **C** | No built-in conflict resolution; you own it entirely. |
| **RxDB / CouchDB** | **B** | Revision-tree conflict detection; conflicts surfaced during replication, resolved by your handler ([RxDB](https://rxdb.info/replication-couchdb.html)). Mature but you write the resolver. |
| **Convex** | **A** (but moot) | Server transactions run atomically so "conflicts simply cannot occur" — but only because there is no offline write. Irrelevant given constraint-1 failure. |
| **InstantDB** | **B** | Server-authority-wins, Firebase-like. Same merge caveats as RTDB. |
| **Triplit** | **A−** | CRDT automatic conflict resolution out of the box. Same "CRDT may not equal doctrine" caveat as Electric. |
| **Dexie + Yjs/Automerge** | **A** | CRDTs are *the* multi-writer-offline answer — concurrent edits merge without manual resolution ([Yjs](https://github.com/yjs/yjs)). But: "implementing CRDTs has basically the same complexity as implementing conflict resolution" ([RxDB CRDT](https://rxdb.info/crdt.html)), and a CRDT merge of "two devices set status" is not automatically the *doctrine-correct* merge. You'd still wrap it in the `STATUS_ORDER` guard. |

> **The reframing that matters.** If v4 is genuinely event-sourced (synthesis §3.6, §4) — an append-only `events/` log per operation, current state as a projection — then **conflict resolution mostly evaporates regardless of backend.** Two devices appending "advanced SP-12 to runner" and "advanced SP-12 to secured" produce two immutable events; the projection reducer applies `STATUS_ORDER` and the audit log keeps both. There is no field to clobber. This is why the *data model* is the higher-leverage decision than the *database*, and why a relatively weak-conflict backend (RTDB) becomes acceptable: we are not asking it to merge state, only to fan out an append-only log. The event log turns every candidate's conflict score into a near-tie.

### Constraint 3 — Append-only event log / audit ledger

| Candidate | Score | Notes |
|---|---|---|
| **Firebase RTDB** | **A−** | `push()` generates time-ordered, chronologically-sortable keys — append-only is native and free. `events/{opId}/` under a push-key list is the natural shape; no schema migration to support it. Caveat: no server-side aggregation/query language — projections are computed client-side (which is the v4 plan anyway). |
| **Firestore** | **B+** | Append via auto-ID docs in a subcollection; richer queries (`where`/`orderBy`/composite indexes) for ICS-209 reconstruction. Costs per-document-read on replay (see constraint 1 cost note). |
| **Supabase / Postgres (any flavor)** | **A** | An append-only `events` table is the canonical event-sourcing substrate; SQL is ideal for projection queries and after-action analytics. The most natural fit *on paper* for an audit ledger. |
| **PocketBase** | **A−** | Same Postgres-shaped story on SQLite; append-only table + SQL queries. |
| **RxDB / Convex / Instant / Triplit** | **B** | All can model an append-only collection; none obstruct it. Convex's server functions are actually a clean place to enforce append-only invariants — but it's offline-disqualified. |
| **Dexie + Yjs/Automerge** | **B+** | Yjs/Automerge *are* operation logs internally; an explicit domain event log on top is straightforward. Automerge notably "stores a complete history of all changes" ([landscape](https://marcoapp.io/blog/offline-first-landscape)) — literally an audit trail by construction. |

### Constraint 4 — PWA now, React Native at v5

| Candidate | Score | Notes |
|---|---|---|
| **Firebase RTDB** | **A** | First-class web *and* RN SDKs (`@react-native-firebase` and the JS SDK). The `data/sync` seam is the only thing that changes between platforms. Lowest-risk RN path in the set. |
| **Firestore** | **A** | Same. |
| **Supabase + PowerSync** | **A** | PowerSync ships official React Native SDKs; this is a primary target for them. |
| **ElectricSQL** | **B** | RN supported but less battle-tested than PowerSync; product churn risk. |
| **PocketBase** | **B** | JS SDK works in RN; offline engine is yours on both platforms. |
| **RxDB** | **A−** | RN storage adapters exist (op-sqlite / SQLite). Good fit, more wiring. |
| **Convex** | **A** (moot) | Excellent RN SDK; offline-disqualified. |
| **InstantDB** | **A** | Explicitly recommended for "offline-friendly data for React Native" ([landscape](https://marcoapp.io/blog/offline-first-landscape)). |
| **Triplit** | **B** | RN supported; load concerns noted above. |
| **Dexie + Yjs** | **B** | Dexie is web-IndexedDB; on RN you swap to op-sqlite/WatermelonDB for Yjs persistence ([RN CRDT 2025](https://the-expert-developer.medium.com/react-native-in-2025-offline-first-collaboration-with-crdts-automerge-yjs-webrtc-sync-1d87f45455d6)). The storage layer is *different* between PWA and RN — more divergence than the managed options. |

### Constraint 5 — Role-gated security rules + offline auth window

This is the constraint where the candidates diverge most sharply, and it deserves its own section (below). Summary scores:

| Candidate | Score | Notes |
|---|---|---|
| **Firebase RTDB** | **A−** | Declarative rules gate on `auth.uid` + a `members/{uid}` lookup — exactly the Owner/Admin/Member/Observer model the synthesis already specs (§4 "Auth / identity"). v3's rules are *already this shape*. **Offline auth: the ID token expires in ~1h, but the refresh token is long-lived and persisted (`LOCAL`); the SDK re-mints the ID token on reconnect. Crucially, local writes are queued without a live token and authorized at flush.** See deep-dive. |
| **Firestore** | **A−** | Same rules language and same auth substrate. |
| **Supabase + PowerSync** | **B** | Row-Level Security (RLS) in Postgres is *more* powerful than Firebase rules and SQL-native. Offline auth: Supabase uses JWT access tokens (default 1h) + refresh tokens; PowerSync holds the connection token. Multi-hour offline relies on a valid refresh token at reconnect — workable but you own the token-lifecycle glue. |
| **ElectricSQL** | **B** | Integrates with Supabase Auth + RLS. Same token story. |
| **PocketBase** | **C** | Per-collection API rules; auth is JWT. Offline token handling is entirely yours. |
| **RxDB / CouchDB** | **C** | CouchDB has per-database auth; fine-grained per-field role gating is awkward. |
| **Convex** | **B** (moot) | Good auth, function-level gating; offline-disqualified. |
| **InstantDB** | **B** | Permission rules exist; younger product, fewer guarantees. |
| **Triplit** | **B** | Rules exist; younger product. |
| **Dexie + Yjs** | **D** | **No server, no server-enforced rules.** Security is whatever the sync relay enforces — which you build. For a liability-bearing audit log, "no server-side authority" is a serious gap. Disqualifying for role-gated rules unless paired with a backend, at which point it's no longer this candidate. |

### Constraint 6 — Cost at department scale

| Candidate | Score | Notes |
|---|---|---|
| **Firebase RTDB** | **A** | Spark (free) tier covers our scale comfortably: small departments, ~30 devices for a multi-day federal incident, low data volume (struts/shore-points/events are tiny JSON). Pricing is GB-stored + GB-transferred ([Firebase pricing](https://firebase.google.com/pricing)). We already run inside it at v3 scale, including Surfside TTX-2 simulations. |
| **Firestore** | **B** | Free daily read/write quotas, but the *per-operation* billing + the 30-min-offline-reread penalty mean a multi-device, long-offline incident reads expensively on reconnect. Predictable cost is harder. |
| **Supabase + PowerSync** | **C** | Supabase free tier is generous (500MB DB, 50k MAU, 200 concurrent realtime, 2M realtime msgs/mo) **but pauses a free project after 7 days of inactivity** ([Supabase pricing](https://supabase.com/pricing)). A department that runs one incident a month would hit a *paused database* — unacceptable for an emergency tool. That forces the $25/mo Pro tier to stay alive. Plus PowerSync's own pricing/infra on top. **Cheapest realistic floor ≈ $25/mo + PowerSync.** |
| **PocketBase** | **B** | Self-host on a cheap VPS (~$5/mo) — but "departments won't run servers" (constraint 6), so *someone* (Alex) operates it. Single-binary, low ops, but it's still ops + a SPOF. |
| **ElectricSQL** | **C** | Supabase floor + Electric service. Same pause caveat. |
| **Convex / Instant / Triplit** | **B/C** | Managed free tiers exist; pricing scales with usage; all are startups — pricing-model and longevity risk for a multi-year liability tool. |
| **Dexie + Yjs** | **A** (storage) / **C** (sync) | Local storage is free; but multi-device sync needs a relay (y-websocket / WebRTC signaling / custom server) — which is cost + ops you now own. |

### Constraint 7 — Migration cost off v3 / lock-in risk

| Candidate | Score | Notes |
|---|---|---|
| **Firebase RTDB** | **A** | **Zero migration.** Every v3 hardening artifact crosses verbatim: local-first write contract (v3.5.3), `pendingWrites` flush (v3.8.1), `/diagnostics/sync/` ledger (v3.8.1/v3.8.2), first-fire listener guards (S7), schema-generated rules (the v3.8.2 fix → Zod-generated `database.rules.json` per synthesis §1.9), SRI pins (v3.9.0). The v3 → v4 one-time migration (synthesis §4 "Auth") stays a *data reshape*, not a *backend port*. **Lock-in risk:** real but bounded by the `data/sync` repository seam — see migration section. |
| **Everything else** | **C–D** | Forfeits all of the above and re-derives it against a new platform's semantics. The v3.8.2 incident (a validate-rule field mismatch silently `PERMISSION_DENIED`-ing every inventory write for *months*) is the cautionary tale: every backend has a class of silent-failure bug you only find in the field, and we have already paid that tuition on RTDB. Switching backends means paying it again on a new platform, in a liability-bearing safety tool. |

### Aggregate (weighted by stated priority — constraint 1 and 7 weighted heaviest)

| Candidate | 1 Offline | 2 Reconcile | 3 Event log | 4 RN | 5 Rules/auth | 6 Cost | 7 Migration | Verdict |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **Firebase RTDB** | B | B | A− | A | A− | A | A | **Recommended v4.0** |
| Firestore | C | B | B+ | A | A− | B | C | Reject — offline cost penalty |
| **Supabase + PowerSync** | A | B+ | A | A | B | C | C | **Second choice / switch target** |
| ElectricSQL (+Supabase) | B | A− | A | B | B | C | C | Watch — maturity risk |
| PocketBase | C | C | A− | B | C | B | C | Reject — DIY offline + SPOF |
| RxDB + CouchDB | A | B | B | A− | C | B | C | Reject — auth/rules weak |
| Convex | D | A* | B | A | B | B/C | C | Reject — no offline writes |
| InstantDB | B | B | B | A | B | B | C | Watch — young, perf cliffs |
| Triplit | B | A− | B | B | B | C | C | Watch — load failures |
| Dexie + Yjs/Automerge | A | A | B+ | B | D | A/C | C | Reject — no server authority |

\* Convex conflict score is moot because it cannot write offline.

---

## Recommendation

### Primary: **Firebase Realtime Database, modular SDK, behind a repository seam.**

For v4.0, keep RTDB as the sync backend. Concretely:

1. **Client SDK:** migrate from compat (`firebase-*-compat.js`) to the **modular v9+ SDK** (synthesis §4 "Tech debt": "Firebase compat SDK (move to modular)"). Tree-shakeable, typed, Vite-native.
2. **Local store:** move from `localStorage` to **IndexedDB via Dexie** (synthesis §4 "Offline / sync") — larger quota, structured, transactional. The v3 `safeSetItem`/`safeParse` scatter centralizes into `data/store`.
3. **Backend seam:** all RTDB access goes through `data/sync` repositories (`OperationRepo`, `ShorePointRepo`, etc., per synthesis §4 "Data model"). **No Firebase import outside `data/`.** This is the lock-in insurance: swapping to PowerSync later is a `data/sync` rewrite, not an app rewrite.
4. **Event-sourced writes:** `events/{opId}/` append-only push-key list; projections computed in `core`. This is the structural decision that makes RTDB's weak conflict model acceptable and makes a future backend swap a transport change, not a semantic one.
5. **Rules from schema:** generate `database.rules.json` from the same Zod schema the client validates against (synthesis §1.9). CI asserts generated == committed. The v3.8.2 silent-failure class disappears permanently.

**Why RTDB wins for v4.0:** It is the only candidate that scores A/B on *every* constraint with *zero* migration cost, and the entire v3 resilience investment — which is the most field-tested local-first stack we will ever have — crosses verbatim. The two places RTDB is merely "B" (offline-cache reliance on our own queue; LWW conflict) are *already solved in v3 code* and are further neutralized by the event-log data model. Every alternative trades a known, paid-for, field-tested risk for an unknown one, in a tool where the failure mode is a firefighter trusting a stale shore-point status.

### Second choice: **Supabase (Postgres) + PowerSync.**

The strongest *non-Firebase* stack. Postgres is the ideal event-log + audit-ledger substrate (SQL projections for ICS-209), PowerSync is the only managed sync engine with genuine first-class multi-hour offline, RLS is more powerful than Firebase rules, and the RN path is first-class. It loses to RTDB only on **migration cost** (re-derive all v3 hardening) and **the free-tier 7-day pause** (forces $25/mo to stay alive — a non-starter for an emergency tool on the free tier).

### Conditions under which I'd switch to the second choice

Switch to **Supabase + PowerSync** if *any* of these become true:

- **Field-test data loss.** Level II/I testing shows RTDB path-LWW losing field-level edits that the `STATUS_ORDER` guard + event log don't catch. (This is the real trigger — if the event-log model holds, RTDB is fine.)
- **Audit-query needs outgrow client-side projection.** If ICS-209 / after-action reconstruction needs server-side SQL aggregation across operations that's painful to compute client-side over RTDB JSON.
- **Build C (CP hub) at v5.** The synthesis defers the local WebSocket relay to v5/RN. If Build C wants a self-hostable on-scene hub, PowerSync's self-host story (or PocketBase) becomes attractive — *but* re-evaluate then, not now.
- **Google pricing or product risk.** Firebase RTDB de-prioritization (Google steering everyone to Firestore) would force the question.

Do **not** switch for: developer aesthetics, "Postgres is nicer," or NoSQL distaste. None of those outweigh forfeiting the v3 hardening in a liability tool.

---

## Deep dive: the offline auth-window problem

This is the constraint most likely to silently break a field tool, so it gets explicit treatment.

**The problem.** Firebase ID tokens (JWTs) are short-lived — **~1 hour** ([Firebase verify-id-tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)). A naive design that requires a *live* ID token to write would lock a firefighter out after an hour offline. That is unacceptable for the #1 constraint.

**Why it's actually fine on Firebase (RTDB and Firestore):**

- **Refresh tokens are long-lived and persisted.** "Firebase Authentication sessions are long lived… exchanged for a Firebase ID token (a JWT) and refresh token. Refresh tokens expire only when [a major account change occurs / disabled / deleted / >1y inactive]" ([manage sessions](https://firebase.google.com/docs/auth/admin/manage-sessions)). With `LOCAL` persistence (synthesis §4 "Auth": "Per-device Firebase Anonymous UID + Firebase `LOCAL` persistence"), the refresh token survives app restarts and multi-hour offline windows in IndexedDB.
- **Local writes don't need a live token.** In the v3 local-first contract, writes go to in-memory state + local storage *first* and are queued. They are authorized by the rules engine **at flush time**, when the SDK has already re-minted a fresh ID token from the persisted refresh token on reconnect. The offline window never touches the auth check.
- **The known gotcha** (from the search): `getIdToken()` can occasionally throw `auth/user-token-expired` after long dormancy or if the refresh token was revoked. Mitigation: the flush path must call `getIdToken(true)` (force-refresh), catch the failure, and — if the refresh token is genuinely dead — fall back to a silent re-`signInAnonymously()` that re-establishes the *same persisted UID* mapping, then retry the queued writes. This belongs in `data/sync` as an explicit, tested path (it's the v4 analog of the v3 `pendingWrites` flush + `/diagnostics/sync/` logging).

**How the others compare:** Supabase/PowerSync/Electric all use the same JWT-access + refresh-token pattern (default 1h access token), so they have the *same* problem with the *same* solution — but you own more of the glue, and PowerSync's connection token is an extra moving part. PocketBase, RxDB/CouchDB, Yjs leave the entire token lifecycle to you. **Net: Firebase has the most mature, documented answer, and v3 already implements it.**

---

## QR-code on-scene sign-in

The brief raises a concrete v4 idea: a firefighter **arrives on scene, scans a QR code, signs in, and inputs suggested info** (likely name, agency, role assignment — feeding the roster / PAR). How does the backend choice interact?

**Firebase makes this *easier*, not harder, and the event log makes it cleaner:**

- **The QR carries an operation/department join token, not a credential.** The QR encodes `{deptId, opId, joinToken}` (the joinToken a short-lived, single-purpose value the IC's device or a Cloud Function minted). The arriving device, already silently signed in as an **Anonymous UID** (guest mode is the v4 default first-run — synthesis §4 "Auth"), scans it and calls a join flow that registers its UID as a `Member`/`Observer` of `/departments/{deptId}/members/{uid}` and appends a `responderCheckedIn` event to `events/{opId}/`. **No password, no account — the per-device anonymous UID *is* the identity**, which is exactly the model the synthesis already adopts.
- **`signInWithCustomToken` is the upgrade path if needed.** If a QR must convey *role* server-side authoritatively (e.g., scanning the "Safety Officer" placard grants that role), a Cloud Function validates the join token and mints a **custom token** carrying role claims ([custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)); the device calls `signInWithCustomToken()`. This is a well-trodden Firebase pattern. Anonymous → custom-token account *linking* is supported, so the device keeps its local data across the upgrade.
- **The check-in is offline-tolerant.** Because the join is an *append* to the event log, a device that scans the QR while comms are down queues the `responderCheckedIn` event and flushes on reconnect — consistent with constraint 1. The roster projection shows the responder as "pending sync" (the per-row sync state the synthesis already specs for the PAR test case, §1.7).
- **Supabase/PowerSync** can do all of this too (RLS + a join RPC + JWT), but you build the token-minting endpoint and the offline-queued-join yourself. Firebase Cloud Functions + the existing anonymous-UID model is less glue.

**Verdict: the QR idea is *additive* to the recommended stack** — it reuses guest-mode anonymous UID, the members/role rules, and the append-only event log. It does not argue for or against any candidate; if anything it mildly favors Firebase because the anonymous-UID-as-identity model is already first-class.

---

## Migration cost vs. lock-in risk

Because the recommendation is **stay**, the relevant number is **lock-in risk**, not migration cost. Both, honestly:

**If we stay (recommended) — lock-in risk:**

- **Exposure:** RTDB's path-LWW conflict model and its JSON-tree query limits are baked into how we shape data. Google could de-prioritize RTDB (they steer new projects to Firestore).
- **Mitigation already in the plan:** the `data/sync` repository seam (no Firebase import outside `data/`) means a backend swap is a bounded rewrite of one package, not the app. The **event-sourced log makes the swap a transport change** — an `events/` append stream ports to any append-capable backend with the projection logic untouched in `core`. Estimated swap cost *with the seam in place*: re-implement ~8 repos against a new SDK + re-derive rules + re-test the flush/diagnostics path. Weeks, not a rewrite. **The seam is the insurance premium; pay it in v4.0.**

**If we leave (the switching cost we'd forfeit):**

The v3 Firebase investment that does *not* survive a backend change:

| v3 artifact | What it cost to harden | Re-derivation on a new backend |
|---|---|---|
| Local-first write contract (v3.5.3) | Eliminated the `if(db){}else{}` fork across **44 mutation sites** | Re-establish against new SDK semantics |
| `pendingWrites` flush + version filter (v3.8.1/v3.8.2) | Error capture, version-discard, retry | Rewrite for new queue model |
| `/diagnostics/sync/` ledger (v3.8.1/v3.8.2) | Sync-event + transaction-failure logging | Rebuild observability |
| First-fire listener guards (S7) | Don't wipe local on empty first snapshot | Re-derive per new listener model |
| Schema-generated rules (v3.8.2 → Zod) | The fix for a **months-long silent `PERMISSION_DENIED`** | Rewrite rules in new policy language (RLS, etc.) |
| SRI-pinned SDK (v3.9.0) | Supply-chain hardening | Re-pin new SDK |

The honest framing: **moving off Firebase doesn't just cost the port — it resets the field-hardening clock.** Every one of those line items was found *in production, the hard way*. A new backend has its own undiscovered v3.8.2-class bugs. For a tool where a stale shore-point status is a safety call, re-paying that tuition needs a strong reason. The event log + repository seam lets us *keep the option open cheaply* without paying it now.

---

## What this means for the synthesis

The recommendation **confirms** the synthesis's current direction with three sharpenings:

- **§1.7 / §4 "Offline / sync":** No change to the conclusion (Build A on RTDB + IndexedDB/Dexie). **Sharpen** the offline-auth note: the flush path must `getIdToken(true)` with a silent-re-anon fallback on `user-token-expired`, logged to `/diagnostics/sync/`. Add the explicit 6-hour-offline acceptance test to the QA-driver suite (hand to `qa-driver` for offline-drop simulation).
- **§4 "Data model":** **Strengthen** the event-sourcing commitment. The append-only `events/{opId}/` log is not just an audit feature (§3.6) — it is *the* mechanism that makes RTDB's weak conflict model safe and makes the backend swappable. Recommend the synthesis state explicitly: *projections live in `core`, never in the backend; the backend is an append-and-fan-out pipe.*
- **§4 "Tech debt" / §1.9:** Already correct (modular SDK, Zod-generated rules, Dexie). **Add:** the `data/sync` repository seam is a named architectural requirement, justified as backend-swap insurance, with the lint rule "no Firebase import outside `data/`."

No synthesis section needs to be *reversed*. The Firebase assumption survives the adversarial pass — but it should now be a *defended* choice (this doc → ADR-007), not an inherited default.

---

## Open questions surfaced

- **OQ:** Should v4.0 pre-build the PowerSync `data/sync` adapter as a proof-of-seam (even if unused), to prove the abstraction holds before we depend on it? (Cheap insurance; ~1–2 days.)
- **OQ:** At what incident scale does client-side event-log projection over RTDB JSON become a perf problem (250 SPs × N events × 30 devices)? Needs a Level I projection-perf benchmark.
- **OQ:** Does the QR on-scene sign-in need authoritative server-side role claims (→ custom-token Cloud Function) or is client-asserted-role-pending-Admin-approval enough for v4.0? (Affects whether we add a Cloud Function dependency.)

---

## Sources

- [Choose a Database: Cloud Firestore or Realtime Database — Firebase](https://firebase.google.com/docs/database/rtdb-vs-firestore)
- [Firestore pricing — offline-listener 30-minute re-read rule (Firebase)](https://firebase.google.com/docs/firestore/pricing)
- [Firebase pricing (Spark/Blaze)](https://firebase.google.com/pricing)
- [Realtime Database limits (Firebase)](https://firebase.google.com/docs/database/usage/limits)
- [Manage user sessions — refresh-token longevity (Firebase Auth)](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Verify ID tokens — ~1h ID-token lifetime (Firebase Auth)](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Create custom tokens — signInWithCustomToken (Firebase Auth)](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [PowerSync + Supabase — first-class offline](https://www.powersync.com/blog/offline-first-apps-made-simple-supabase-powersync)
- [PowerSync × Supabase integration guide](https://docs.powersync.com/integration-guides/supabase-+-powersync)
- [ElectricSQL × Supabase — conflict-free / formal guarantees](https://supabase.com/partners/integrations/electricsql)
- [Supabase offline support discussion (#357) — most-requested feature](https://github.com/orgs/supabase/discussions/357)
- [Supabase pricing — free-tier limits + 7-day inactivity pause](https://supabase.com/pricing)
- [PocketBase FAQ — SQLite/WAL, SSE realtime, self-host](https://pocketbase.io/faq/)
- [PocketBase offline-sync discussion (#67) — no built-in offline](https://github.com/pocketbase/pocketbase/discussions/67)
- [RxDB CouchDB replication — conflict-during-replication, newest-revision-only](https://rxdb.info/replication-couchdb.html)
- [RxDB CRDT — "same complexity as conflict resolution"](https://rxdb.info/crdt.html)
- [Offline-First Landscape 2025 (Convex no-offline-write, Triplit/InstantDB/PowerSync caveats)](https://marcoapp.io/blog/offline-first-landscape)
- [Convex vs InstantDB vs ElectricSQL real-time sync (PkgPulse)](https://www.pkgpulse.com/guides/convex-vs-instantdb-vs-electricsql-real-time-sync-2026)
- [Dexie.js — offline-first IndexedDB](https://dexie.org/)
- [Yjs — CRDT shared data types](https://github.com/yjs/yjs)
- [React Native 2025 — offline-first CRDTs (Automerge/Yjs/WebRTC)](https://the-expert-developer.medium.com/react-native-in-2025-offline-first-collaboration-with-crdts-automerge-yjs-webrtc-sync-1d87f45455d6)
