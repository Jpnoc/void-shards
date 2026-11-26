// Local storage: receipts in IndexedDB (they can carry a photo thumbnail), settings in localStorage.
const Store = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('receiptwise', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('receipts', { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction('receipts', mode), s = t.objectStore('receipts');
      const req = fn(s);
      t.oncomplete = () => res(req && req.result);
      t.onerror = t.onabort = () => rej(t.error);
    });
  };
  const DEFAULTS = { currency: 'USD', keepPhotos: true, budgets: {} };
  function settings() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('rw-settings') || '{}') }; } catch { return { ...DEFAULTS }; }
  }
  function saveSettings(s) { try { localStorage.setItem('rw-settings', JSON.stringify(s)); } catch (e) { console.warn(e); } }
  return {
    all: () => run('readonly', s => s.getAll()).then(a => a || []),
    put: r => run('readwrite', s => s.put(r)),
    remove: id => run('readwrite', s => s.delete(id)),
    clear: () => run('readwrite', s => s.clear()),
    settings, saveSettings,
  };
})();
