// Pistes reliées à un instrument MIDI externe : menu de la piste › « Instrument MIDI externe… » choisit la sortie
// (synthé, groovebox, piano numérique, autre logiciel), la voie et le son de l'instrument (jeu General MIDI, banque).
// Les blocs de notes de la piste partent alors vers l'instrument au lieu des sons de Ravebench (js/midiout.js).
import { GM_FAMILIES, gmLabel } from '../gm.js';
import { t } from '../i18n.js';
import { MidiOut } from '../midiout.js';
import { cleanMidiOut } from '../timeline.js';
import { engine, state, timeline } from './core.js';
import { midiHub } from './midi-ui.js';
import { toast } from './misc.js';
import { save } from './save.js';
import { renderTl, trackName } from './tl.js';

const outs = new Map();   // « sortie:voie » -> MidiOut
const portByName = name => midiHub.outputs.find(p => p.name === name) ?? null;

/** Sortie d'une piste reliée, si son instrument est branché ; sinon null. */
export function trackOut(tr) {
  const port = tr?.midi && portByName(tr.midi.port);
  if (!port) return null;
  const key = `${port.id}:${tr.midi.ch}`;
  let o = outs.get(key);
  if (!o || o.port !== port) outs.set(key, (o = new MidiOut(engine.ctx, port, tr.midi.ch)));
  return o;
}

/** « Synthé 1 · voie 2 · 39 · Synth Bass 2 » : résumé de la sortie d'une piste (badge, menu). */
export function midiOutLabel(m) {
  if (!m) return '';
  return [m.port, t('mout.channelN', { n: m.ch + 1 }), m.prog >= 0 ? gmLabel(m.prog) : '', m.bank ? t('mout.bankN', { n: m.bank }) : ''].filter(Boolean).join(' · ')
    + (portByName(m.port) ? '' : ` (${t('mout.unplugged')})`);
}

let panel = null;
function closePanel() { panel?.remove(); panel = null; window.removeEventListener('pointerdown', outside, true); window.removeEventListener('keydown', onKey, true); }
const outside = e => { if (panel && !panel.contains(e.target)) closePanel(); };
const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); closePanel(); } };

export function openMidiOut(i, x, y) {
  closePanel();
  const tr = state.tl.tracks[i];
  if (!tr) return;
  panel = document.createElement('div');
  panel.className = 'clip-menu mout-panel';
  const head = document.createElement('div');
  head.className = 'cm-head';
  head.textContent = `${t('mout.title')} · ${trackName(i)}`;
  panel.appendChild(head);
  const row = (label, el) => {
    const r = document.createElement('label');
    r.className = 'cm-row';
    r.append(Object.assign(document.createElement('span'), { textContent: label }), el);
    panel.appendChild(r);
    el.addEventListener('keydown', e => e.stopPropagation());
    return el;
  };
  const m = tr.midi ?? { port: '', ch: 0, prog: -1, bank: 0 };
  // Instrument : les sorties MIDI branchées (celle enregistrée reste proposée, même débranchée).
  const port = row(t('mout.port'), document.createElement('select'));
  port.add(new Option(t('mout.none'), ''));
  const names = [...new Set(midiHub.outputs.map(p => p.name))];
  if (m.port && !names.includes(m.port)) names.push(m.port);
  for (const n of names) port.add(new Option(portByName(n) ? n : `${n} (${t('mout.unplugged')})`, n));
  port.value = m.port;
  const ch = row(t('mout.channel'), document.createElement('select'));
  for (let c = 0; c < 16; c++) ch.add(new Option(String(c + 1), c));
  ch.value = m.ch;
  // Son : le jeu General MIDI par famille (ce que comprennent les claviers, pianos numériques et modules courants).
  const prog = row(t('mout.sound'), document.createElement('select'));
  prog.add(new Option(t('mout.keep'), -1));
  GM_FAMILIES.forEach((f, k) => {
    const g = document.createElement('optgroup');
    g.label = f;
    for (let p = k * 8; p < k * 8 + 8; p++) g.appendChild(new Option(gmLabel(p), p));
    prog.appendChild(g);
  });
  prog.value = m.prog;
  const num = v => Object.assign(document.createElement('input'), { type: 'number', min: 0, max: 127, value: v, className: 'mout-num' });
  const msb = num(m.bank >> 7), lsb = num(m.bank & 127);
  const bank = document.createElement('span');
  bank.className = 'mout-bank';
  bank.append(msb, lsb);
  row(t('mout.bank'), bank);
  msb.title = t('mout.msb');
  lsb.title = t('mout.lsb');
  const hint = document.createElement('p');
  hint.className = 'hint';
  panel.appendChild(hint);
  const btns = document.createElement('div');
  btns.className = 'mout-btns';
  const test = Object.assign(document.createElement('button'), { textContent: t('mout.test') });
  test.dataset.icon = 'play';
  btns.appendChild(test);
  panel.appendChild(btns);

  const apply = (sendSound = false) => {
    const clip7 = v => Math.max(0, Math.min(127, Math.round(+v || 0)));
    tr.midi = port.value ? cleanMidiOut({ port: port.value, ch: +ch.value, prog: +prog.value, bank: clip7(msb.value) * 128 + clip7(lsb.value) }) : null;
    for (const el of [ch, prog, msb, lsb, test]) el.disabled = !tr.midi;
    hint.textContent = !names.length ? t('mout.noOutputs') : tr.midi ? t('mout.hint') : t('mout.hintNone');
    if (sendSound && tr.midi?.prog >= 0) trackOut(tr)?.program(tr.midi.prog, tr.midi.bank);
    renderTl();
    save();
  };
  port.addEventListener('change', () => apply(true));
  ch.addEventListener('change', () => apply(true));
  prog.addEventListener('change', () => apply(true));
  msb.addEventListener('change', () => apply(true));
  lsb.addEventListener('change', () => apply(true));
  // Note d'essai : un do3 d'une demi-seconde, avec le son choisi.
  test.addEventListener('click', () => {
    const o = trackOut(tr);
    if (!o) { toast(t('mout.unpluggedToast', { name: tr.midi?.port ?? '' }), 3000); return; }
    if (tr.midi.prog >= 0) o.program(tr.midi.prog, tr.midi.bank);
    const now = engine.ctx.currentTime;
    o.noteOn(60, 0.8, now + 0.02, 'mout-test');
    o.noteOff(60, false, now + 0.52, 'mout-test');
  });
  apply();
  document.body.appendChild(panel);
  const r = panel.getBoundingClientRect();
  panel.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
  panel.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
  setTimeout(() => { window.addEventListener('pointerdown', outside, true); window.addEventListener('keydown', onKey, true); });
}

// Branché au démarrage : la timeline demande la sortie de chaque piste reliée.
export function buildMidiOut() {
  timeline.midiOutFor = trackOut;
}
