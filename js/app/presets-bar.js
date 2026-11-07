// Barre de presets des instruments.
import { ACID_CATS, ACID_SOUNDS, soundParams } from '../acid.js';
import { t } from '../i18n.js';
import { KICK_CATS, KICK_PRESETS, KICK_PRESET_CAT, kickDefaults } from '../kickdesign.js';
import { prepareKickClips } from '../kicksynth.js';
import { OSC_CATS, OSC_PRESETS, OSC_PRESET_CAT } from '../osc.js';
import { PAGES, toValue } from '../params.js';
import { FAMILIES, PRESETS } from '../presets.js';
import { renderAcid, renderAcidKnobs } from './acid-ui.js';
import { $, acid, engine, state } from './core.js';
import { kickChanged, renderKick } from './kick-ui.js';
import { renderKnobs } from './knobs.js';
import { toast } from './misc.js';
import { loadOscPreset, renderOsc } from './osc-ui.js';
import { rollPresetOptions } from './roll-ui.js';
import { exportPreset, openFile } from './files.js';
import { save } from './save.js';
import { applyPreset, renderSynthKnobs } from './synth-ui.js';
import { DRUM_DEFS, renderTr } from './drum-ui.js';

// ---------- Barre de presets (instruments) ----------


// Un menu par catégories (presets fournis, puis les vôtres ★), « Garder comme preset » sous un nom et une catégorie,
// et le menu ⋯ du preset choisi : renommer, dupliquer, exporter dans un fichier, importer, supprimer. Le même partout.
// cfg : { kind (outil, pour les fichiers de preset), cats, catLabel(cat), builtins: [{ id, cat, name }],
//         user(): [{ id, cat, name, … }] (la liste de l'état), current(): id | null, apply(id), save(name, cat) -> id,
//         remove(id), refresh?() (après un changement de nom ou un import : menus qui listent vos presets) }
export const presetBars = {};   // outil -> barre (import d'un fichier de preset)
let menu = null;
function closeMenu() { menu?.remove(); menu = null; window.removeEventListener('pointerdown', outside, true); }
const outside = e => { if (menu && !menu.contains(e.target)) closeMenu(); };
// Nom libre : « Basse », « Basse 2 », « Basse 3 »…
export function freeName(list, name) {
  if (!list.some(p => p.name === name)) return name;
  const base = name.replace(/ \d+$/, '').slice(0, 21);
  for (let n = 2; ; n++) if (!list.some(p => p.name === `${base} ${n}`)) return `${base} ${n}`;
}

export function presetBar(wrap, cfg) {
  wrap.classList.add('preset-bar');
  wrap.innerHTML = `<select class="pb-sel" title="${t('pb.title')}"></select>
    <input class="pb-name" maxlength="24" spellcheck="false" placeholder="${t('pb.namePh')}">
    <select class="pb-cat" title="${t('pb.cat')}"></select>
    <button class="pb-save" data-icon="star" title="${t('pb.save.title')}">${t('pb.save')}</button>
    <button class="pb-more icon-only" title="${t('pb.more')}" aria-label="${t('pb.more')}">⋯</button>`;
  const sel = wrap.querySelector('.pb-sel'), name = wrap.querySelector('.pb-name'), cat = wrap.querySelector('.pb-cat');
  for (const c of cfg.cats) cat.add(new Option(cfg.catLabel(c), c));
  cat.hidden = cfg.cats.length < 2;   // une seule catégorie (vos réglages) : pas de menu
  name.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') wrap.querySelector('.pb-save').click(); });
  const render = () => {
    sel.innerHTML = '';
    sel.add(new Option(t('pb.custom'), ''));
    for (const c of cfg.cats) {
      const g = document.createElement('optgroup');
      g.label = cfg.catLabel(c);
      for (const p of cfg.builtins.filter(p => p.cat === c)) g.appendChild(new Option(p.name, p.id));
      for (const p of cfg.user().filter(p => p.cat === c)) g.appendChild(new Option(`★ ${p.name}`, p.id));
      sel.appendChild(g);
    }
    sel.value = cfg.current() ?? '';
    sel.options[0].hidden = cfg.current() != null;
    const mine = cfg.user().find(u => u.id === cfg.current());
    if (mine) cat.value = mine.cat;
    else { const b = cfg.builtins.find(p => p.id === cfg.current()); if (b) cat.value = b.cat; }
  };
  const changed = () => { render(); cfg.refresh?.(); save(); };
  sel.addEventListener('change', () => { if (sel.value) cfg.apply(sel.value); render(); });
  wrap.querySelector('.pb-save').addEventListener('click', () => {
    const n = (name.value.trim() || t('pb.defaultName', { n: cfg.user().length + 1 })).slice(0, 24);
    cfg.save(n, cat.value);
    name.value = '';
    render();
    toast(t('pb.saved', { name: n }));
  });
  // Menu ⋯ du preset affiché.
  wrap.querySelector('.pb-more').addEventListener('click', e => {
    if (menu) { closeMenu(); return; }
    const id = cfg.current();
    const mine = cfg.user().find(u => u.id === id);
    const shown = mine ?? cfg.builtins.find(p => p.id === id);
    menu = document.createElement('div');
    menu.className = 'clip-menu pb-menu';
    const head = document.createElement('div');
    head.className = 'cm-head';
    head.textContent = shown ? `${mine ? '★ ' : ''}${shown.name}` : t('pb.custom');
    menu.appendChild(head);
    const item = (label, icon, fn, disabled = false) => {
      const b = document.createElement('button');
      b.className = 'cm-item';
      b.textContent = label;
      b.dataset.icon = icon;
      b.disabled = disabled;
      b.addEventListener('click', () => { closeMenu(); fn(); });
      menu.appendChild(b);
    };
    if (mine) {
      const input = Object.assign(document.createElement('input'), { className: 'bm-rename', value: mine.name, maxLength: 24 });
      input.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') closeMenu(); });
      input.addEventListener('change', () => {
        const v = input.value.trim().slice(0, 24);
        if (v && v !== mine.name) { mine.name = freeName(cfg.user().filter(u => u !== mine), v); changed(); }
      });
      const row = document.createElement('label');
      row.className = 'cm-row';
      row.append(Object.assign(document.createElement('span'), { textContent: t('pb.rename') }), input);
      menu.appendChild(row);
    }
    item(t('pb.duplicate'), 'plus', () => {
      const n = freeName(cfg.user(), shown?.name ?? t('pb.defaultName', { n: cfg.user().length + 1 }));
      cfg.save(n, cat.value);
      changed();
      toast(t('pb.saved', { name: n }));
    });
    item(t('pb.export'), 'download', () => exportPreset(cfg.kind, mine), !mine);
    item(t('pb.import'), 'upload', openFile);
    menu.appendChild(document.createElement('hr'));
    item(t('pb.del'), 'trash', () => { cfg.remove(id); render(); cfg.refresh?.(); }, !mine);
    document.body.appendChild(menu);
    const r = e.currentTarget.getBoundingClientRect(), m = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(r.right - m.width, innerWidth - m.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(r.bottom + 4, innerHeight - m.height - 8))}px`;
    setTimeout(() => window.addEventListener('pointerdown', outside, true));
  });
  render();
  const bar = { render, cfg };
  if (cfg.kind) presetBars[cfg.kind] = bar;
  return bar;
}

// Kits de son des boîtes à rythmes (TR-909 : 'tr', TR-808 : 'tr8').
export const drumPresets = {};
export function buildDrumPresets(id) {
  const def = DRUM_DEFS[id], st = () => state[id];
  drumPresets[id] = presetBar($(`#${id}-pbar`), {
    kind: id,
    cats: def.cats,
    catLabel: c => t(`tr.cat.${c}`),
    builtins: def.kits.map(k => ({ id: k.id, cat: k.cat, name: t(`${id}.kit.${k.id}`) })),
    user: () => st().userKits,
    current: () => st().kit,
    apply: kit => {
      const u = st().userKits.find(x => x.id === kit), b = def.kits.find(x => x.id === kit);
      if (!u && !b) return;
      st().params = def.kitParams(u ? u.params : b.v);
      st().kit = kit;
      renderTr();
      renderKnobs();
      save();
    },
    save: (name, cat) => {
      let u = st().userKits.find(x => x.name === name);
      if (!u) { u = { id: `u:${crypto.randomUUID()}`, name }; st().userKits.push(u); }
      Object.assign(u, { cat, params: structuredClone(st().params) });
      st().kit = u.id;
      save();
      return u.id;
    },
    remove: kit => { st().userKits = st().userKits.filter(x => x.id !== kit); st().kit = null; save(); },
  });
}

// Presets du designer de kick (les boutons restent pour les presets fournis).
export let kickPresets = null;
export function buildKickPresets() {
  kickPresets = presetBar($('#kick-pbar'), {
    kind: 'kick',
    cats: KICK_CATS,
    refresh: () => { rollPresetOptions(); renderKick(); },
    catLabel: c => t(`kick.cat.${c}`),
    builtins: Object.keys(KICK_PRESETS).map(id => ({ id, cat: KICK_PRESET_CAT[id], name: t(`kick.preset.${id}`) })),
    user: () => state.kick.user,
    current: () => state.kick.preset,
    apply: id => {
      const u = state.kick.user.find(x => x.id === id);
      if (!u && !KICK_PRESETS[id]) return;
      state.kick.params = { ...kickDefaults(), ...(u ? u.params : KICK_PRESETS[id]) };
      state.kick.preset = id;
      kickChanged(true);
    },
    save: (name, cat) => {
      let u = state.kick.user.find(x => x.name === name);
      if (!u) { u = { id: `u:${crypto.randomUUID()}`, name }; state.kick.user.push(u); }
      Object.assign(u, { cat, params: { ...state.kick.params } });
      state.kick.preset = u.id;
      // Les mélodies de kick jouées par ce kick enregistré prennent ses nouveaux réglages.
      for (const c of state.tl.tracks.flatMap(tr => tr.clips)) if (c.kickSrc === u.id) c.kick = { ...kickDefaults(), ...u.params };
      prepareKickClips(state.tl.tracks, engine.ctx.sampleRate);
      rollPresetOptions();
      renderKick();
      save();
      return u.id;
    },
    remove: id => { state.kick.user = state.kick.user.filter(x => x.id !== id); state.kick.preset = null; rollPresetOptions(); renderKick(); save(); },
  });
}

// Presets du synthé en couches : ceux fournis (par famille) et les tiens (un preset de départ + tes potentiomètres).
export let synthPresets = null;
export const synthCurrent = () => (state.synthDirty ? null : state.synthPick ?? state.preset);
export function buildSynthPresets() {
  synthPresets = presetBar($('#synth-pbar'), {
    kind: 'synth',
    cats: FAMILIES,
    catLabel: f => t(`family.${f}`),
    builtins: PRESETS.map(p => ({ id: p.id, cat: p.family, name: p.name })),
    user: () => state.synthUser,
    current: synthCurrent,
    apply: id => {
      const u = state.synthUser.find(x => x.id === id);
      if (!u) { applyPreset(id); return; }
      applyPreset(u.base);
      for (const def of PAGES.synth.params) {
        if (!Number.isFinite(u.values[def.id])) continue;
        state.globals[def.id] = u.values[def.id];
        engine.set(def.id, toValue(def, u.values[def.id]));
      }
      state.synthPick = id;
      state.synthDirty = false;
      renderSynthKnobs();
      renderKnobs();
      synthPresets.render();
      save();
    },
    save: (name, cat) => {
      let u = state.synthUser.find(x => x.name === name);
      if (!u) { u = { id: `u:${crypto.randomUUID()}`, name }; state.synthUser.push(u); }
      Object.assign(u, { cat, base: state.preset, values: Object.fromEntries(PAGES.synth.params.map(d => [d.id, state.globals[d.id]])) });
      state.synthPick = u.id;
      state.synthDirty = false;
      save();
      return u.id;
    },
    remove: id => { state.synthUser = state.synthUser.filter(x => x.id !== id); state.synthPick = null; state.synthDirty = true; save(); },
  });
}
// Un potentiomètre du synthé tourné : le preset devient « perso ».
export function synthTouched() {
  if (state.synthDirty) return;
  state.synthDirty = true;
  synthPresets?.render();
}

// Presets du synthé à oscillateurs : catégories, et les tiens.
export let oscPresets = null;
export function buildOscPresets() {
  oscPresets = presetBar($('#osc-pbar'), {
    kind: 'osc',
    cats: OSC_CATS,
    refresh: () => { renderOsc(); rollPresetOptions(); },
    catLabel: c => t(`osc.cat.${c}`),
    builtins: OSC_PRESETS.map(p => ({ id: p.id, cat: OSC_PRESET_CAT[p.id] ?? 'lead', name: t(`osc.preset.${p.id}`) })),
    user: () => state.osc.user,
    current: () => state.osc.preset,
    apply: id => loadOscPreset(id),
    save: (name, cat) => {
      let u = state.osc.user.find(x => x.name === name);
      if (!u) { u = { id: `u:${crypto.randomUUID()}`, name }; state.osc.user.push(u); }
      Object.assign(u, { cat, params: { ...state.osc.params } });
      state.osc.preset = u.id;
      renderOsc();
      rollPresetOptions();
      save();
      return u.id;
    },
    remove: id => { state.osc.user = state.osc.user.filter(x => x.id !== id); state.osc.preset = null; renderOsc(); rollPresetOptions(); save(); },
  });
}

// Presets de son de la TB-303.
export let acidPresets = null;
export function buildAcidPresets() {
  acidPresets = presetBar($('#acid-presets'), {
    kind: 'acid',
    cats: ACID_CATS,
    catLabel: c => t(`acid.cat.${c}`),
    builtins: ACID_SOUNDS.map(s => ({ id: s.id, cat: s.cat, name: t(`acid.snd.${s.id}`) })),
    user: () => state.acid.user,
    current: () => state.acid.sound,
    apply: id => {
      const u = state.acid.user.find(x => x.id === id), b = ACID_SOUNDS.find(x => x.id === id);
      if (!u && !b) return;
      state.acid.params = u ? { ...u.params } : soundParams(b.v);
      state.acid.wave = (u ?? b).wave;
      state.acid.sound = id;
      acidSoundChanged(false);
    },
    save: (name, cat) => {
      const list = state.acid.user;
      let u = list.find(x => x.name === name);
      if (!u) { u = { id: `u:${crypto.randomUUID()}`, name, cat }; list.push(u); }
      Object.assign(u, { cat, wave: state.acid.wave, params: { ...state.acid.params } });
      state.acid.sound = u.id;
      save();
      return u.id;
    },
    remove: id => { state.acid.user = state.acid.user.filter(x => x.id !== id); state.acid.sound = null; save(); },
  });
}

// Un réglage de la TB-303 a changé : le son suit ; s'il vient des potentiomètres, le preset devient « perso ».
export function acidSoundChanged(custom = true) {
  if (custom) state.acid.sound = null;
  acid.update();
  renderAcid();
  renderAcidKnobs();
  if (state.page === 'acid') renderKnobs();
  acidPresets?.render();
  save();
}
