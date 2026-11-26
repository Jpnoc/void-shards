// Monetization settings. Change these when your real AdMob account is ready.
const CONFIG = {
  // Public privacy policy (GitHub Pages from the docs/ folder). Also enter this URL in Play Console.
  PRIVACY_POLICY_URL: 'https://jpnoc.github.io/void-shards/privacy-policy.html',

  // false = real ads. Never tap real ads on your own phone: register it as a test device in AdMob
  // (Settings > Test devices) so it gets test ads, or set this to true for a local test build.
  USE_TEST_ADS: false,
  // Void Shards "Out of moves" rewarded ad unit (AdMob app ca-app-pub-8133533482418386~8739565872).
  ADMOB_REWARDED_ID: 'ca-app-pub-8133533482418386/3215329348',
  // The AdMob *app* ID lives in android/app/src/main/AndroidManifest.xml (com.google.android.gms.ads.APPLICATION_ID).

  ECONOMY: {
    startCrystals: 300,
    startBoosters: { hammer: 1, shuffle: 1, defuse: 1 },
    winBase: 20,          // crystals for any win
    winPerStar: 10,       // plus this per star
    firstClearBonus: 30,  // extra the first time a sector is cleared
    adCrystals: 30,       // "watch ad for crystals" on the map
    adCrystalsPerDay: 5,
    dailyBase: 50,        // daily reward: 50, 60, 70 ... capped at day 7
    dailyStep: 10,
    continueCost: 200,    // +5 moves for crystals
    continueMoves: 5,
    prices: { hammer: 120, shuffle: 80, defuse: 150 },
  },
};
