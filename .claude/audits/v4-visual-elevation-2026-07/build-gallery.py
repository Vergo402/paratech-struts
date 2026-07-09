#!/usr/bin/env python3
"""Assemble the Visual Elevation before/after gallery as a self-contained HTML
page (data-URI images). Reads baseline/ + after/ PNGs, writes gallery.html."""
import base64, pathlib, html

ROOT = pathlib.Path('/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/v4-visual-elevation-2026-07')
BEFORE = ROOT / 'baseline'
AFTER = ROOT / 'after'
OUT = pathlib.Path('/private/tmp/claude-501/-Users-alex-Developer-paratech-struts-fieldshore/4fe21e44-694e-4ec6-a522-903d43d4c390/scratchpad/gallery.html')

def uri(p):
    return 'data:image/png;base64,' + base64.b64encode(p.read_bytes()).decode()

# (id, filename, orientation, screen, stage, caption)
PAIRS = [
    ('quickfind', 'phone-quickfind.png', 'phone', 'Quick Find', '2b',
     "The dev version tag left the header; the deductions control became a real card; the measurement numeral now sits on the mono ramp; and “Find Struts” was quieted so the screen spends its gold only where it counts."),
    ('operations', 'phone-operations.png', 'phone', 'Operations', '2a',
     "Flat status rows became elevated cards. The shore-point card leads with its effective-length numeral, a gold corner tab, and a genuine status slide; a grouped shore stacks behind a pager."),
    ('inventory', 'phone-inventory.png', 'phone', 'Inventory', '1',
     "The baseline had it backwards — buttons wore surfaces while equipment rows were bare rules. Now stock lives on cards with an on-hand / total hero figure and a depletion bar, and “deployed” reads neutral so the gold rests on the one primary action."),
    ('settings', 'phone-settings.png', 'phone', 'Settings', '1',
     "Loose rows gathered into labelled groups; the field-safe Sunlight theme surfaced up front; every row now says what you get, not what the module is called."),
    ('command', 'phone-command.png', 'phone', 'Command', '2c',
     "A real stat strip answers the top question before any scroll. The Incident Commander is marked once — a quiet gold rail underline — and the status rollup spends its lone accent on the live Cutting count."),
    ('desk-operations', 'desk-operations.png', 'desk', 'Operations · deck', '2a',
     "At deck width the board reads as a work surface: division bands, the tri-view scope, and the same elevated cards carried across from phone."),
    ('desk-command', 'desk-command.png', 'desk', 'Command · deck', '2c',
     "SitStat rollup and the org chart share one deck. Connectors ride their own measured SVG layer, and each node’s workload numeral cross-foots the rail totals."),
]

# after-only spotlight (no v3 equivalent)
SPOTLIGHT = ('cutting', 'phone-cutting-station.png',
             "Cutting Station", "New in v4",
             "A workstation with one display numeral — the cut length, in cutting amber. The math is spelled out beneath so it stays checkable on scene, never an oracle.")

STAGES = [
    ('1', 'Inventory + Settings', 'the exemplar'),
    ('2a', 'Operations', 'the lifecycle'),
    ('2b', 'Quick Find', 'the calculator'),
    ('2c', 'Command', 'the deck'),
    ('3', 'Finesse', 'motion · cohesion · glove floor'),
]

def frame(src, label, kind):
    lab = f'<span class="tag tag-{kind}">{label}</span>'
    return (f'<figure class="shot shot-{kind}">'
            f'<div class="frame"><img loading="lazy" alt="{label} — {kind}" src="{src}"></div>'
            f'{lab}</figure>')

sections = []
for pid, fname, orient, screen, stage, caption in PAIRS:
    b = frame(uri(BEFORE / fname), 'Before', 'before')
    a = frame(uri(AFTER / fname), 'After', 'after')
    sections.append(f'''<section class="pair pair-{orient}" id="{pid}">
  <header class="pair-head">
    <span class="eyebrow"><span class="stage-dot">Stage {stage}</span>{html.escape(screen)}</span>
    <p class="caption">{caption}</p>
  </header>
  <div class="compare compare-{orient}">{b}{a}</div>
</section>''')

# spotlight
sp = SPOTLIGHT
spotlight_html = f'''<section class="pair pair-phone spotlight" id="{sp[0]}">
  <header class="pair-head">
    <span class="eyebrow"><span class="stage-dot stage-dot--new">{sp[3]}</span>{html.escape(sp[2])}</span>
    <p class="caption">{sp[4]}</p>
  </header>
  <div class="compare compare-phone compare-solo">{frame(uri(AFTER / sp[1]), 'After', 'after')}</div>
</section>'''

stage_rail = ''.join(
    f'<li><span class="s-num">{n}</span><span class="s-name">{html.escape(nm)}</span>'
    f'<span class="s-sub">{html.escape(sub)}</span></li>'
    for n, nm, sub in STAGES)

CSS = '''
:root{
  --ground:#F3F1EC; --panel:#FBFAF7; --panel-2:#EFECE4; --stroke:#DED9CE;
  --ink:#1A1917; --ink-2:#6C6860; --ink-3:#94908688; --accent:#B47A0E; --accent-ink:#8A5D06;
  --frame:#0E0F13; --frame-stroke:#2A2E37;
  --maxw:1080px;
  --sans:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",system-ui,sans-serif;
  --mono:ui-monospace,"SF Mono",Menlo,monospace;
}
@media (prefers-color-scheme:dark){
  :root{ --ground:#0C0D10; --panel:#141620; --panel-2:#1B1E29; --stroke:#282C38;
    --ink:#F1F2F5; --ink-2:#9AA0AC; --ink-3:#6a7078; --accent:#E7AE33; --accent-ink:#E7AE33;
    --frame:#0A0B0E; --frame-stroke:#2B2F3A; }
}
:root[data-theme="light"]{ --ground:#F3F1EC; --panel:#FBFAF7; --panel-2:#EFECE4; --stroke:#DED9CE;
  --ink:#1A1917; --ink-2:#6C6860; --ink-3:#9490868a; --accent:#B47A0E; --accent-ink:#8A5D06;
  --frame:#0E0F13; --frame-stroke:#2A2E37; }
:root[data-theme="dark"]{ --ground:#0C0D10; --panel:#141620; --panel-2:#1B1E29; --stroke:#282C38;
  --ink:#F1F2F5; --ink-2:#9AA0AC; --ink-3:#6a7078; --accent:#E7AE33; --accent-ink:#E7AE33;
  --frame:#0A0B0E; --frame-stroke:#2B2F3A; }

*{box-sizing:border-box}
body{margin:0}
.wrap{background:var(--ground);color:var(--ink);font-family:var(--sans);
  -webkit-font-smoothing:antialiased;line-height:1.6;padding:0 24px 96px;min-height:100vh}
.inner{max-width:var(--maxw);margin:0 auto}

.mast{padding:72px 0 40px;border-bottom:1px solid var(--stroke)}
.kicker{font-family:var(--mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--accent-ink);margin:0 0 20px}
.mast h1{font-size:clamp(40px,7vw,74px);line-height:.98;letter-spacing:-.03em;font-weight:640;
  margin:0;text-wrap:balance;max-width:15ch}
.mast h1 em{font-style:normal;color:var(--accent-ink)}
.thesis{font-size:clamp(17px,2.1vw,21px);color:var(--ink-2);max-width:60ch;margin:22px 0 0;text-wrap:pretty}

.rail{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin:40px 0 0;padding:0}
.rail li{flex:1 1 150px;background:var(--panel);border:1px solid var(--stroke);border-radius:12px;
  padding:14px 16px;display:flex;flex-direction:column;gap:2px;position:relative;overflow:hidden}
.rail li::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent);opacity:.5}
.s-num{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--accent-ink);letter-spacing:.04em}
.s-name{font-size:15px;font-weight:560;margin-top:2px}
.s-sub{font-size:12.5px;color:var(--ink-2)}

.pair{padding:64px 0 0}
.pair-head{max-width:64ch}
.eyebrow{display:flex;align-items:center;gap:12px;font-size:19px;font-weight:600;letter-spacing:-.01em}
.stage-dot{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
  color:var(--accent-ink);background:color-mix(in srgb,var(--accent) 15%,transparent);
  border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);
  padding:3px 9px;border-radius:999px;white-space:nowrap}
.stage-dot--new{color:var(--ink);background:var(--panel-2);border-color:var(--stroke)}
.caption{font-size:15.5px;color:var(--ink-2);margin:14px 0 0;text-wrap:pretty}

.compare{margin-top:28px;display:grid;gap:22px}
.compare-phone{grid-template-columns:1fr 1fr;max-width:600px}
.compare-solo{grid-template-columns:1fr;max-width:320px}
.compare-desk{grid-template-columns:1fr}
.shot{margin:0;display:flex;flex-direction:column;gap:10px}
.frame{background:var(--frame);border:1px solid var(--frame-stroke);border-radius:20px;padding:6px;
  overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.18)}
.pair-desk .frame{border-radius:14px}
.frame img{display:block;width:100%;height:auto;border-radius:14px}
.pair-desk .frame img{border-radius:9px}
.tag{font-family:var(--mono);font-size:11px;letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-2);display:inline-flex;align-items:center;gap:7px;padding-left:2px}
.tag::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--ink-3)}
.tag-after{color:var(--accent-ink)}
.tag-after::before{background:var(--accent)}

.foot{margin-top:80px;padding-top:28px;border-top:1px solid var(--stroke);
  font-size:13.5px;color:var(--ink-2);display:flex;flex-wrap:wrap;gap:8px 20px;font-family:var(--mono)}
.foot b{color:var(--ink);font-weight:560}

@media (max-width:620px){
  .compare-phone{grid-template-columns:1fr;max-width:320px}
  .wrap{padding:0 18px 72px}
}
@media (prefers-reduced-motion:no-preference){
  .frame{transition:transform .18s ease}
  .shot-after .frame:hover{transform:translateY(-3px)}
}
'''

DOC = f'''<div class="wrap"><div class="inner">
<h2 class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Before and after gallery of the FieldShore v4 visual elevation program across seven surfaces.</h2>
<header class="mast">
  <p class="kicker">FieldShore v4 &middot; Epic #430</p>
  <h1>Visual <em>Elevation</em></h1>
  <p class="thesis">Four screens taken from plain to surgically crafted &mdash; one locked design system (four themes, a single gold accent, a mono numeral ramp), applied worst-first across three stages.</p>
  <ul class="rail">{stage_rail}</ul>
</header>
{''.join(sections)}
{spotlight_html}
<footer class="foot">
  <span><b>7</b> before / after pairs</span>
  <span><b>5</b> stages &middot; 1 &rarr; 2a &rarr; 2b &rarr; 2c &rarr; 3</span>
  <span><b>1</b> gold accent, budgeted</span>
  <span><b>56px</b> gloved-hands floor</span>
</footer>
</div></div>
<style>{CSS}</style>'''

OUT.write_text(DOC)
kb = OUT.stat().st_size / 1024
print(f'wrote {OUT} — {kb:.0f} KB')
