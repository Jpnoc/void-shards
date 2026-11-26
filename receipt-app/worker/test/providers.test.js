import test from 'node:test';
import assert from 'node:assert/strict';
import { callGemini, UpstreamError } from '../src/providers.js';

const body = { image: 'QUJD', mediaType: 'image/jpeg', categories: ['Groceries', 'Other'], today: '2026-11-26' };
const reply = (status, obj) => async () => new Response(JSON.stringify(obj), { status });

test('gemini request carries key, image and schema; parses candidate text', async () => {
  let seen;
  const f = async (url, init) => { seen = { url, init }; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"is_receipt":true,"items":[]}' }] } }] })); };
  const out = await callGemini({ GEMINI_API_KEY: 'k' }, body, f);
  assert.equal(out.is_receipt, true);
  assert.match(seen.url, /gemini-3\.1-flash-lite:generateContent$/);
  assert.equal(seen.init.headers['x-goog-api-key'], 'k');
  const sent = JSON.parse(seen.init.body);
  assert.equal(sent.contents[0].parts[0].inline_data.data, 'QUJD');
  assert.equal(sent.generationConfig.responseMimeType, 'application/json');
});
test('error mapping', async () => {
  await assert.rejects(callGemini({}, body), e => e.kind === 'config');
  await assert.rejects(callGemini({ GEMINI_API_KEY: 'k' }, body, reply(429, {})), e => e.kind === 'rate');
  await assert.rejects(callGemini({ GEMINI_API_KEY: 'k' }, body, reply(403, {})), e => e.kind === 'config');
  await assert.rejects(callGemini({ GEMINI_API_KEY: 'k' }, body, reply(500, {})), e => e.kind === 'upstream');
  await assert.rejects(callGemini({ GEMINI_API_KEY: 'k' }, body, reply(200, { candidates: [] })), e => e instanceof UpstreamError && e.kind === 'unreadable');
});
