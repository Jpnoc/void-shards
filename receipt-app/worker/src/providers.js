import Anthropic from '@anthropic-ai/sdk';
import { buildSchema, buildPrompt } from './extract.js';

export class UpstreamError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; } // kind: 'rate' | 'config' | 'upstream' | 'unreadable'
}

// Free option: Google Gemini API free tier (key from https://aistudio.google.com/apikey).
export async function callGemini(env, body, fetchFn = fetch) {
  if (!env.GEMINI_API_KEY) throw new UpstreamError('config', 'GEMINI_API_KEY not set');
  const model = env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const res = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: body.mediaType, data: body.image } },
        { text: buildPrompt(body.categories, String(body.today || '').slice(0, 10)) },
      ] }],
      generationConfig: { responseMimeType: 'application/json', responseJsonSchema: buildSchema(body.categories), temperature: 0 },
    }),
  });
  if (res.status === 429) throw new UpstreamError('rate', 'Gemini rate limit');
  if (res.status === 401 || res.status === 403) throw new UpstreamError('config', 'Gemini key rejected');
  if (!res.ok) throw new UpstreamError('upstream', `Gemini ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('');
  if (!text) throw new UpstreamError('unreadable', 'empty response');
  try { return JSON.parse(text); } catch { throw new UpstreamError('unreadable', 'bad JSON'); }
}

// Paid option: Claude (set PROVIDER = "claude" and the ANTHROPIC_API_KEY secret).
export async function callClaude(env, body) {
  if (!env.ANTHROPIC_API_KEY) throw new UpstreamError('config', 'ANTHROPIC_API_KEY not set');
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: env.CLAUDE_MODEL || 'claude-opus-5-5',
      max_tokens: 8000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: buildSchema(body.categories) } },
      messages: [{ role: 'user', content: [
        body.mediaType === 'application/pdf'
          ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: body.image } }
          : { type: 'image', source: { type: 'base64', media_type: body.mediaType, data: body.image } },
        { type: 'text', text: buildPrompt(body.categories, String(body.today || '').slice(0, 10)) },
      ] }],
    });
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') throw new UpstreamError('unreadable', res.stop_reason);
    const text = res.content.find(b => b.type === 'text');
    if (!text) throw new UpstreamError('unreadable', 'no text');
    return JSON.parse(text.text);
  } catch (e) {
    if (e instanceof UpstreamError) throw e;
    if (e instanceof Anthropic.RateLimitError) throw new UpstreamError('rate', 'rate');
    if (e instanceof Anthropic.AuthenticationError) throw new UpstreamError('config', 'auth');
    if (e instanceof Anthropic.APIError) throw new UpstreamError('upstream', String(e.status));
    throw new UpstreamError('unreadable', 'parse');
  }
}
