const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://localhost:3000/quickfind', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const out = await page.evaluate(async () => {
  const m = await import('/@fs/Users/alex/Developer/paratech-struts/fieldshore/src/data/w3w/w3w.ts');
  if (!m.w3wEnabled()) return 'DISABLED (no key)';
  try {
    const words = await m.convertToWords({ lat: 40.7484, lng: -73.9857 });
    return 'OK: got words (' + words.split('.').length + ' parts)';
  } catch (e) { return 'FAIL: ' + e.message; }
});
console.log(out);
await browser.close();
