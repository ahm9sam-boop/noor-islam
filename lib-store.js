// تخزين محلي: localStorage للإعدادات الصغيرة، IndexedDB للبيانات الكبيرة (الكتب، المصحف الكامل).
const P = 'noor:';

export const ls = {
  get(k, d = null) {
    try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch { return false; }
  },
  del(k) { try { localStorage.removeItem(P + k); } catch { /* ignore */ } },
  clearAll() {
    try { Object.keys(localStorage).filter((k) => k.startsWith(P)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
  }
};

let dbPromise;
function db() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB غير مدعوم'));
  dbPromise ||= new Promise((res, rej) => {
    const r = indexedDB.open('noor-db', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbPromise;
}
function tx(mode, fn) {
  return db().then((d) => new Promise((res, rej) => {
    const t = d.transaction('kv', mode);
    const req = fn(t.objectStore('kv'));
    t.oncomplete = () => res(req?.result);
    t.onerror = () => rej(t.error);
  }));
}
export const idb = {
  get: (k) => tx('readonly', (s) => s.get(k)).catch(() => undefined),
  set: (k, v) => tx('readwrite', (s) => s.put(v, k)).then(() => true).catch(() => false),
  del: (k) => tx('readwrite', (s) => s.delete(k)).catch(() => undefined),
  keys: () => tx('readonly', (s) => s.getAllKeys()).catch(() => []),
  async clear() { await tx('readwrite', (s) => s.clear()).catch(() => undefined); }
};
