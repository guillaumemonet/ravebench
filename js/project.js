// Fichiers Ravebench (.ravebench, JSON) : le projet entier, le morceau de la timeline, ou les réglages d'un outil.
// Les fichiers d'avant le changement de nom (.gabber, format gabberkey-file) s'ouvrent toujours.
// { format, version, kind, app, saved, data, samples: { id: { name, audio (data-URL) } } }
// Les sons de la bibliothèque et du kit de départ sont désignés par leur nom (ils sont dans l'application) ;
// les sons importés et les enregistrements (« user: », « rec: ») sont embarqués : le fichier se suffit à lui-même.
import { t } from './i18n.js';

export const FILE_FORMAT = 'ravebench-file';
export const FILE_EXT = '.ravebench';
const OLD_FORMATS = ['gabberkey-file'];   // GabberKey, l'ancien nom
// Contenus possibles : projet, morceau, et un par outil.
// Plus : une banque de pads (bank), toutes les banques (banks), un de vos presets (preset).
export const FILE_KINDS = ['project', 'song', 'tr', 'tr8', 'seq', 'slicer', 'acid', 'osc', 'piano', 'kick', 'mix', 'patch', 'scenes',
  'gen', 'breizh', 'buildup', 'voice', 'tune', 'curve', 'decks', 'launcher', 'buses', 'viz', 'monitor', 'bank', 'banks', 'preset'];

const toDataUrl = bytes => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(new Blob([bytes], { type: 'application/octet-stream' }));
});
// Son embarqué : une URL « data: » en base64, décodée sur place (un fichier ne déclenche jamais de requête réseau).
export const fromDataUrl = url => {
  const m = typeof url === 'string' ? /^data:[^,;]*(?:;[^,;]*)*;base64,/.exec(url) : null;
  if (!m) return null;
  try {
    const bin = atob(url.slice(m[0].length));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  } catch { return null; }
};

// Sons à embarquer : ceux qui ne viennent pas de l'application.
export const embeddable = id => typeof id === 'string' && /^(user|rec):/.test(id);

// loadSample(id) -> { name, data } | null
export async function packFile(kind, data, sampleIds, loadSample) {
  const samples = {};
  for (const id of new Set([...sampleIds].filter(embeddable))) {
    const s = await loadSample(id).catch(() => null);
    if (s?.data) samples[id] = { name: s.name ?? '', audio: await toDataUrl(s.data) };
  }
  const file = { format: FILE_FORMAT, version: 1, app: 'Ravebench', kind, saved: new Date().toISOString(), data, samples };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export async function readFile(file) {
  let json;
  try { json = JSON.parse(await file.text()); } catch { throw new Error(t('file.bad')); }
  if (![FILE_FORMAT, ...OLD_FORMATS].includes(json?.format) || !FILE_KINDS.includes(json.kind) || !json.data || typeof json.data !== 'object' || Array.isArray(json.data)) throw new Error(t('file.bad'));
  const samples = {};
  for (const [id, s] of Object.entries(json.samples ?? {})) {
    if (!embeddable(id) || typeof s?.audio !== 'string') continue;
    const data = fromDataUrl(s.audio);
    if (data) samples[id] = { name: String(s.name ?? '').slice(0, 80), data };
  }
  return { kind: json.kind, data: json.data, samples };
}
