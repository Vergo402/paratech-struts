# ADR-040: Broadcast cast transport — OS screen-mirroring

> Architecture Decision Record. Resolves open question #34 (`99-open-questions.md`); refines the transport-independent IA in [`60-broadcast-view.md`](../08-information-architecture/60-broadcast-view.md).

---

## Status

- [x] Accepted

**Date:** 2026-07-02
**Author:** v4 build session (transport-decision batch, S2)
**Reviewer(s):** Alex (decision — screen-mirror over browser-on-TV)

---

## Context

Broadcast View ([`60-broadcast-view.md`](../08-information-architecture/60-broadcast-view.md), [#213](https://github.com/Vergo402/paratech-struts/issues/213)) is the read-only projection mode that renders an eligible board (default: the SitStat C-13 layout) on a 1920×1080 wall display, legible at 8–12 ft. The IA is deliberately **transport-independent** — the board content, the ≥32pt floor, the left-border-accent status, the zero-motion 15s poll, and the read-only "renders no interactive primitive" rule all hold regardless of how the pixels reach the TV. What was left open (#34) is the **transport**: Chromecast / AirPlay / a browser opened directly on a TV / WebRTC screen-share.

Two constraints shape the real choice:

- **A web app (PWA) cannot start AirPlay or Chromecast mirroring itself.** OS screen-mirroring is initiated by the user in the phone/tablet Control Center or cast menu; it is not an API the app calls. So "mirror" is not app code — it is an OS capability the app cooperates with.
- **Whichever transport is chosen, the app-side work is the same one thing: a full-screen, read-only broadcast board view** (the C-13 layout), driven by the synced event log on whatever device displays it. Mirroring that view and opening that view's URL on a TV browser produce the identical picture; they differ only in how the pixels travel.

## Decision

**The v4.0 broadcast transport is OS screen-mirroring (AirPlay / Chromecast)** (Alex, 2026-07-02).

- The app provides a **full-screen read-only broadcast board mode** — the C-13 projection at broadcast density, no chrome, no interactive primitive. This is the single app-side deliverable.
- The operator casts by **mirroring that screen** to the TV with the device's built-in mirroring (AirPlay from an iPhone/iPad, Cast from an Android/Chrome device). No in-app cast protocol, no pairing code, no projection-registry handshake in v4.0.
- Because the app-side deliverable is just a URL-addressable full-screen board, **opening that board's URL directly in a browser on the TV (or a stick/mini-PC/laptop attached to it) remains a zero-extra-code fallback** for rooms without a mirroring-capable display — same view, no cast protocol either.

### This amends "pin, not mirror" for v4.0

[`60-broadcast-view.md`](../08-information-architecture/60-broadcast-view.md) §Two governing decisions and [ADR-015](ADR-015-navigation-pattern.md) framed broadcast as **pin-not-mirror** — the caster pins one *chosen board* to the wall while keeping working on its own device, with a live preview and a board-switcher on the casting surface. **Screen-mirroring cannot honor that**: mirroring copies the *whole device screen*, so the casting device is occupied showing the board and cannot simultaneously host command-post work. Alex accepted this tradeoff in choosing mirror. The board *content and design* are unchanged; what is dropped for v4.0 is the "keep working on the casting device while it casts" affordance and the in-app projection registry.

**Practical pattern (recommended, not required):** mirror from a **spare or dedicated device** at the command post (an older phone/tablet whose only job is the wall), leaving the primary CP tablet free for work. This restores the "keep working" benefit without any app-side casting machinery.

## Consequences

**Positive:**
- **Least new platform code** — the app builds one full-screen read-only board mode and nothing else; mirroring is the OS's job.
- **No cast-protocol lock-in** — works with whatever mirroring the department's phones and TV already support; the URL-on-TV-browser path covers the rest.
- **Nothing to pair or maintain** — no registry, no session, no handshake surface.

**Negative / accepted:**
- **Reverses pin-not-mirror** for v4.0 (see above) — the casting device is occupied; the live-preview + in-app board-switcher affordance is not built. Mitigated by the spare-device pattern.
- **Mirroring is OS-ecosystem-bound** — AirPlay needs an Apple→AirPlay-target path, Chromecast an Android/Chrome→Cast path. The URL-on-TV-browser fallback is the cross-ecosystem escape hatch.
- **The casting device's whole screen is on the wall** while mirroring — the operator must be on the broadcast board view, not an arbitrary screen. The full-screen board mode makes this safe (nothing sensitive or interactive renders).

**Neutral:**
- The in-app "Cast to display" control from the IA spec becomes lighter — an entry that opens the full-screen board mode + a one-line "mirror this screen to your TV" instruction, rather than a pairing/registry flow.

## Related

- **Refines:** [`60-broadcast-view.md`](../08-information-architecture/60-broadcast-view.md) (the transport-independent IA — content unchanged; §Two governing decisions "pin-not-mirror" amended for v4.0), [ADR-015](ADR-015-navigation-pattern.md) (broadcast is cast-not-navigated — still true; the *how* of the cast is now OS-mirror).
- **Principles:** 11 (phone-is-the-floor — a solo IC can mirror from a phone), 4 (read-only output has no action).
- **Other ADRs:** [ADR-016](ADR-016-modal-vs-sheet-rules.md) (broadcast raises no overlay), [ADR-022](ADR-022-mutual-aid-v40-qr-guest.md) (the join QR cast to the board is a rendered image — mirror-safe, unchanged).
- **GitHub:** [#405](https://github.com/Vergo402/paratech-struts/issues/405) (this decision) · [#213](https://github.com/Vergo402/paratech-struts/issues/213) (Broadcast View build).

---

## Notes

Decision now; the full-screen board mode ships with the Broadcast View build ([#213](https://github.com/Vergo402/paratech-struts/issues/213)). The one thing to hold onto: the app never owns the cast — it owns a clean read-only board at a URL, and the wall is fed by the OS (mirror) or a TV browser (the same URL). That keeps the projection honest (Principle 8 — the board is a view of the synced log, not a second source of truth) and the platform surface minimal.
