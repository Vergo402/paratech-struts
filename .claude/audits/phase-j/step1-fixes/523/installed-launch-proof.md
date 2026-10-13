# Installed-launch proof (headless Chrome over CDP, production preview :5198, fresh profile per run) — 2026-10-13

Script: cdp-standalone.mjs (this folder). Each run starts Chrome with a new user-data-dir, loads http://localhost:5198/ and reports where it landed after 4 s.

```
browser mode (no emulation):
{"mode":"browser","mq":false,"path":"/welcome.html","title":"FieldShore — Rescue shoring, tracked end to end","entered":null,"heading":"\n          54″\n          of void. This is where every shore starts.\n        "}

ios mode (navigator.standalone = true injected before any script runs — what iOS Safari exposes to a home-screen app):
{"mode":"ios","mq":false,"navStandalone":true,"path":"/quickfind","title":"FieldShore","entered":"1"}
```

Result: browser first visit → /welcome.html, entered flag unset (unchanged behaviour). iOS-style installed launch → /quickfind (title FieldShore), entered flag '1', no welcome bounce.

Limit: the Android/desktop path (`display-mode: standalone` media query) could not be emulated — DevTools' Emulation.setEmulatedMedia display-mode feature did not apply in headless Chrome (mq stayed false on a probe page). That branch is pinned by src/app/entryGate.test.ts (jsdom, stubbed matchMedia).
