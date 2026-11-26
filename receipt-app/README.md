# ReceiptWise

Snap a photo of a sales receipt and AI sorts every item into budget categories. Android app (Capacitor), ready for Google Play.

- **Scan:** camera or gallery, or type a receipt by hand. AI reads store, date, items, tax; review and fix before saving.
- **Categories:** Groceries, Dining, Transport, Health, Household, Clothing, Electronics, Entertainment, Personal Care, Other (edit in `www/config.js`).
- **Running totals:** after every save you see Today / This week / This month, and the Home screen always shows today, week, month and year.
- **Returns:** tick **Returned** on an item and its price plus its share of tax comes off every total and budget.
- **Budgets:** monthly limit per category with progress bars. **Export** everything to CSV.
- **Private:** receipts live in the phone's storage. No accounts, no ads.

## Layout
```
www/        the app (index.html, app.js, calc.js, scan.js, store.js, config.js, style.css)
worker/     free Cloudflare Worker that reads receipts with AI (see worker/README.md)
android/    Capacitor Android project (targetSdk 36)
docs/       privacy policy + Play Console answers
store-listing/  listing text, icon, feature graphic, screenshots
test/       unit tests (calc) and browser tests (e2e.mjs)
```

## Run and test
```bash
cd receipt-app && npm install && npm run vendor && npm test          # logic tests
npm run serve                                                         # http://localhost:8081
cd worker && npm install && npm test                                  # backend tests
```

## Build for Google Play
1. Deploy the backend (`worker/README.md`) and set `API_URL` / `APP_KEY` in `www/config.js`.
2. Create an upload key once and **back it up, never commit it**:
   `keytool -genkeypair -v -keystore android/upload-key.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
3. `cp android/keystore.properties.example android/keystore.properties` and fill in the passwords.
4. `npm run build:release` -> `android/app/build/outputs/bundle/release/app-release.aab`
5. Bump `versionCode` / `versionName` in `android/app/build.gradle` for every update.

## Publish checklist
- Play Console account ($25 one-time). App ID is `com.jpbcommerce.receiptwise` and cannot change after first upload.
- Host `docs/privacy-policy.html` (GitHub Pages, folder `/docs`, or copy it next to the game's) and update `PRIVACY_URL` in `www/config.js`.
- Fill the store listing from `store-listing/listing.md`; answers for Data safety, Ads, Target audience in `docs/data-safety.md`.
- New personal accounts must run a closed test with 12+ testers for 14 days before production.
