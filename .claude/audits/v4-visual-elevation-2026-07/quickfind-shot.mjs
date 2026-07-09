// After-shot for Quick Find (#433) — guest-accessible, so no scene to build.
// Sets dark theme + phone viewport and captures the elevated empty calculator,
// matching the baseline framing. PW_PATH / BASE overridable via env.
const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);

const BASE = process.env.BASE ?? 'http://localhost:5199';
const OUT = '/Users/alex/Developer/paratech-struts/fieldshore/.claude/audits/v4-visual-elevation-2026-07/after';

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('fieldshore_theme', 'dark'));
  await page.goto(`${BASE}/quickfind`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/phone-quickfind.png` });
  await browser.close();
  console.log('quickfind after-shot written');
};

run().catch((e) => { console.error(e.message); process.exit(1); });
