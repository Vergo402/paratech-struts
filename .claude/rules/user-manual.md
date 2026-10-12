---
paths:
  - "docs/USER-MANUAL.md"
  - "docs/manual-assets/**"
  - "docs/FieldShore-User-Manual.docx"
  - ".claude/scripts/build-user-manual-docx.py"
---

# User manual — update procedure (path-scoped rule)

Moved from CLAUDE.md 2026-10-12; the rule that triggers it (both manuals, every MINOR/MAJOR) stays in CLAUDE.md.

When updating (MINOR/MAJOR):
1. Edit the relevant section(s) in `docs/USER-MANUAL.md`, covering everything that shipped in the release (see the rule in CLAUDE.md — not just the marquee feature).
2. Update the **Version** and **Last updated** fields at the top.
3. Add a row to the **Version History** table (major.minor only).
4. **Rebuild the `.docx` from the markdown** so it carries the same text:
   ```bash
   pip install python-docx          # once per environment
   python3 .claude/scripts/build-user-manual-docx.py
   ```
   The build script reads `docs/USER-MANUAL.md`, re-embeds the screenshots in `docs/manual-assets/`, and writes `docs/FieldShore-User-Manual.docx`.
5. **Refresh screenshots for any screen the release changed.** Capture fresh shots from the live app (the `qa-driver` agent can drive the UI) and overwrite the matching PNG(s) in `docs/manual-assets/` — filenames are mapped to sections in the build script's `IMAGE_MAP`. Then rerun the build so the new shots embed. If a release touches no UI, the existing screenshots may be reused.
6. Commit and push **both manuals + any changed screenshots** in the same commit/PR as the feature — the manuals ship with the work, never in a separate trailing commit.
