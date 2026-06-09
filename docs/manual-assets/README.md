# Manual screenshots (`docs/manual-assets/`)

These PNGs are embedded into `docs/FieldStruts-User-Manual.docx` by
`.claude/scripts/build-user-manual-docx.py`. They are captured from the **live
app** and must be refreshed on any MINOR/MAJOR release that changes the screens
they show (NOT for PATCH releases).

## How they're used

The build script's `IMAGE_MAP` maps each filename to the manual section it sits
under (keyed by the exact heading text in `docs/USER-MANUAL.md`). Mobile shots
render at ~2.9", desktop shots at ~6.0".

| File | Section | Viewport |
|------|---------|----------|
| `01-login.png` | Connecting Your Department | mobile |
| `02-quickfind.png` | How to Use (Quick Find) | mobile |
| `03-quickfind-results.png` | Results | mobile |
| `04-start-operation.png` | Starting an Operation | mobile |
| `05-operations-tab.png` | Starting an Operation | mobile |
| `06-add-shore-point.png` | Adding a Shore Point | mobile |
| `07-shore-card.png` | Shore Point Lifecycle | mobile |
| `08-command-tab.png` | What's on the Command Tab | mobile |
| `09-org-chart.png` | Default Roles | mobile |
| `10-cut-table.png` | 6. Cut Table | mobile |
| `11-inventory.png` | 7. Inventory | mobile |
| `12-settings.png` | 8. Settings | mobile |
| `13-desktop-command.png` | Using FieldShore on Desktop | desktop |
| `14-desktop-operations.png` | Using FieldShore on Desktop | desktop |

## Refreshing for a release

1. Have the `qa-driver` agent drive the live app and capture fresh shots for any
   screen the release changed. Mobile shots use a ~414×896 viewport (2× DPI →
   828×1792); desktop shots use ~1280×900 (2× → 2560×1800).
2. Overwrite the matching PNG(s) here with the same filenames.
3. Rebuild: `python3 .claude/scripts/build-user-manual-docx.py`
   (expect "N/N screenshots embedded").
4. Commit the changed PNGs + the rebuilt `.docx` with the release.

If a new section needs its own screenshot, add the file here and a new entry to
`IMAGE_MAP` in the build script.

> Note: when captured in a sandbox without Firebase, the app runs on its
> local-first path and screenshots show demo data — fine for manual imagery.
