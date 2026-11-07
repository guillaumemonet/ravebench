// Ce qui est à vous : vos presets (★), vos courbes du designer d'effet et vos sons (kicks du designer, sons importés).
// Ils sont gardés à part du projet, dans le navigateur : ouvrir un projet, un fichier d'outil ou tout réinitialiser
// ne les efface plus, ils rejoignent ceux du projet ouvert (un élément déjà là, même identifiant, est gardé tel quel).
import { cleanCurve } from '../curves.js';
import { FAMILIES, PRESETS, presetById } from '../presets.js';
import * as store from '../storage.js';
import { state } from './core.js';
import { cleanToolPresets } from './tool-presets.js';

/** Vos éléments, tels que gardés dans le navigateur (listes de l'état, pas des copies). */
export function mySnapshot() {
  return { tr: state.tr.userKits, tr8: state.tr8.userKits, kick: state.kick.user, synth: state.synthUser, osc: state.osc.user, acid: state.acid.user,
    tools: state.toolPresets, curves: state.curves, sounds: state.userSounds };
}

const own = x => typeof x?.id === 'string' && x.id.startsWith('u:') && typeof x.name === 'string';
const add = (list, extra, ok = own, key = 'id') => {
  for (const x of Array.isArray(extra) ? extra : []) if (ok(x) && !list.some(y => y[key] === x[key])) list.push(x);
};

/** Ajoute vos éléments qui manquent à l'état (après l'ouverture d'un projet, d'un fichier d'outil, au démarrage). */
export function mergeMine(m) {
  if (!m || typeof m !== 'object') return;
  add(state.tr.userKits, m.tr, x => own(x) && x.params);
  add(state.tr8.userKits, m.tr8, x => own(x) && x.params);
  add(state.kick.user, m.kick, x => own(x) && x.params);
  add(state.osc.user, m.osc, x => own(x) && x.params);
  add(state.acid.user, m.acid, x => own(x) && x.params);
  add(state.synthUser, (Array.isArray(m.synth) ? m.synth : []).filter(u => own(u) && u.values && PRESETS.some(p => p.id === u.base))
    .map(u => ({ ...u, cat: FAMILIES.includes(u.cat) ? u.cat : presetById(u.base).family })));
  const tools = cleanToolPresets(m.tools);
  for (const k of Object.keys(tools)) { state.toolPresets[k] ??= []; add(state.toolPresets[k], tools[k]); }
  add(state.curves, (Array.isArray(m.curves) ? m.curves : []).map(cleanCurve), c => c?.id?.startsWith('u:'));
  add(state.userSounds, m.sounds, s => typeof s?.sampleId === 'string' && s.sampleId.startsWith('user:'), 'sampleId');
}

/** Vos éléments gardés dans le navigateur, ajoutés à l'état. */
export async function restoreMine() {
  mergeMine(await store.loadMine().catch(() => null));
}
