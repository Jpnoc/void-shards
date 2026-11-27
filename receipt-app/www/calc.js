// Pure money / date logic. No DOM, no storage: unit-tested in test/calc.test.js.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const round2 = n => Math.round((n + Number.EPSILON) * 100) / 100;

  // item.price is the printed line amount before tax (discounts are negative).
  function subtotal(r) { return round2(r.items.reduce((s, i) => s + (Number(i.price) || 0), 0)); }
  // Tax is spread over items in proportion to price, so returning an item also refunds its share of tax.
  function taxRate(r) {
    const sub = subtotal(r), tax = Number(r.tax) || 0;
    return sub > 0 && tax > 0 ? tax / sub : 0;
  }
  function itemAmount(r, item) { return round2((Number(item.price) || 0) * (1 + taxRate(r))); }
  function grossTotal(r) { return round2(r.items.reduce((s, i) => s + itemAmount(r, i), 0)); }
  function refundedTotal(r) { return round2(r.items.filter(i => i.returned).reduce((s, i) => s + itemAmount(r, i), 0)); }
  // What you actually kept paying for: everything not returned.
  function netTotal(r) { return round2(grossTotal(r) - refundedTotal(r)); }

  // ---- dates (local, as YYYY-MM-DD strings so there are no timezone surprises) ----
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function periods(todayStr) {
    const t = parse(todayStr);
    const monday = addDays(todayStr, -((t.getDay() + 6) % 7));
    return {
      today: [todayStr, todayStr],
      week: [monday, addDays(monday, 6)],
      month: [ymd(new Date(t.getFullYear(), t.getMonth(), 1)), ymd(new Date(t.getFullYear(), t.getMonth() + 1, 0))],
      year: [t.getFullYear() + '-01-01', t.getFullYear() + '-12-31'],
    };
  }
  const inRange = (r, [from, to]) => r.date >= from && r.date <= to;
  function totalFor(receipts, range) {
    return round2(receipts.filter(r => inRange(r, range)).reduce((s, r) => s + netTotal(r), 0));
  }
  // Net spend per category in a range (returned items excluded).
  function byCategory(receipts, range) {
    const out = {};
    for (const r of receipts) {
      if (!inRange(r, range)) continue;
      for (const i of r.items) if (!i.returned) out[i.category] = round2((out[i.category] || 0) + itemAmount(r, i));
    }
    return out;
  }
  function allTotals(receipts, todayStr) {
    const p = periods(todayStr), out = {};
    for (const k of Object.keys(p)) out[k] = totalFor(receipts, p[k]);
    return out;
  }

  // ---- business / personal ----
  const isBusiness = x => x.kind === 'business';
  function filterBy(list, { range, kind } = {}) {
    return list.filter(x => (!range || inRange(x, range)) && (!kind || kind === 'all' || (kind === 'business') === isBusiness(x)));
  }
  function lastMonth(todayStr) {
    const t = parse(todayStr);
    return [ymd(new Date(t.getFullYear(), t.getMonth() - 1, 1)), ymd(new Date(t.getFullYear(), t.getMonth(), 0))];
  }

  // ---- mileage: trip = { date, from, to, distance, purpose, kind } ----
  const tripValue = (t, rate) => round2((Number(t.distance) || 0) * (Number(rate) || 0));
  function tripTotals(trips, range, rate, kind) {
    const l = filterBy(trips, { range, kind });
    return { count: l.length, distance: round2(l.reduce((s, t) => s + (Number(t.distance) || 0), 0)), value: round2(l.reduce((s, t) => s + tripValue(t, rate), 0)) };
  }

  // ---- reports ----
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const line = r => r.map(q).join(',');
  const byDate = (a, b) => a.date.localeCompare(b.date);
  function csv(receipts) {
    const rows = [['Date', 'Store', 'Type', 'Item', 'Category', 'Amount (incl. tax)', 'Returned', 'Notes']];
    for (const r of [...receipts].sort(byDate))
      for (const i of r.items) rows.push([r.date, r.store, isBusiness(r) ? 'Business' : 'Personal', i.name, i.category, itemAmount(r, i).toFixed(2), i.returned ? 'yes' : 'no', r.notes || '']);
    return rows.map(line).join('\r\n');
  }
  function tripsCsv(trips, rate, unit) {
    const rows = [['Date', 'From', 'To', 'Distance (' + unit + ')', 'Type', 'Purpose', 'Value']];
    for (const t of [...trips].sort(byDate)) rows.push([t.date, t.from, t.to, t.distance, isBusiness(t) ? 'Business' : 'Personal', t.purpose || '', tripValue(t, rate).toFixed(2)]);
    return rows.map(line).join('\r\n');
  }
  // One file for an accountant: receipts section, then mileage section, then totals.
  function report(receipts, trips, { range, kind, rate, unit }) {
    const R = filterBy(receipts, { range, kind }), T = filterBy(trips, { range, kind });
    const spend = round2(R.reduce((s, r) => s + netTotal(r), 0)), tt = tripTotals(trips, range, rate, kind);
    const parts = [csv(R)];
    if (T.length) parts.push('', tripsCsv(T, rate, unit));
    parts.push('', line(['Total spend (net of returns)', spend.toFixed(2)]));
    if (T.length) parts.push(line(['Total distance (' + unit + ')', tt.distance]), line(['Mileage value', tt.value.toFixed(2)]));
    return parts.join('\r\n');
  }

  return { round2, subtotal, taxRate, itemAmount, grossTotal, refundedTotal, netTotal, ymd, parse, addDays, periods, totalFor, byCategory, allTotals, isBusiness, filterBy, lastMonth, tripValue, tripTotals, csv, tripsCsv, report };
});
