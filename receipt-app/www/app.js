(() => {
  const $ = s => document.querySelector(s);
  const CATS = CONFIG.CATEGORIES, CAT_NAMES = CATS.map(c => c.name);
  const cat = n => CATS.find(c => c.name === n) || CATS[CATS.length - 1];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => Calc.ymd(new Date());
  let receipts = [], trips = [], settings = Store.settings(), tab = 'home', editor = null, filter = '', recView = 'receipts', kindFilter = 'all';

  const money = n => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: settings.currency }).format(n); } catch { return n.toFixed(2); } };
  const dateLabel = s => Calc.parse(s).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: Calc.parse(s).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  const monthLabel = s => Calc.parse(s + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }
  function busy(on, text) { $('#busy').hidden = !on; if (text) $('#busy-text').textContent = text; }

  // ---- modal helpers ----
  function modal(html) {
    return new Promise(res => {
      const m = $('#modal'); m.innerHTML = '<div class="box">' + html + '</div>'; m.hidden = false;
      const done = v => { const f = {}; m.querySelectorAll('input,select').forEach(e => { if (e.id) f[e.id] = e.type === 'checkbox' ? e.checked : e.value; }); modal.form = f; const inp = m.querySelector('input.t'); modal.input = inp ? inp.value : ''; m.hidden = true; m.innerHTML = ''; res(v); };
      m.onclick = e => { if (e.target === m) done(null); };
      m.querySelectorAll('[data-v]').forEach(b => b.onclick = () => done(b.dataset.v));
      const first = m.querySelector('input,button'); if (first) first.focus();
      m._done = done;
    });
  }
  const ask = (title, body, ok, danger) => modal(`<h3>${esc(title)}</h3><p class="muted">${esc(body)}</p><div class="acts"><button class="btn ghost" data-v="">Cancel</button><button class="btn ${danger ? 'danger' : ''}" data-v="ok">${esc(ok)}</button></div>`).then(v => v === 'ok');

  // ---- views ----
  function catBars(range, limitNote) {
    const by = Calc.byCategory(receipts, range), total = Object.values(by).reduce((a, b) => a + b, 0);
    const rows = Object.entries(by).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return '<p class="muted">Nothing spent yet this month.</p>';
    return rows.map(([n, v]) => `<div class="catrow"><span class="dot" style="background:${cat(n).color}"></span><span>${cat(n).icon} ${esc(n)} <span class="muted small">${Math.round(v / total * 100)}%</span></span><span class="amt">${money(v)}</span><div class="bar" aria-hidden="true"><i style="width:${(v / rows[0][1] * 100).toFixed(1)}%;background:${cat(n).color}"></i></div></div>`).join('');
  }
  function rrow(r) {
    const ret = r.items.filter(i => i.returned).length;
    return `<button class="rrow" data-open="${esc(r.id)}"><div class="grow"><div class="t">${esc(r.store || 'Receipt')}${ret ? `<span class="badge">${ret} returned</span>` : ''}</div><div class="muted small">${dateLabel(r.date)} · ${r.items.length} item${r.items.length === 1 ? '' : 's'}</div></div><span class="amt">${money(Calc.netTotal(r))}</span></button>`;
  }
  const unitLbl = () => settings.unit;
  const dist = n => (Math.round(n * 10) / 10) + ' ' + unitLbl();
  function businessCard() {
    const mo = Calc.periods(today()).month, spend = Calc.totalFor(Calc.filterBy(receipts, { kind: 'business' }), mo), tt = Calc.tripTotals(trips, mo, settings.rate, 'business');
    if (!spend && !tt.count) return '';
    return `<h2>Business · this month</h2><div class="card"><div class="tl"><span>Expenses</span><strong id="t-biz">${money(spend)}</strong></div>${tt.count ? `<div class="tl"><span>Mileage (${tt.count} trip${tt.count === 1 ? '' : 's'})</span><strong>${dist(tt.distance)}${settings.rate ? ' · ' + money(tt.value) : ''}</strong></div>` : ''}</div>`;
  }
  function renderHome() {
    const t = Calc.allTotals(receipts, today()), p = Calc.periods(today());
    const recent = [...receipts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 5);
    $('#view-home').innerHTML = `<h1>ReceiptWise</h1>
      <div class="card hero"><div class="lbl">Spent this month</div><div class="big" id="t-month">${money(t.month)}</div></div>
      <div class="stats"><div class="card stat"><div class="lbl">Today</div><div class="val" id="t-today">${money(t.today)}</div></div>
      <div class="card stat"><div class="lbl">This week</div><div class="val" id="t-week">${money(t.week)}</div></div>
      <div class="card stat"><div class="lbl">This year</div><div class="val" id="t-year">${money(t.year)}</div></div></div>
      ${businessCard()}
      ${receipts.length ? `<h2>By category · this month</h2><div class="card">${catBars(p.month)}</div>
      <h2>Recent receipts</h2><div class="card list">${recent.map(rrow).join('')}</div>` :
      `<div class="empty"><div class="em">🧾</div><h2 style="text-transform:none;font-size:20px;color:var(--ink)">Snap your first receipt</h2><p class="muted">Take a photo and AI sorts every item into budget categories and keeps your totals up to date.</p><button class="btn" id="empty-scan">Scan a receipt</button></div>`}`;
    const b = $('#empty-scan'); if (b) b.onclick = scanMenu;
  }
  const seg = () => `<div class="seg"><button class="${recView === 'receipts' ? 'on' : ''}" data-rv="receipts">Receipts</button><button class="${recView === 'trips' ? 'on' : ''}" data-rv="trips">Trips</button></div>`;
  const chips = () => `<div class="chips" role="group" aria-label="Filter by type">${[['all', 'All'], ['business', 'Business'], ['personal', 'Personal']].map(([k, l]) => `<button class="chip ${kindFilter === k ? 'on' : ''}" data-kf="${k}" aria-pressed="${kindFilter === k}">${l}</button>`).join('')}</div>`;
  function trow(t) {
    return `<button class="rrow" data-trip="${esc(t.id)}"><div class="grow"><div class="t">${esc(t.from || '?')} → ${esc(t.to || '?')}${Calc.isBusiness(t) ? '' : '<span class="badge">personal</span>'}</div><div class="muted small">${dateLabel(t.date)}${t.purpose ? ' · ' + esc(t.purpose) : ''}</div></div><span class="amt">${dist(t.distance)}${settings.rate ? '<div class="muted small" style="text-align:right">' + money(Calc.tripValue(t, settings.rate)) + '</div>' : ''}</span></button>`;
  }
  function groupByMonth(list, headRight, row) {
    let html = '', cur = '';
    for (const x of list) {
      const m = x.date.slice(0, 7);
      if (m !== cur) { if (cur) html += '</div>'; cur = m; html += `<div class="monthhdr"><span>${monthLabel(m)}</span><span>${headRight(m)}</span></div><div class="card list">`; }
      html += row(x);
    }
    return html + (cur ? '</div>' : '');
  }
  function renderReceipts() {
    let html = '<h1>Records</h1>' + seg() + chips();
    if (recView === 'receipts') {
      const q = filter.trim().toLowerCase();
      const list = Calc.filterBy(receipts, { kind: kindFilter }).filter(r => !q || r.store.toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q) || r.items.some(i => i.name.toLowerCase().includes(q)))
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      html += '<input class="t" id="search" type="search" placeholder="Search store, item or note" aria-label="Search receipts" value="' + esc(filter) + '">';
      if (!list.length) html += `<div class="empty"><p class="muted">${receipts.length ? 'No receipts match.' : 'No receipts yet.'}</p></div>`;
      html += groupByMonth(list, m => money(Calc.totalFor(list, [m + '-01', m + '-31'])), rrow);
    } else {
      const list = Calc.filterBy(trips, { kind: kindFilter }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
      html += '<button class="btn block" id="add-trip" style="margin-top:12px">+ Log a trip</button>';
      if (!list.length) html += '<div class="empty"><div class="em">🚗</div><p class="muted">No trips yet. Log business drives to track your mileage.</p></div>';
      html += groupByMonth(list, m => dist(Calc.tripTotals(list, [m + '-01', m + '-31'], 0).distance), trow);
    }
    $('#view-receipts').innerHTML = html;
    const s = $('#search'); if (s) s.oninput = () => { filter = s.value; const pos = s.selectionStart; renderReceipts(); const n = $('#search'); n.focus(); n.setSelectionRange(pos, pos); };
    const at = $('#add-trip'); if (at) at.onclick = () => tripModal(blankTrip());
  }
  function renderBudgets() {
    const mo = Calc.periods(today()).month, by = Calc.byCategory(receipts, mo);
    const totBudget = CAT_NAMES.reduce((s, n) => s + (settings.budgets[n] || 0), 0), totSpent = CAT_NAMES.filter(n => settings.budgets[n]).reduce((s, n) => s + (by[n] || 0), 0);
    $('#view-budgets').innerHTML = `<h1>Budgets</h1><p class="muted">Monthly limits. Tap a category to set one.</p>
      <div class="card">${totBudget ? `<div class="catrow" style="grid-template-columns:1fr auto"><strong>Budgeted categories</strong><span class="amt">${money(totSpent)} of ${money(totBudget)}</span></div>` : '<span class="muted">No budgets set yet.</span>'}</div>
      <h2>Categories</h2><div class="card list">${CATS.map(c => {
        const spent = by[c.name] || 0, b = settings.budgets[c.name] || 0, pct = b ? Math.min(100, spent / b * 100) : 0, over = b && spent > b;
        return `<div class="brow"><button data-budget="${esc(c.name)}"><div class="catrow" style="padding:0"><span class="dot" style="background:${c.color}"></span><span>${c.icon} ${esc(c.name)}</span><span class="amt">${money(spent)}</span>${b ? `<div class="bar ${over ? 'over' : ''}"><i style="width:${pct}%;background:${c.color}"></i></div><span class="small ${over ? '' : 'muted'}" style="grid-column:1/4;${over ? 'color:var(--bad);font-weight:600' : ''}">${over ? 'Over by ' + money(spent - b) : money(b - spent) + ' left'} of ${money(b)}</span>` : '<span class="small muted" style="grid-column:1/4">No budget · tap to set</span>'}</div></button></div>`; }).join('')}</div>`;
  }
  function renderSettings() {
    $('#view-settings').innerHTML = `<h1>Settings</h1><div class="card list">
      <div class="setrow"><label for="s-cur">Currency</label><select id="s-cur">${CONFIG.CURRENCIES.map(c => `<option ${c === settings.currency ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="setrow"><label for="s-unit">Distance unit</label><select id="s-unit"><option value="mi" ${settings.unit === 'mi' ? 'selected' : ''}>Miles</option><option value="km" ${settings.unit === 'km' ? 'selected' : ''}>Kilometres</option></select></div>
      <div class="setrow"><label for="s-rate">Mileage rate per ${settings.unit} (optional)</label><input class="t" id="s-rate" inputmode="decimal" style="width:96px" value="${settings.rate || ''}" placeholder="0.00"></div>
      <div class="setrow"><label for="s-photo">Keep a small photo of each receipt on this phone</label><input id="s-photo" type="checkbox" ${settings.keepPhotos ? 'checked' : ''}></div></div>
      <h2>Your data</h2><div class="card list">
      <div class="setrow"><span>Export report for your accountant (CSV)</span><button class="btn sec" id="s-export">Export</button></div>
      <div class="setrow"><span>Delete all receipts and trips</span><button class="btn ghost" id="s-wipe">Delete</button></div></div>
      <h2>About</h2><div class="card list"><div class="setrow"><span>Privacy policy</span><a href="${esc(CONFIG.PRIVACY_URL)}" target="_blank" rel="noopener">Open</a></div>
      <div class="setrow"><span>Version</span><span class="muted">${CONFIG.VERSION}</span></div></div>
      <p class="muted small">Receipt photos are sent to an AI service only to read them, and are not kept by the service. Receipts stay on this device.</p>`;
    $('#s-cur').onchange = e => { settings.currency = e.target.value; Store.saveSettings(settings); render(); };
    $('#s-photo').onchange = e => { settings.keepPhotos = e.target.checked; Store.saveSettings(settings); };
    $('#s-unit').onchange = e => { settings.unit = e.target.value; Store.saveSettings(settings); render(); };
    $('#s-rate').onchange = e => { settings.rate = Math.max(0, num(e.target.value)); Store.saveSettings(settings); toast('Mileage rate saved'); };
    $('#s-export').onclick = openReport;
    $('#s-wipe').onclick = async () => { if (await ask('Delete all data?', 'This removes every receipt and trip from this phone and cannot be undone.', 'Delete all', true)) { await Store.clearAll(); receipts = []; trips = []; render(); toast('All receipts deleted'); } };
  }
  function render() { ({ home: renderHome, receipts: renderReceipts, budgets: renderBudgets, settings: renderSettings })[tab](); }
  function go(t) {
    tab = t;
    document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== 'view-' + t);
    document.querySelectorAll('.tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('on', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
    render(); $('#main').scrollTop = 0;
  }

  // ---- budget + export ----
  async function setBudget(name) {
    const cur = settings.budgets[name] || '';
    const v = await modal(`<h3>${esc(name)} budget</h3><p class="muted">Monthly limit in ${esc(settings.currency)}. Leave empty to remove.</p><input class="t" id="bud" inputmode="decimal" value="${cur}" aria-label="Monthly budget"><div class="acts"><button class="btn ghost" data-v="">Cancel</button><button class="btn" id="bud-ok" data-v="ok">Save</button></div>`);
    if (v !== 'ok') return;
    const n = num(modal.input);
    if (n > 0) settings.budgets[name] = n; else delete settings.budgets[name];
    Store.saveSettings(settings); renderBudgets();
  }
  async function shareCsv(data, name) {
    const FS = window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() ? Capacitor.registerPlugin('Filesystem') : null;
    try {
      if (FS) { const f = await FS.writeFile({ path: name, data, directory: 'CACHE', encoding: 'utf8' }); await Capacitor.registerPlugin('Share').share({ title: 'ReceiptWise report', url: f.uri }); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'text/csv' })); a.download = name; a.click(); }
    } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Could not export'); }
  }
  async function openReport() {
    if (!receipts.length && !trips.length) return toast('Nothing to export yet');
    const v = await modal(`<h3>Export report</h3><label class="f" for="rp-range">Period</label><select class="t" id="rp-range"><option value="month">This month</option><option value="last">Last month</option><option value="year">This year</option><option value="all">All time</option></select>
      <label class="f" for="rp-kind">Include</label><select class="t" id="rp-kind"><option value="all">Business and personal</option><option value="business">Business only</option></select>
      <div class="acts"><button class="btn ghost" data-v="">Cancel</button><button class="btn" data-v="ok">Export</button></div>`);
    if (v !== 'ok') return;
    const f = modal.form, p = Calc.periods(today());
    const range = { month: p.month, last: Calc.lastMonth(today()), year: p.year, all: null }[f['rp-range']];
    shareCsv(Calc.report(receipts, trips, { range, kind: f['rp-kind'], rate: settings.rate, unit: settings.unit }), 'receiptwise-report-' + today() + '.csv');
  }

  // ---- trips ----
  const blankTrip = () => ({ id: uid(), date: today(), from: '', to: '', distance: 0, purpose: '', kind: 'business', createdAt: Date.now() });
  async function tripModal(t) {
    const isNew = !trips.some(x => x.id === t.id);
    const v = await modal(`<h3>${isNew ? 'Log a trip' : 'Trip'}</h3>
      <label class="f" for="tr-date">Date</label><input class="t" id="tr-date" type="date" value="${esc(t.date)}" max="${today()}">
      <label class="f" for="tr-from">From</label><input class="t" id="tr-from" value="${esc(t.from)}" placeholder="Start">
      <label class="f" for="tr-to">To</label><input class="t" id="tr-to" value="${esc(t.to)}" placeholder="Destination">
      <label class="f" for="tr-dist">Distance (${unitLbl()})</label><input class="t" id="tr-dist" inputmode="decimal" value="${t.distance || ''}">
      <label class="f" for="tr-purpose">Purpose</label><input class="t" id="tr-purpose" value="${esc(t.purpose)}" placeholder="e.g. Client meeting">
      <label class="f" for="tr-kind">Type</label><select class="t" id="tr-kind"><option value="business" ${Calc.isBusiness(t) ? 'selected' : ''}>Business</option><option value="personal" ${Calc.isBusiness(t) ? '' : 'selected'}>Personal</option></select>
      <div class="acts">${isNew ? '<button class="btn ghost" data-v="">Cancel</button>' : '<button class="btn danger" data-v="del">Delete</button>'}<button class="btn" data-v="ok">Save</button></div>`);
    const f = modal.form;
    if (v === 'del') { await Store.trips.remove(t.id); trips = trips.filter(x => x.id !== t.id); render(); return toast('Trip deleted'); }
    if (v !== 'ok') return;
    const d = num(f['tr-dist']);
    if (!(d > 0)) { toast('Enter the distance'); return tripModal({ ...t, date: f['tr-date'] || t.date, from: f['tr-from'], to: f['tr-to'], purpose: f['tr-purpose'], kind: f['tr-kind'] }); }
    const nt = { ...t, date: f['tr-date'] || today(), from: f['tr-from'].trim(), to: f['tr-to'].trim(), distance: d, purpose: f['tr-purpose'].trim(), kind: f['tr-kind'] };
    await Store.trips.put(nt); trips = trips.filter(x => x.id !== nt.id).concat([nt]);
    toast('Trip saved'); render();
  }

  // ---- receipt editor (used for new scans and existing receipts) ----
  const num = s => { const n = parseFloat(String(s).replace(',', '.').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
  function itemRow(it) {
    return `<div class="item ${it.returned ? 'ret' : ''}" data-id="${esc(it.id)}">
      <input class="t in-name" value="${esc(it.name)}" aria-label="Item name" placeholder="Item">
      <input class="t in-price" inputmode="decimal" value="${it.price}" aria-label="Item price">
      <div class="row2"><label class="retlbl"><input type="checkbox" class="in-ret" ${it.returned ? 'checked' : ''}> Returned</label>
      <select class="t in-cat" aria-label="Category">${CAT_NAMES.map(n => `<option ${n === it.category ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <button class="iconbtn in-del" aria-label="Remove item">🗑️</button></div></div>`;
  }
  function openEditor(r, isNew) {
    editor = { r: JSON.parse(JSON.stringify(r)), isNew, thumb: r.thumb };
    const sh = $('#sheet');
    sh.innerHTML = `<div class="sh-head"><button class="iconbtn" id="ed-close" aria-label="Close">✕</button><h1>${isNew ? 'Review receipt' : 'Receipt'}</h1>${isNew ? '' : '<button class="iconbtn" id="ed-del" aria-label="Delete receipt">🗑️</button>'}</div>
      <div class="sh-body"><label class="f" for="ed-store">Store</label><input class="t" id="ed-store" value="${esc(r.store)}" placeholder="Store name">
      <label class="f" for="ed-date">Date</label><input class="t" id="ed-date" type="date" value="${esc(r.date)}" max="${today()}">
      <label class="f">Type</label><div class="chips" id="ed-kind" role="group" aria-label="Receipt type"><button class="chip ${Calc.isBusiness(r) ? '' : 'on'}" data-k="personal">Personal</button><button class="chip ${Calc.isBusiness(r) ? 'on' : ''}" data-k="business">Business</button></div>
      <h2>Items</h2><div id="ed-items">${r.items.map(itemRow).join('')}</div>
      <button class="btn sec block" id="ed-add">+ Add item</button>
      <label class="f" for="ed-tax">Total tax on receipt</label><input class="t" id="ed-tax" inputmode="decimal" value="${r.tax || 0}">
      <p class="muted small">Prices are before tax. Returning an item also refunds its share of the tax.</p>
      <label class="f" for="ed-notes">Notes</label><input class="t" id="ed-notes" value="${esc(r.notes || '')}" placeholder="e.g. Client lunch, project X"></div>
      <div class="foot"><div class="refund" id="ed-refund" hidden></div><div class="tot"><span>Receipt total</span><span id="ed-total"></span></div>${isNew ? '<button class="btn block" id="ed-save">Save receipt</button>' : '<button class="btn block" id="ed-done">Done</button>'}</div>`;
    sh.hidden = false; sh.scrollTop = 0;
    const R = () => editor.r;
    const sync = () => {
      R().store = $('#ed-store').value.trim(); R().date = $('#ed-date').value || today(); R().tax = Math.max(0, num($('#ed-tax').value)); R().notes = $('#ed-notes').value.trim();
      const n = Calc.netTotal(R()), ref = Calc.refundedTotal(R());
      $('#ed-total').textContent = money(n);
      const rf = $('#ed-refund'); rf.hidden = !ref; rf.innerHTML = ref ? `<span>Returned</span><span>−${money(ref)}</span>` : '';
      if (!isNew) autosave();
    };
    let t; const autosave = () => { clearTimeout(t); t = setTimeout(() => persist(false), 400); };
    const itemOf = el => R().items.find(i => i.id === el.closest('.item').dataset.id);
    const box = $('#ed-items');
    box.oninput = e => { const it = itemOf(e.target); if (e.target.classList.contains('in-name')) it.name = e.target.value; else if (e.target.classList.contains('in-price')) it.price = num(e.target.value); sync(); };
    box.onchange = e => { const it = itemOf(e.target);
      if (e.target.classList.contains('in-ret')) { it.returned = e.target.checked; e.target.closest('.item').classList.toggle('ret', it.returned); }
      if (e.target.classList.contains('in-cat')) it.category = e.target.value; sync(); };
    box.onclick = e => { if (e.target.closest('.in-del')) { const row = e.target.closest('.item'); R().items = R().items.filter(i => i.id !== row.dataset.id); row.remove(); sync(); } };
    $('#ed-add').onclick = () => { const it = { id: uid(), name: '', price: 0, category: 'Other', returned: false }; R().items.push(it); box.insertAdjacentHTML('beforeend', itemRow(it)); box.lastElementChild.querySelector('.in-name').focus(); sync(); };
    ['#ed-store', '#ed-date', '#ed-tax', '#ed-notes'].forEach(s => $(s).oninput = sync);
    $('#ed-kind').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; R().kind = b.dataset.k; $('#ed-kind').querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); sync(); };
    $('#ed-close').onclick = closeEditor;
    if (isNew) $('#ed-save').onclick = () => persist(true); else { $('#ed-done').onclick = closeEditor; $('#ed-del').onclick = async () => { if (await ask('Delete this receipt?', 'It will be removed from your totals.', 'Delete', true)) { await Store.remove(R().id); receipts = receipts.filter(x => x.id !== R().id); closeEditor(true); toast('Receipt deleted'); } }; }
    sync();
  }
  async function persist(announce) {
    const r = editor.r;
    if (!r.items.length) return toast('Add at least one item');
    if (editor.isNew && !r.store) r.store = 'Receipt';
    if (!settings.keepPhotos) delete r.thumb;
    r.items.forEach(i => { i.name = i.name.trim() || 'Item'; });
    await Store.put(r);
    receipts = receipts.filter(x => x.id !== r.id).concat([JSON.parse(JSON.stringify(r))]);
    if (announce) { closeEditor(true); showAdded(r); }
  }
  async function closeEditor(force) {
    if (force !== true && editor && editor.isNew && editor.r.items.length && !(await ask('Discard this receipt?', 'It has not been saved.', 'Discard', true))) return;
    $('#sheet').hidden = true; $('#sheet').innerHTML = ''; editor = null; render();
  }
  function showAdded(r) {
    const t = Calc.allTotals(receipts, today()), inMonth = r.date.slice(0, 7) === today().slice(0, 7), isToday = r.date === today();
    modal(`<h3>Receipt added</h3><div class="tl"><span>${esc(r.store)}</span><strong>${money(Calc.netTotal(r))}</strong></div>
      <div class="tl"><span>Today</span><strong>${money(t.today)}</strong></div><div class="tl"><span>This week</span><strong>${money(t.week)}</strong></div>
      <div class="tl"><span>This month</span><strong>${money(t.month)}</strong></div>${isToday && inMonth ? '' : '<p class="muted small">This receipt is dated outside today, so it counts toward its own date.</p>'}
      <div class="acts"><button class="btn" id="added-ok" data-v="ok">Done</button></div>`);
  }

  // ---- scanning ----
  async function scanMenu() {
    const v = await modal(`<h3>Add a receipt</h3><div style="display:grid;gap:10px;margin-top:12px"><button class="btn" data-v="camera">📷 Take a photo</button><button class="btn sec" data-v="gallery">🖼️ Choose from gallery</button><button class="btn sec" data-v="file">📄 Import PDF or invoice</button><button class="btn ghost" data-v="trip">🚗 Log a trip</button><button class="btn ghost" data-v="manual">✍️ Enter receipt manually</button></div>`);
    if (!v) return;
    if (v === 'manual') return openEditor(blank(), true);
    if (v === 'trip') return tripModal(blankTrip());
    let url;
    try { url = await Scan.pick(v); } catch { return toast('Could not open the camera'); }
    if (!url) return;
    busy(true, 'Reading your receipt…');
    try {
      const draft = await Scan.read(url, today(), CAT_NAMES);
      if (settings.keepPhotos && !/^data:application\/pdf/.test(url)) { try { draft.thumb = await Scan.resize(url, 480, 0.7); } catch {} }
      busy(false); openEditor(draft, true);
    } catch (e) {
      busy(false);
      const msg = { not_configured: 'AI reading is not set up yet. Enter the receipt by hand.', offline: 'No connection. Enter it by hand or try again.', busy: 'The AI is busy. Try again in a minute.', not_receipt: "That doesn't look like a receipt or invoice. Try a clearer photo or file.", too_large: 'That file is too large (about 4 MB max). Try a smaller PDF or a photo.' }[e.code] || 'Could not read that receipt. You can enter it by hand.';
      toast(msg); if (!['not_receipt', 'busy', 'too_large'].includes(e.code)) openEditor(blank(), true);
    }
  }
  const blank = () => ({ id: uid(), store: '', date: today(), tax: 0, kind: 'personal', notes: '', createdAt: Date.now(), items: [{ id: uid(), name: '', price: 0, category: 'Other', returned: false }] });

  // ---- wiring ----
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-open]'); if (o) { const r = receipts.find(x => x.id === o.dataset.open); if (r) openEditor(r, false); }
    const b = e.target.closest('[data-budget]'); if (b) setBudget(b.dataset.budget);
    const tr = e.target.closest('[data-trip]'); if (tr) { const t = trips.find(x => x.id === tr.dataset.trip); if (t) tripModal(t); }
    const rv = e.target.closest('[data-rv]'); if (rv) { recView = rv.dataset.rv; renderReceipts(); }
    const kf = e.target.closest('[data-kf]'); if (kf) { kindFilter = kf.dataset.kf; renderReceipts(); }
  });
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => go(b.dataset.tab));
  $('#scan-fab').onclick = scanMenu;
  try {
    const A = window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.registerPlugin('App');
    if (A) A.addListener('backButton', () => {
      if (!$('#modal').hidden) return $('#modal')._done(null);
      if (!$('#sheet').hidden) return closeEditor();
      if (tab !== 'home') return go('home');
      A.exitApp();
    });
  } catch (e) { console.warn(e); }
  Promise.all([Store.all(), Store.trips.all()]).then(([a, t]) => { receipts = a; trips = t; go('home'); }).catch(() => { go('home'); toast('Storage unavailable'); });
})();
