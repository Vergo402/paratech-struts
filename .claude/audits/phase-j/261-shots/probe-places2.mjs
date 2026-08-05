const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/quickfind', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const out = await page.evaluate(`(async () => {
  const m = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/places/places.ts');
  if (!m.placesEnabled()) return 'DISABLED (no key)';
  try {
    const s = await m.beginAddressSession();
    const sugg = await s.suggest('350 Fifth Avenue New York');
    return 'OK: ' + sugg.length + ' suggestions';
  } catch (e) { return 'FAIL: ' + (e.message || String(e)); }
})()`);
console.log('PLACES(localhost):', out);
await browser.close();
