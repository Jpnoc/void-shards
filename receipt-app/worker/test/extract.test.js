import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchema, validateRequest, sanitize } from '../src/extract.js';

const cats = ['Groceries', 'Dining', 'Other'];
test('schema enumerates categories and is strict', () => {
  const s = buildSchema(cats);
  assert.equal(s.additionalProperties, false);
  assert.deepEqual(s.properties.items.items.properties.category.enum, cats);
});
test('request validation', () => {
  const ok = { image: 'abc', mediaType: 'image/jpeg', categories: cats };
  assert.equal(validateRequest(ok), null);
  assert.equal(validateRequest({ ...ok, mediaType: 'application/pdf' }), null);
  assert.ok(validateRequest({ ...ok, mediaType: 'image/gif' }));
  assert.ok(validateRequest({ ...ok, image: '' }));
  assert.ok(validateRequest({ ...ok, categories: ['x'] }));
  assert.ok(validateRequest(null));
});
test('sanitize clamps bad model output', () => {
  const out = sanitize({ is_receipt: true, store: 'A'.repeat(500), date: 'yesterday', currency: 'usd',
    items: [{ name: 'Milk', price: 3.456, category: 'Nope' }, { name: 'X', price: NaN, category: 'Dining' }], tax: -4, total: 'x' }, cats);
  assert.equal(out.store.length, 80);
  assert.equal(out.date, '');
  assert.equal(out.currency, '');
  assert.equal(out.items[0].category, 'Other');
  assert.equal(out.items[0].price, 3.46);
  assert.equal(out.items[1].price, 0);
  assert.equal(out.tax, 0);
  assert.equal(out.total, 0);
});
