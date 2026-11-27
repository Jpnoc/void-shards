// Local storage: receipts and trips in IndexedDB (receipts can carry a photo thumbnail), settings in localStorage.
const Store = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('receiptwise', 2);
    r.onupgradeneeded = () => { for (const n of ['receipts', 'trips']) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (name, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(name, mode), req = fn(t.objectStore(name));
      t.oncomplete = () => res(req && req.result);
      t.onerror = t.onabort = () => rej(t.error);
    });
  };
  const table = name => ({
    all: () => run(name, 'readonly', s => s.getAll()).then(a => a || []),
    put: r => run(name, 'readwrite', s => s.put(r)),
    remove: id => run(name, 'readwrite', s => s.delete(id)),
    clear: () => run(name, 'readwrite', s => s.clear()),
  });
  const DEFAULTS = { currency: 'USD', keepPhotos: true, budgets: {}, unit: 'mi', rate: 0 };
  function settings() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('rw-settings') || '{}') }; } catch { return { ...DEFAULTS }; }
  }
  function saveSettings(s) { try { localStorage.setItem('rw-settings', JSON.stringify(s)); } catch (e) { console.warn(e); } }
  const receipts = table('receipts'), trips = table('trips');
  return { ...receipts, trips, clearAll: () => Promise.all([receipts.clear(), trips.clear()]), settings, saveSettings };
})();
