const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/quickfind', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const key = (import.meta && import.meta.env) ? 'n/a' : 'n/a';
  // Load the app's own maps loader if it exists; else do a raw Places JS load check.
  try {
    const mods = ['/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/places/places.ts',
                  '/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/maps/places.ts'];
    for (const p of mods) {
      try { const m = await import(p); return 'module found: ' + p.split('/').pop() + ' exports: ' + Object.keys(m).join(','); } catch {}
    }
    return 'no places module found at guessed paths';
  } catch (e) { return 'ERR ' + e.message; }
});
console.log(out);
await browser.close();
