# ReceiptWise API (free to run)

A tiny Cloudflare Worker. The app sends it a receipt photo; it asks an AI vision model to read it and returns clean JSON.
The AI key lives here, never inside the app.

**Cost: $0.** Cloudflare Workers free plan (100,000 requests/day) + Google Gemini API free tier.

## Deploy (about 5 minutes)

1. Get a free Gemini key at https://aistudio.google.com/apikey
2. Make a free Cloudflare account at https://dash.cloudflare.com/sign-up
3. Run:
```bash
cd receipt-app/worker && npm install && npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_KEY      # type any long random string
npx wrangler deploy                  # prints https://receiptwise-api.<you>.workers.dev
```
4. Put the URL and the same random string in `receipt-app/www/config.js` (`API_URL`, `APP_KEY`), then rebuild the app.

Quick check: `curl -s -X POST $URL/scan` should answer `{"error":"Unauthorized"}`.

## Free-tier limits and trade-offs
- Gemini's free tier has daily/per-minute request caps, so a very popular app will start getting "busy, try again" replies. The app falls back to manual entry.
- On the free tier Google may use submitted content to improve its products. The privacy policy and Data safety answers already say so.
- Google's terms may require paid services for users in the EEA, UK and Switzerland. Check the current terms before selecting those countries.
- `APP_KEY` only stops casual abuse (anyone can extract it from the APK). The per-IP rate limit in `wrangler.toml` is the real guard.

## Switching to Claude (paid, most accurate)
`npx wrangler secret put ANTHROPIC_API_KEY`, set `PROVIDER = "claude"` in `wrangler.toml`, deploy, and update the privacy policy / Data safety answers.
`CLAUDE_MODEL` defaults to `claude-opus-5-5`; `claude-haiku-5-5` is far cheaper per scan.
