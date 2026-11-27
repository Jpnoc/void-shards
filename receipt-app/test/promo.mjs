// Builds the Play Store promo screenshots: headline + real app screen in a phone frame.
import { createRequire } from 'node:module'; const { chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright');
import fs from 'node:fs';
const RAW = process.env.RAW, OUT = 'store-listing/';
const img = n => 'data:image/png;base64,' + fs.readFileSync(RAW + '/' + n + '.png').toString('base64');
const pills = ['📷 Scan receipts', '🚗 Log mileage', '📄 Import invoices'];
const slides = [
  { raw: 'home', bg: '#0f5a41', accent: '#8be0b8', h: 'Snap it.<br>Sorted.', sub: 'AI reads every receipt and files each item into the right budget category.', pills },
  { raw: 'home', bg: '#176b4d', accent: '#d6f5e5', h: 'Totals that<br>update themselves', sub: 'Today, this week, this month and this year, the moment you add a receipt.' },
  { raw: 'editor', bg: '#8a3b2e', accent: '#ffd2c7', h: 'Returned<br>something?', sub: 'Just tick it. The price and its tax come straight off your totals.' },
  { raw: 'records', bg: '#1d4f7a', accent: '#cfe6fa', h: 'Business or<br>personal', sub: 'Tag receipts, add notes and export a report for your accountant.' },
  { raw: 'trips', bg: '#5a3f8c', accent: '#e4d8fa', h: 'Mileage<br>made easy', sub: 'Log business trips and see your distance and claim value add up.' },
  { raw: 'budgets', bg: '#7a5a0a', accent: '#ffe8a8', h: 'Budgets that<br>keep you honest', sub: 'Set a monthly limit per category and watch the bars fill.' },
];
const html = (s, i) => `<div style="width:1080px;height:1920px;background:${s.bg};position:relative;overflow:hidden;font-family:system-ui,sans-serif;color:#fff">
  <div style="position:absolute;right:-180px;top:-180px;width:560px;height:560px;border-radius:50%;background:${s.accent};opacity:.14"></div>
  <div style="padding:120px 80px 0"><div style="font-size:112px;font-weight:800;line-height:1.02;letter-spacing:-2px">${s.h}</div>
  <div style="font-size:42px;line-height:1.3;margin-top:34px;color:${s.accent};max-width:880px">${s.sub}</div>
  ${s.pills ? '<div style="display:flex;gap:16px;margin-top:40px;flex-wrap:wrap">' + s.pills.map(p => '<div style="background:#fff;color:#18201b;border-radius:999px;padding:16px 30px;font-size:34px;font-weight:650">' + p + '</div>').join('') + '</div>' : ''}</div>
  <div style="position:absolute;left:150px;top:${s.pills ? 760 : 650}px;width:780px;height:1500px;border-radius:70px;background:#111;padding:16px;box-sizing:border-box;box-shadow:0 30px 80px rgba(0,0,0,.45)">
    <img src="${img(s.raw)}" style="width:748px;display:block;border-radius:56px"></div></div>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [i, s] of slides.entries()) { await p.setContent('<body style="margin:0">' + html(s, i)); await p.screenshot({ path: OUT + 'screenshot-' + (i + 1) + '.png' }); }
await b.close();
