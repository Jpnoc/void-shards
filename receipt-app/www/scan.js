// Taking a photo and sending it to the receipt-reading API.
const Scan = (() => {
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  let Camera = null;
  try { if (native && cap.registerPlugin) Camera = cap.registerPlugin('Camera'); } catch (e) { console.warn(e); }

  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('bad image')); i.src = src; });
  async function resize(src, max, quality) {
    const img = await loadImg(src);
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }

  // Resolves to a data URL, or null if the user cancelled.
  function pick(source) {
    if (Camera && source !== 'file') {
      return Camera.getPhoto({ quality: 90, resultType: 'dataUrl', source: source === 'camera' ? 'CAMERA' : 'PHOTOS', correctOrientation: true })
        .then(p => p.dataUrl).catch(e => { if (/cancel/i.test(String(e && e.message))) return null; throw e; });
    }
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = source === 'file' ? 'application/pdf,image/*' : 'image/*'; if (source === 'camera') inp.setAttribute('capture', 'environment');
      inp.onchange = () => { const f = inp.files[0]; if (!f) return res(null); const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(f); };
      inp.oncancel = () => res(null);
      inp.click();
    });
  }

  // Normalises the API answer into an editable receipt draft.
  function toDraft(ai, today, cats) {
    const items = ai.items.map(i => ({ id: uid(), name: i.name, price: i.price, category: cats.includes(i.category) ? i.category : 'Other', returned: false }));
    const sub = Calc.round2(items.reduce((s, i) => s + i.price, 0));
    // If the printed total is higher/lower than items + tax (tip, fees, rounding), add one reconciling line so totals match the receipt.
    const gap = Calc.round2(ai.total - ai.tax - sub);
    if (ai.total > 0 && Math.abs(gap) >= 0.05)
      items.push({ id: uid(), name: gap > 0 ? 'Tip / fees / other' : 'Adjustment', price: gap, category: 'Other', returned: false });
    return { id: uid(), store: ai.store, date: ai.date && ai.date <= today ? ai.date : today, tax: ai.tax, items, createdAt: Date.now(), kind: 'personal', notes: '' };
  }

  async function read(dataUrl, today, cats) {
    if (!CONFIG.API_URL) { const e = new Error('not_configured'); e.code = 'not_configured'; throw e; }
    const isPdf = /^data:application\/pdf/.test(dataUrl);
    const payload = isPdf ? dataUrl : await resize(dataUrl, 1568, 0.85);
    const b64 = payload.split(',')[1];
    if (b64.length > 5500000) { const e = new Error('too_large'); e.code = 'too_large'; throw e; }
    let res;
    try {
      res = await fetch(CONFIG.API_URL.replace(/\/$/, '') + '/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-app-key': CONFIG.APP_KEY },
        body: JSON.stringify({ image: b64, mediaType: isPdf ? 'application/pdf' : 'image/jpeg', categories: cats, today }),
        signal: AbortSignal.timeout(60000),
      });
    } catch { const e = new Error('offline'); e.code = 'offline'; throw e; }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(body.error || 'failed'); e.code = res.status === 429 ? 'busy' : 'failed'; throw e; }
    if (!body.is_receipt || !body.items.length) { const e = new Error('not_receipt'); e.code = 'not_receipt'; throw e; }
    return toDraft(body, today, cats);
  }

  return { pick, resize, read };
})();
function uid() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); }
