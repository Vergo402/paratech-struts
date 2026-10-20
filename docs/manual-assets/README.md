# Manual screenshots (`docs/manual-assets/`)

These PNGs are embedded into `docs/FieldShore-User-Manual.docx` by
`.claude/scripts/build-user-manual-docx.py`. They are the **v4** app, captured
from the live app. Refresh them on any MINOR/MAJOR release that changes the
screens they show (NOT for PATCH releases). The shot list and capture notes for
the 4.0 set live in `.claude/audits/phase-j/263-manual/shot-list.json`.

## How they're used

The build script's `IMAGE_MAP` maps each filename to the manual section it sits
under (keyed by the exact heading text in `docs/USER-MANUAL.md`). The picture is
placed at the end of that section. Mobile shots render at about 2.9 inches wide,
desktop shots at about 6.0 inches.

| File | Section heading | Viewport |
|------|-----------------|----------|
| `v4-01-welcome.png` | The Welcome Page | mobile |
| `v4-02-sign-in.png` | Creating Your Account and Signing In | mobile |
| `v4-03-create-department.png` | Creating a Department | mobile |
| `v4-04-join-department.png` | Joining a Department | mobile |
| `v4-22-desktop-command.png` | Phone and Desktop Layouts | desktop |
| `v4-05-quickfind.png` | Finding a Strut | mobile |
| `v4-06-quickfind-results.png` | Reading the Results | mobile |
| `v4-07-start-operation.png` | Starting an Operation | mobile |
| `v4-08-operations-board.png` | The Operations Board | mobile |
| `v4-09-add-shore-point.png` | Adding a Shore Point | mobile |
| `v4-10-assign-equipment.png` | Assigning Equipment | mobile |
| `v4-11-shore-card-slide.png` | Moving a Shore Point Through Its Steps | mobile |
| `v4-12-cutting-station.png` | The Cutting Station | mobile |
| `v4-13-end-operation.png` | Ending an Operation | mobile |
| `v4-14-command.png` | The Command Screen | mobile |
| `v4-15-org-chart.png` | The Org Chart | mobile |
| `v4-16-hazard-log.png` | Hazard Log | mobile |
| `v4-17-inventory.png` | The Inventory Screen | mobile |
| `v4-18-import-map-columns.png` | Pick Your File and Map Your Columns | mobile |
| `v4-19-settings.png` | Settings Pages | mobile |
| `v4-20-user-manager.png` | Users and Roles | mobile |
| `v4-21-sync-banner-offline.png` | The Sync Banner | mobile |

That is 22 screenshots. The old version 3 shots (`01-login.png` to
`14-desktop-operations.png`) were removed. No `IMAGE_MAP` entry uses them.

## Refreshing for a release

1. Have the `qa-driver` agent drive the live app and capture fresh shots for any
   screen the release changed. Mobile shots use a phone-sized viewport (about
   414 by 896 at 2x). Desktop shots use about 1280 by 900.
2. Overwrite the matching PNG(s) here with the same filenames.
3. Rebuild: `python3 .claude/scripts/build-user-manual-docx.py`
   The build counts the pictures it really inserts. It prints
   "N/N screenshots embedded" and exits with an error if a heading in
   `IMAGE_MAP` does not exist in the manual, a file is missing, or the counts
   differ.
4. Commit the changed PNGs and the rebuilt `.docx` with the release.

If a new section needs its own screenshot, add the file here and a new entry to
`IMAGE_MAP` in the build script. If you rename a manual heading that has a
screenshot, rename the `IMAGE_MAP` key too, or the build fails.

> Note: the app puts demo or test data on screen when it runs in a sandbox. That
> is fine for manual imagery as long as no real names or emails show.
