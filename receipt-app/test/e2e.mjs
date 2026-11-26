import { createRequire } from 'node:module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const SCR = process.env.SCR; const root = path.resolve('www');
const srv = http.createServer((q, s) => { let f = path.join(root, q.url.split('?')[0] === '/' ? 'index.html' : q.url.split('?')[0]);
  fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html' }); s.end(d); }); }).listen(0);
const base = 'http://localhost:' + srv.address().port;
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.route('**/config.js', async r => { const t = await (await r.fetch()).text(); r.fulfill({ body: t.replace("API_URL: ''", "API_URL: 'https://api.test'"), contentType: 'text/javascript' }); });
const d = new Date(); const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
await page.route('https://api.test/**', r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } }) :
  r.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { is_receipt: true, store: 'Fresh Mart', date: ds, currency: 'USD', tax: 2, total: 33, items: [
    { name: 'Whole milk', price: 4, category: 'Groceries' }, { name: 'Sourdough bread', price: 6, category: 'Groceries' }, { name: 'Vitamin C', price: 12, category: 'Health' }, { name: 'Dish soap', price: 5, category: 'Household' }] } }));
await page.goto(base); await page.waitForSelector('#empty-scan');
await page.screenshot({ path: SCR + '/01-empty.png' });
// make a receipt-like image to upload
await page.setContent('<body style="margin:0;background:#fff;font:20px monospace;padding:20px;width:400px">FRESH MART<br>Milk 4.00<br>Bread 6.00<br>TOTAL 33.00</body>'); const img = SCR + '/receipt.png'; await page.screenshot({ path: img, clip: { x: 0, y: 0, width: 440, height: 200 } });
await page.goto(base); await page.waitForSelector('#empty-scan');
await page.click('#scan-fab'); const fc = page.waitForEvent('filechooser'); await page.click('[data-v=gallery]'); (await fc).setFiles(img);
await page.waitForSelector('#ed-save'); 
const items = await page.locator('.item').count(); const total = await page.textContent('#ed-total');
console.log('items', items, 'total', total);
await page.screenshot({ path: SCR + '/02-review.png' });
await page.click('#ed-save'); await page.waitForSelector('#added-ok'); await page.screenshot({ path: SCR + '/03-added.png' }); console.log('added modal:', (await page.textContent('#modal .box')).replace(/\s+/g, ' '));
await page.click('#added-ok');
console.log('home today/month:', await page.textContent('#t-today'), await page.textContent('#t-month'));
await page.screenshot({ path: SCR + '/04-home.png' });
// return the vitamins
await page.click('[data-tab=receipts]'); await page.click('#view-receipts [data-open]'); await page.waitForSelector('#ed-done');
await page.locator('.item').nth(2).locator('.in-ret').check();
console.log('after return total:', await page.textContent('#ed-total'), '| refund line:', (await page.textContent('#ed-refund')).replace(/\s+/g, ' '));
await page.screenshot({ path: SCR + '/05-returned.png' }); await page.waitForTimeout(600); await page.click('#ed-done');
await page.click('[data-tab=home]'); console.log('home month after return:', await page.textContent('#t-month'));
await page.screenshot({ path: SCR + '/06-home-after.png' });
await page.click('[data-tab=budgets]'); await page.click('[data-budget=Groceries]'); await page.fill('#bud', '8'); await page.click('#bud-ok'); await page.screenshot({ path: SCR + '/07-budgets.png' });
console.log('budget row:', (await page.textContent('[data-budget=Groceries]')).replace(/\s+/g, ' '));
await page.reload(); await page.waitForSelector('#t-month'); console.log('persisted after reload:', await page.textContent('#t-month'));
console.log('errors:', JSON.stringify(errs)); await b.close(); srv.close();
