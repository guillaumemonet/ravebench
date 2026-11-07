// Fichiers MIDI (.mid) : export des blocs de notes de la timeline (une piste MIDI par piste, chacune sur sa voie avec
// son son General MIDI ; les coups de pads sur le canal 10, notes 36 et suivantes), import d'un fichier en blocs de
// notes (une voie et un son par bloc, sur des pistes libres, à la tête de lecture), à retoucher dans le piano roll. Le
// son General MIDI d'une voie choisit le preset le plus proche (js/gm.js).
import { download, stamp } from '../recorder.js';
import { t } from '../i18n.js';
import { catColor } from '../library.js';
import { gmPreset, presetGm } from '../gm.js';
import { clipEvents } from '../notes.js';
import { presetById } from '../presets.js';
import { readMidi, writeMidi } from '../smf.js';
import { BEATS_PER_BAR, MAX_TRACKS, newTrack } from '../timeline.js';
import { state, timeline } from './core.js';
import { toast } from './misc.js';
import { save } from './save.js';
import { armedTrack, renderTl, trackName } from './tl.js';

// Son General MIDI d'une piste : celui de sa sortie MIDI externe, sinon celui du preset le plus joué par ses blocs.
function trackProgram(tr) {
  if (tr.midi) return { program: tr.midi.prog, bank: tr.midi.bank };
  const count = new Map();
  for (const c of tr.clips) if (c.type === 'note' && !c.kick && !c.osc && !c.smps) count.set(c.preset ?? state.preset, (count.get(c.preset ?? state.preset) ?? 0) + 1);
  const id = [...count].sort((a, b) => b[1] - a[1])[0]?.[0] ?? state.preset;
  return { program: presetGm(id, presetById(id).family) };
}

/** Notes de la timeline par piste : [{ name, channel, program, notes }] (pistes vides ignorées). */
export function timelineMidiTracks() {
  const out = [];
  let ch = 0;
  state.tl.tracks.forEach((tr, i) => {
    const notes = [], drums = [];
    for (const c of tr.clips) {
      if (c.type === 'note') for (const e of clipEvents(c)) notes.push({ t: c.start + e.t, len: e.len, note: e.note, vel: Math.min(1, e.vel * (c.gain ?? 1)) });
      else if (c.type === 'pad') drums.push({ t: c.start, len: 0.25, note: 36 + (c.pad % 40), vel: Math.min(1, (c.vel ?? 1) * (c.gain ?? 1)) });
    }
    // Une voie par piste (la 10 reste à la batterie) ; une piste reliée à un instrument externe garde la sienne.
    const channel = tr.midi ? tr.midi.ch : ch;
    if (notes.length && !tr.midi) { ch = (ch + 1) % 16; if (ch === 9) ch = 10; }
    if (notes.length) out.push({ name: trackName(i), channel, ...trackProgram(tr), notes });
    if (drums.length) out.push({ name: `${trackName(i)} (pads)`, channel: 9, notes: drums });
  });
  return out;
}

export function exportMidi() {
  const tracks = timelineMidiTracks();
  if (!tracks.length) { toast(t('midi.noNotes'), 3500); return; }
  download(new Blob([writeMidi(tracks, state.bpm)], { type: 'audio/midi' }), `ravebench-${stamp()}.mid`);
  toast(t('midi.exported', { n: tracks.length }), 3000);
}

export const isMidiFile = file => /\.(mid|midi|smf)$/i.test(file.name) || file.type === 'audio/midi';

// Pistes libres sur [start, end[, à partir de la piste armée ; ajoute des pistes s'il en manque (jusqu'au maximum).
export function freeTracks(start, end, n) {
  const tracks = state.tl.tracks, out = [];
  const free = tr => !tr.clips.some(c => c.start < end - 1e-6 && start < c.start + timeline.clipBeats(c) - 1e-6);
  for (let k = 0; k < tracks.length && out.length < n; k++) { const i = (armedTrack() + k) % tracks.length; if (free(tracks[i])) out.push(i); }
  while (out.length < n && tracks.length < MAX_TRACKS) { tracks.push(newTrack()); out.push(tracks.length - 1); }
  return out;
}

/** Un fichier MIDI devient des blocs de notes, à partir de la mesure de la tête de lecture. -> nombre de blocs */
export async function importMidiFile(file) {
  let midi;
  try { midi = readMidi(await file.arrayBuffer()); } catch (err) { toast(t('midi.bad', { msg: err.message }), 4000); return 0; }
  if (!midi.tracks.length) { toast(t('midi.empty'), 3500); return 0; }
  const start = Math.floor(state.tl.playhead / BEATS_PER_BAR) * BEATS_PER_BAR;
  // Un bloc par voie et par son de chaque piste MIDI (un fichier de type 0 met toutes les voies dans une piste).
  const groups = [];
  midi.tracks.forEach((mt, k) => {
    const by = new Map();
    for (const n of mt.notes) {
      const key = `${n.ch}:${n.ch === 9 ? -1 : n.prog}`;
      if (!by.has(key)) by.set(key, { name: mt.name || t('midi.track', { n: k + 1 }), ch: n.ch, prog: n.ch === 9 ? -1 : n.prog, notes: [] });
      by.get(key).notes.push(n);
    }
    groups.push(...by.values());
  });
  const blocks = groups.map(g => {
    const last = Math.max(...g.notes.map(n => n.t + n.len));
    const len = Math.max(BEATS_PER_BAR, Math.ceil(last / BEATS_PER_BAR - 1e-6) * BEATS_PER_BAR);
    const name = groups.filter(o => o.name === g.name).length > 1 ? `${g.name} (${g.ch === 9 ? t('midi.drums') : t('midi.channel', { n: g.ch + 1 })})` : g.name;
    return { len, clip: { id: crypto.randomUUID(), type: 'note', seq: g.notes.map(n => ({ t: +n.t.toFixed(4), len: +n.len.toFixed(4), note: n.note, vel: +n.vel.toFixed(3) })),
      pat: len, len, start, name: name.slice(0, 32), cat: 'lead', color: catColor('lead'), loop: false, ...(g.prog >= 0 ? { preset: gmPreset(g.prog) } : {}) } };
  });
  const end = start + Math.max(...blocks.map(b => b.len));
  const lanes = freeTracks(start, end, blocks.length);
  blocks.slice(0, lanes.length).forEach((b, k) => state.tl.tracks[lanes[k]].clips.push(b.clip));
  if (end > state.tl.bars * BEATS_PER_BAR) state.tl.bars = Math.min(256, Math.ceil(end / BEATS_PER_BAR));
  renderTl();
  save();
  const placed = Math.min(lanes.length, blocks.length);
  toast(t('midi.imported', { n: placed, name: file.name, bpm: Math.round(midi.bpm) }) + (placed < blocks.length ? ` · ${t('midi.noRoom', { n: blocks.length - placed })}` : ''), 5000);
  return placed;
}
