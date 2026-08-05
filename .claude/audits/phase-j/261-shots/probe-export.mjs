const PW = process.env.PW_PATH ?? '/Users/alex/.npm/_npx/88950a7d37a5e205/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(/(googleapis|firebaseio|firebaseapp|firebaseinstallations|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
page.setDefaultTimeout(8000);
await page.goto('http://localhost:3000/inventory', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const label = await page.locator('.fs-inv-toolbar button, header button').first().getAttribute('aria-label').catch(() => null);
const iconBtn = page.locator('button[aria-label*="port"], button[aria-label*="data" i]').first();
if (await iconBtn.count()) { await iconBtn.click(); } else {
  await page.locator('button:has(svg)').nth(0).click();
}
await page.waitForTimeout(500);
await page.screenshot({ path: 'probe-export-sheet.png' });
const dl = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
const exp = page.getByRole('button', { name: /Export/i }).first();
if (await exp.count()) await exp.click();
const d = await dl;
console.log('export:', d ? 'DOWNLOAD ' + d.suggestedFilename() : 'NO DOWNLOAD', '| first-btn aria:', label);
await browser.close();
