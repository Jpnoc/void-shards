// App settings. Edit these before building the release.
const CONFIG = {
  // URL of your deployed receipt-reading API (see worker/README.md). Leave empty and the app
  // still works, but scans open an empty form for manual entry.
  API_URL: '',
  // Shared key that the API checks (the same value as the APP_KEY secret on the Worker).
  APP_KEY: '',
  PRIVACY_URL: 'https://jpnoc.github.io/void-shards/receiptwise/privacy-policy.html',
  VERSION: '1.0',
  CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'INR', 'MXN', 'BRL', 'ZAR', 'SGD', 'JPY'],
  CATEGORIES: [
    { name: 'Groceries',     color: '#2f9e58', icon: '🛒' },
    { name: 'Dining',        color: '#e86f2c', icon: '🍽️' },
    { name: 'Transport',     color: '#2f7fc8', icon: '🚗' },
    { name: 'Health',        color: '#d3405a', icon: '💊' },
    { name: 'Household',     color: '#8461c4', icon: '🏠' },
    { name: 'Clothing',      color: '#c25c93', icon: '👕' },
    { name: 'Electronics',   color: '#4558c9', icon: '🔌' },
    { name: 'Entertainment', color: '#d49a14', icon: '🎬' },
    { name: 'Personal Care', color: '#1f9f98', icon: '🧴' },
    { name: 'Other',         color: '#76808c', icon: '🧾' },
  ],
};
