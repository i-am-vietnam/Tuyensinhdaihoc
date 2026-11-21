/* Anh bao cao (mac dinh web that https://diemthidaihoc.com/; truyen URL khac lam tham so, VD ban tinh site/
 * dang chay bang http.server). Khong khoi dong crawler hoac server.
 * Run: node scripts/capture_report_web.cjs [url] */
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('../.venv/browser-check/node_modules/playwright');
const out = path.resolve(__dirname, '../docs/fig');
const url = process.argv[2] || 'https://diemthidaihoc.com/';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelectorAll('.uni-card').length === 292);
  const shot = name => page.screenshot({ path: path.join(out, `web_${name}.png`) });
  await shot('uni');
  await page.locator('#uni-q').fill('BKA');
  await page.locator('#uni-ac li').first().click();
  await page.locator('#uni-out tbody tr').first().waitFor();
  await shot('school');
  await page.locator('#uni-out .dean-block').scrollIntoViewIfNeeded();
  await shot('dean');
  await page.locator('#uni-out .tuition-card').scrollIntoViewIfNeeded();
  await shot('tuition');
  for (const detail of await page.locator('#uni-out .dean-block details[open]').all()) {
    await detail.locator(':scope > summary').click();
  }
  await page.setViewportSize({ width: 1280, height: 1250 });
  await page.locator('#uni-out .dean-block').evaluate(e => scrollTo(0, e.getBoundingClientRect().top + scrollY - 75));
  await shot('school_info');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('[data-tab="major"]').click();
  await page.locator('#major-q').fill('7480201');
  await page.locator('#major-ac li').first().click();
  await page.locator('#major-out tbody tr').first().waitFor();
  await page.evaluate(() => scrollTo(0, 0));
  await shot('major');
  await page.locator('[data-tab="nv"]').click();
  await page.locator('#nv-out .nv-plan').waitFor();
  await page.locator('#nv-sample').click();
  await page.locator('#tab-nv').evaluate(e => scrollTo(0, e.getBoundingClientRect().top + scrollY - 75));
  await shot('nv');
  await page.locator('[data-tab="career"]').click();
  if (await page.locator('#tv-sample').isVisible()) await page.locator('#tv-sample').click(); // mac dinh da la ho so mau
  await page.locator('#tv-results .tv-mj').first().waitFor();
  await page.locator('#tv-results').evaluate(e => scrollTo(0, e.getBoundingClientRect().top + scrollY - 75));
  await shot('career');
  // Mang SNA va Do phu: cat tu tieu de tab den het khoi chinh, thanh tab de tinh (khong che noi dung)
  const clip = async (name, from, to) => {
    await page.addStyleTag({ content: '.top{position:static!important}' });
    await page.mouse.move(5, 5);
    const box = await page.evaluate(([a, b]) => {
      const t = document.querySelector(a).getBoundingClientRect().top + scrollY - 8;
      return { t, h: document.querySelector(b).getBoundingClientRect().bottom + scrollY + 8 - t };
    }, [from, to]);
    await page.screenshot({ path: path.join(out, `web_${name}.png`), fullPage: true, clip: { x: 0, y: box.t, width: 1280, height: box.h } });
  };
  await page.locator('[data-tab="network"]').click();
  await page.waitForFunction(() => typeof netObj !== 'undefined' && netObj && netObj.body.nodeIndices.length > 0);
  await page.waitForTimeout(4000);
  await page.evaluate(() => { netObj.stopSimulation(); netObj.fit({ animation: false }); });
  await clip('network', '#tab-network h1', '.net-grid');
  await page.locator('[data-tab="coverage"]').click();
  await page.locator('#coverage-out tbody tr').first().waitFor();
  await clip('coverage', '#tab-coverage h1', '#coverage-how');
  await page.addStyleTag({ content: '.top{position:sticky!important}' });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.locator('[data-tab="nv"]').click();
  await page.evaluate(() => scrollTo(0, 0));
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Mobile overflow');
  await shot('mobile');
  if (errors.length) throw Error(errors.join('\n'));
  console.log(JSON.stringify({ url, desktop: '1280px', mobile: '375x900', images: 11, pageErrors: errors.length }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
