// Sauvegarde locale (IndexedDB) : réglages + fichiers audio importés.

const DB_NAME = 'apc-studio';
let dbPromise;

function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('state');
      req.result.createObjectStore('samples');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const loadState = () => tx('state', 'readonly', s => s.get('main'));
export const saveState = state => tx('state', 'readwrite', s => s.put(state, 'main'));
export const loadSample = id => tx('samples', 'readonly', s => s.get(id));
export const saveSample = (id, sample) => tx('samples', 'readwrite', s => s.put(sample, id));
export const deleteSample = id => tx('samples', 'readwrite', s => s.delete(id));
export const listSampleIds = () => tx('samples', 'readonly', s => s.getAllKeys());
// Vos presets, courbes et sons (js/app/mine.js), gardés à part du projet.
export const loadMine = () => tx('state', 'readonly', s => s.get('mine'));
export const saveMine = mine => tx('state', 'readwrite', s => s.put(mine, 'mine'));
// Tout réinitialiser sauf ce qui est à vous : vos éléments et les sons de « keep ».
export async function clearProject(keep) {
  await tx('state', 'readwrite', s => s.delete('main'));
  const ids = await listSampleIds();
  await Promise.all(ids.filter(id => !keep.includes(id)).map(deleteSample));
}
export const clearAll = () => Promise.all([
  tx('state', 'readwrite', s => s.clear()),
  tx('samples', 'readwrite', s => s.clear()),
]);
