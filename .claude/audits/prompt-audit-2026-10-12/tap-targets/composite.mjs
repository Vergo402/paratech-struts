// Compose the annotated captures into one overview PNG (headless Chrome render).
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const OUT = dirname(fileURLToPath(import.meta.url));
const { shots } = JSON.parse(readFileSync(`${OUT}/manifest.json`, 'utf8'));
const img = (f) => `data:image/png;base64,${readFileSync(`${OUT}/${f}`).toString('base64')}`;
const card = (s) => `
  <section class="card">
    <h2>${s.title}</h2>
    <div class="route">${s.route}</div>
    <img src="${img(s.file)}" alt="">
    <div class="counts"><span class="g">≥56px: ${s.counts.ge56}</span><span class="a">44–55px: ${s.counts.b44}</span><span class="r">&lt;44px: ${s.counts.lt44}</span></div>
    <ul>${s.counts.rows.filter(r => r.cls !== 'ge56').slice(0, 7).map(r => `<li><b>${r.h}px</b> ${r.name || '(unnamed)'}</li>`).join('')}</ul>
  </section>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0;background:#0f1115;color:#e8e8ea;font:14px/1.4 -apple-system,Helvetica,Arial,sans-serif;padding:24px}
  h1{font-size:22px;margin:0 0 6px} .sub{color:#a0a4ad;margin-bottom:18px;max-width:1500px}
  .legend span{display:inline-block;padding:2px 10px;border-radius:4px;margin-right:8px;font-weight:700;color:#fff}
  .grid{display:grid;grid-template-columns:repeat(${shots.length},1fr);gap:18px;align-items:start}
  .card{background:#171a21;border:1px solid #2a2e38;border-radius:10px;padding:12px}
  .card h2{font-size:15px;margin:0 0 2px;min-height:40px} .route{color:#8f94a0;font-size:12px;margin-bottom:8px}
  .card img{width:100%;display:block;border-radius:6px;border:1px solid #2a2e38}
  .counts{display:flex;gap:6px;margin:10px 0 6px} .counts span{padding:3px 8px;border-radius:4px;font-weight:700;font-size:12px;color:#fff}
  .g{background:#30a46c}.a{background:#f5a524}.r{background:#e5484d}
  ul{margin:0;padding-left:18px;color:#c3c6cf;font-size:12px} li{margin:2px 0}
</style></head><body>
  <h1>Tap targets today — the surfaces decision 6 touches</h1>
  <div class="sub">Live measurements from the v4 app on the local emulators (phone viewport 390×844, dark theme), every interactive control boxed with its rendered height. Green meets the 56px fireground floor (craft.md §7, spacing-grid 56pt row); amber is the 44–55px band the mobile-ux agent currently allows on back-office surfaces; red is below even the 44px tertiary floor.</div>
  <div class="legend"><span class="g">≥56px</span><span class="a">44–55px</span><span class="r">&lt;44px</span></div>
  <div class="grid">${shots.map(card).join('')}</div>
</body></html>`;
writeFileSync(`${OUT}/overview.html`, html);
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1640, height: 1000 }, deviceScaleFactor: 1.5 });
await page.setContent(html, { waitUntil: 'load' });
await page.screenshot({ path: `${OUT}/tap-targets-overview.png`, fullPage: true });
await browser.close();
console.log('wrote tap-targets-overview.png');
