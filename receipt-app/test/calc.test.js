const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../www/calc.js');

const mk = (date, items, tax = 0, store = 'Shop') => ({ id: date + items.length, store, date, tax, items: items.map(([name, price, category, returned], n) => ({ id: n, name, price, category, returned: !!returned })) });

test('receipt total includes tax', () => {
  const r = mk('2026-11-10', [['Milk', 4, 'Groceries'], ['Bread', 6, 'Groceries']], 1);
  assert.equal(C.netTotal(r), 11);
});

test('ticking an item as returned subtracts it and its share of tax', () => {
  const r = mk('2026-11-10', [['Milk', 4, 'Groceries'], ['Shirt', 6, 'Clothing', true]], 1);
  assert.equal(C.refundedTotal(r), 6.6);
  assert.equal(C.netTotal(r), 4.4);
});

test('returning everything gives zero', () => {
  const r = mk('2026-11-10', [['A', 10, 'Other', true], ['B', 5, 'Other', true]], 1.5);
  assert.equal(C.netTotal(r), 0);
});

test('discount lines (negative) reduce the total', () => {
  const r = mk('2026-11-10', [['Jeans', 40, 'Clothing'], ['Coupon', -10, 'Clothing']]);
  assert.equal(C.netTotal(r), 30);
});

test('periods: week starts Monday, month bounds, leap year', () => {
  const p = C.periods('2028-02-29'); // Tuesday
  assert.deepEqual(p.week, ['2028-02-28', '2028-03-05']);
  assert.deepEqual(p.month, ['2028-02-01', '2028-02-29']);
  assert.deepEqual(C.periods('2026-11-29').week, ['2026-11-23', '2026-11-29']); // Sunday
});

test('today / week / month / year totals only count receipts inside each range, net of returns', () => {
  const rs = [
    mk('2026-11-26', [['A', 10, 'Dining']]),
    mk('2026-11-24', [['B', 20, 'Groceries'], ['C', 5, 'Groceries', true]]),
    mk('2026-11-02', [['D', 100, 'Household']]),
    mk('2026-10-31', [['E', 1000, 'Other']]),
  ];
  const t = C.allTotals(rs, '2026-11-26');
  assert.equal(t.today, 10);
  assert.equal(t.week, 30);
  assert.equal(t.month, 130);
  assert.equal(t.year, 1130);
});

test('category breakdown excludes returned items', () => {
  const rs = [mk('2026-11-26', [['A', 10, 'Dining'], ['B', 7, 'Dining', true], ['C', 3, 'Health']])];
  assert.deepEqual(C.byCategory(rs, C.periods('2026-11-26').month), { Dining: 10, Health: 3 });
});

test('float noise is rounded away', () => {
  const r = mk('2026-11-10', [['A', 0.1, 'Other'], ['B', 0.2, 'Other']]);
  assert.equal(C.netTotal(r), 0.3);
});

test('csv escapes quotes and marks returns', () => {
  const out = C.csv([mk('2026-11-10', [['5" pan, large', 10, 'Household', true]])]);
  assert.match(out, /"5"" pan, large"/);
  assert.match(out, /"yes",""$/);
});

const trip = (date, distance, kind = 'business') => ({ id: date + distance, date, from: 'A', to: 'B', distance, purpose: 'Client', kind });

test('business filter and personal filter split receipts', () => {
  const b = { ...mk('2026-11-05', [['Laptop', 100, 'Electronics']]), kind: 'business' }, p = mk('2026-11-06', [['Pizza', 20, 'Dining']]);
  assert.equal(C.filterBy([b, p], { kind: 'business' }).length, 1);
  assert.equal(C.filterBy([b, p], { kind: 'personal' })[0].items[0].name, 'Pizza');
  assert.equal(C.filterBy([b, p], { kind: 'all' }).length, 2);
});

test('lastMonth handles January rollover', () => {
  assert.deepEqual(C.lastMonth('2027-01-15'), ['2026-12-01', '2026-12-31']);
  assert.deepEqual(C.lastMonth('2026-03-31'), ['2026-02-01', '2026-02-28']);
});

test('mileage totals and value in range', () => {
  const ts = [trip('2026-11-02', 10.5), trip('2026-11-20', 4.5), trip('2026-10-30', 100), trip('2026-11-21', 8, 'personal')];
  const m = C.periods('2026-11-26').month;
  assert.deepEqual(C.tripTotals(ts, m, 0.5), { count: 3, distance: 23, value: 11.5 });
  assert.deepEqual(C.tripTotals(ts, m, 0.5, 'business'), { count: 2, distance: 15, value: 7.5 });
});

test('report has receipts, mileage and totals for the chosen range only', () => {
  const rs = [{ ...mk('2026-11-05', [['Laptop', 100, 'Electronics'], ['Cable', 10, 'Electronics', true]]), kind: 'business' }, mk('2026-10-01', [['Old', 5, 'Other']])];
  const out = C.report(rs, [trip('2026-11-07', 12)], { range: C.periods('2026-11-26').month, kind: 'business', rate: 0.5, unit: 'mi' });
  assert.match(out, /"Laptop"/); assert.doesNotMatch(out, /"Old"/);
  assert.match(out, /"Distance \(mi\)"/);
  assert.match(out, /"Total spend \(net of returns\)","100.00"/);
  assert.match(out, /"Mileage value","6.00"/);
});
