import { callGemini, callClaude, UpstreamError } from './providers.js';
import { buildSchema, buildPrompt, validateRequest, sanitize } from './extract.js';

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-app-key', 'cache-control': 'no-store' },
});

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, x-app-key', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-max-age': '86400' } });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/scan') return json({ error: 'Not found' }, 404);
    if (env.APP_KEY && req.headers.get('x-app-key') !== env.APP_KEY) return json({ error: 'Unauthorized' }, 401);
    if (env.LIMITER) {
      const ip = req.headers.get('cf-connecting-ip') || 'unknown';
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return json({ error: 'Too many scans, try again in a minute' }, 429);
    }

    let body;
    try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
    const bad = validateRequest(body);
    if (bad) return json({ error: bad }, 400);

    try {
      const raw = env.PROVIDER === 'claude' ? await callClaude(env, body) : await callGemini(env, body);
      return json(sanitize(raw, body.categories));
    } catch (e) {
      if (e instanceof UpstreamError) {
        if (e.kind === 'rate') return json({ error: 'Busy, try again shortly' }, 429);
        if (e.kind === 'config') return json({ error: 'Server not configured' }, 500);
        if (e.kind === 'upstream') return json({ error: 'AI service error' }, 502);
      }
      return json({ error: 'Could not read this receipt' }, 422);
    }
  },
};
