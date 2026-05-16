# FieldShore

A progressive web app for USAR/FEMA firefighters to select Paratech rescue struts by measurement, manage inventory across apparatus, and run shoring operations with ICS/NIMS command structure.

Built for field use on mobile. Works offline.

**Live:** https://vergo402.github.io/paratech-struts/

## Features

- **Quick Find** — Enter an opening measurement and estimated load to get matching Paratech struts (Gold, Grey, LockStroke). Accounts for header/footer wood and connector plate deductions.
- **Operations** — Create shoring operations, add shore points with strut recommendations, track deployment status through the full lifecycle (Pending, Sent, In Progress, Complete).
- **ICS Command** — Drag-and-drop org chart with role assignments, status indicators, and span-of-control warnings. Supports custom roles and reparenting.
- **Inventory** — Manage strut, extension, and connector plate inventory per apparatus. Excel import/export via SheetJS.
- **Multi-device sync** — Firebase Realtime Database keeps all devices in sync. Local-first writes ensure the app works fully offline and syncs when reconnected.
- **Feedback** — In-app bug reports and feature requests with optional photo attachment, sent directly to Firebase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (no framework, no build step) |
| Backend | Firebase Realtime Database |
| Auth | Firebase Anonymous Authentication |
| Hosting | GitHub Pages |
| Offline | Service worker with stale-while-revalidate caching |

## Project Structure

```
index.html       HTML shell, modals, forms
app.js           All application logic, constants, Firebase integration
style.css        All styles
sw.js            Service worker (offline caching)
manifest.json    PWA manifest
database.rules.json  Firebase security rules
```

## Local Development

```bash
npx serve -l 8095 .
# Open http://localhost:8095
```

No build step required. Edit files, refresh, done.

## Deployment

Push to `main` triggers automatic deployment via GitHub Pages. The service worker caches assets locally, so users need to refresh twice (or close and reopen) to pick up a new version.

## License

This project is not currently licensed for reuse. All rights reserved.
