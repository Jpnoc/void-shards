# Play Console answers for ReceiptWise

Source of truth is Google's own form; these reflect how the app works today (no accounts, no ads, receipts stored on device, photos sent to a Cloudflare Worker that forwards them to Google Gemini).

## App content
- **Privacy policy URL:** publish `docs/privacy-policy.html` (see README) and paste the link.
- **Ads:** No.
- **Target audience:** 18 and over (or 13+). Do not select under-13 groups.
- **App access:** all functionality available without login.
- **Content rating:** Utility / productivity, no user-generated content shared with others.
- **Financial features declaration:** the app tracks personal spending only. It does not offer loans, payments, banking or investments. Choose "My app doesn't provide any financial features".

## Data safety
**Does your app collect or share any of the required user data types?** Yes
**Is all data encrypted in transit?** Yes (HTTPS)
**Can users request data deletion?** Yes. Data lives on the device; users delete it in-app or by uninstalling. Nothing is retained on our servers.

| Data type | Collected | Shared | Ephemeral | Required | Purpose |
|---|---|---|---|---|---|
| Photos and videos → Photos (the receipt photo) | Yes | Yes (with Google, the AI provider) | Yes (processed, not stored by us) | Optional (manual entry sends nothing) | App functionality |
| Financial info → Purchase history (items/prices read from the receipt or invoice) | Yes | Yes (same transfer) | Yes | Optional | App functionality |
| Files and docs → Files and docs (PDF invoices you import) | Yes | Yes (same transfer) | Yes | Optional | App functionality |

Mileage trips are typed in by the user and stay on the device, so they are not collected. The app has no location permission, so do not declare Location. Leave everything else unticked. Because the Gemini free tier lets Google use content to improve its products, the transfer counts as **sharing**, not just service-provider processing. If you move the backend to a paid tier or to Claude (`PROVIDER = "claude"`), re-check this table and the privacy policy.

## Before you rely on the free Gemini tier
Google's terms for the free tier may restrict its use in apps offered to users in the EEA, UK and Switzerland (paid services are required there). Read the current Gemini API terms before choosing countries in Play Console, or restrict distribution to regions the free tier allows.
