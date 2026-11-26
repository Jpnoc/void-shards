import { createRequire } from 'node:module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve('www');
const srv = http.createServer((q, s) => { const f = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); s.end(d); }); }).listen(0);
const b = await chromium.launch(); const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, colorScheme: 'light' })).newPage();
await page.goto('http://localhost:' + srv.address().port); await page.waitForSelector('#empty-scan');
await page.evaluate(async () => {
  const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return Calc.ymd(x); };
  const it = (name, price, category, returned = false) => ({ id: uid(), name, price, category, returned });
  const R = [
    ['Fresh Mart', 0, 2.1, [it('Whole milk', 4.2, 'Groceries'), it('Sourdough bread', 6, 'Groceries'), it('Vitamin C', 12.5, 'Health', true), it('Dish soap', 5.3, 'Household')]],
    ['Blue Bottle Cafe', 0, 1.1, [it('Latte', 5.5, 'Dining'), it('Croissant', 4.25, 'Dining')]],
    ['Shell', 1, 0, [it('Fuel', 48.2, 'Transport')]],
    ['Target', 2, 5.4, [it('Desk lamp', 29.99, 'Household'), it('T-shirt', 14, 'Clothing'), it('Shampoo', 8.49, 'Personal Care'), it('HDMI cable', 12, 'Electronics')]],
    ['Cinema City', 3, 0, [it('Movie tickets x2', 24, 'Entertainment'), it('Popcorn', 9.5, 'Dining')]],
    ['Whole Foods', 5, 6.2, [it('Salmon', 18.4, 'Groceries'), it('Avocados', 6.2, 'Groceries'), it('Pasta', 3.2, 'Groceries')]],
    ['CVS Pharmacy', 8, 1.3, [it('Pain relief', 9.8, 'Health'), it('Toothpaste', 4.9, 'Personal Care')]],
  ];
  for (const [store, ago, tax, items] of R) await Store.put({ id: uid(), store, date: d(ago), tax, items, createdAt: Date.now() - ago });
  const s = Store.settings(); s.budgets = { Groceries: 120, Dining: 60, Transport: 100, Household: 40, Entertainment: 30 }; Store.saveSettings(s);
});
await page.reload(); await page.waitForSelector('#t-month'); const O = 'store-listing/';
await page.screenshot({ path: O + 'screenshot-1.png' });
await page.click('[data-tab=receipts]'); await page.screenshot({ path: O + 'screenshot-2.png' });
await page.locator('#view-receipts .rrow', { hasText: 'Fresh Mart' }).click(); await page.waitForSelector('#ed-done'); await page.evaluate(() => document.querySelector('#sheet').scrollTo(0, 330)); await page.screenshot({ path: O + 'screenshot-3.png' });
await page.waitForTimeout(500); await page.click('#ed-close'); await page.click('[data-tab=budgets]'); await page.screenshot({ path: O + 'screenshot-4.png' });
await b.close(); srv.close();
