/* MINDWORK local persistence: IndexedDB with an in-memory fallback.
   Stores: kv (profile, settings, draft), attempts (by id), sessions (by id). */
(function (root) {
  function create(idb, name) {
    let db = null, ok = false; const blank = () => ({ kv: {}, attempts: {}, sessions: {}, journal: {}, books: {}, cards: {}, studylog: {}, notes: {}, maps: {}, links: {} }); let mem = blank();
    const STORES = ['kv', 'attempts', 'sessions', 'journal', 'books', 'cards', 'studylog', 'notes', 'maps', 'links'];
    const open = () => new Promise(res => {
      if (!idb) return res(false);
      try {
        const rq = idb.open(name || 'mindwork', 4);
        rq.onupgradeneeded = () => { const d = rq.result; STORES.forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); }); };
        rq.onsuccess = () => { db = rq.result; ok = true; res(true); };
        rq.onerror = () => res(false); rq.onblocked = () => res(false);
      } catch (e) { res(false); }
    });
    const req = (store, mode, fn) => new Promise((res, rej) => {
      try {
        const t = db.transaction(store, mode); const r = fn(t.objectStore(store));
        t.oncomplete = () => res(r && 'result' in r ? r.result : undefined);
        t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('Storage transaction aborted'));
      } catch (e) { rej(e); }
    });
    const copy = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
    return {
      open, get persistent() { return ok; },
      get: (s, k) => ok ? req(s, 'readonly', st => st.get(k)) : Promise.resolve(copy(mem[s][k])),
      put: (s, k, v) => ok ? req(s, 'readwrite', st => st.put(copy(v), k)) : Promise.resolve(void (mem[s][k] = copy(v))),
      del: (s, k) => ok ? req(s, 'readwrite', st => st.delete(k)) : Promise.resolve(void delete mem[s][k]),
      all: s => ok ? req(s, 'readonly', st => st.getAll()).then(r => r || []) : Promise.resolve(Object.values(mem[s]).map(copy)),
      clear: () => ok ? Promise.all(STORES.map(n => req(n, 'readwrite', st => st.clear()))) : Promise.resolve(void (mem = blank())),
      putMany: (s, entries) => ok ? req(s, 'readwrite', st => { entries.forEach(([k, v]) => st.put(copy(v), k)); return null; }) : Promise.resolve(void entries.forEach(([k, v]) => { mem[s][k] = copy(v); })),
      estimate: async () => { try { return navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch (e) { return null; } },
      close: () => { if (db) db.close(); }
    };
  }
  const api = { create };
  if (typeof module !== 'undefined') module.exports = api; else root.MWStore = api;
})(this);
