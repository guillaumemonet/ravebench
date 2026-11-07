// Motifs « aléatoires » qui sonnent : lignes de TB-303 et grooves de TR-909 / TR-808. Le hasard choisit dans des
// formes connues du genre (rythmes de lignes acid, styles de batterie) au lieu de tirer chaque pas à pile ou face :
// une ligne acid a un motif court qui revient, varie, puis se résout sur la tonique ; une batterie garde son squelette
// (grosse caisse, clap, charleys) et ajoute ghost notes, fill et crash.

const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;

// ---------- TB-303 ----------

// Rythmes de lignes acid (x = note, . = silence), tous avec une note sur le premier pas.
const ACID_RHYTHMS = [
  'x.xxx.x.xx.xx.x.', 'xx.x.xx.x.xx.xx.', 'x.x.xxx.x.x.xx.x', 'xxx.xx.xxx.xx.x.', 'x..xx.x.x..xx.xx',
  'x.xx.xx.x.xx.xxx', 'xx.xx.x.xx.xx.x.', 'x.xxxx.xx.xxx.x.', 'x..x..x.x..x..xx', 'xxxxxxxxxxxxxxxx',
];
// Gammes à partir de la tonique (fa) : mineure naturelle, phrygienne (seconde mineure, plus sombre), mineure harmonique.
const ACID_SCALES = [[0, 2, 3, 5, 7, 8, 10, 12], [0, 1, 3, 5, 7, 8, 10, 12], [0, 2, 3, 5, 7, 8, 11, 12]];

/**
 * Ligne de TB-303 de 16 pas en fa (lignes 0..12 de la grille) : { note, gate, acc, slide, oct }.
 * Styles : pédale (la tonique qui revient, des notes qui répondent, octaves), riff (un motif de 4 notes répété et
 * varié, fin sur la tonique), arpège (notes d'un accord qui montent et descendent), question-réponse.
 */
export function acidLine(style = pick(['pedal', 'pedal', 'riff', 'riff', 'arp', 'call'])) {
  const scale = pick(ACID_SCALES);
  const rhythm = pick(ACID_RHYTHMS);
  const on = [...rhythm].map(c => c === 'x');
  const gated = on.map((g, s) => (g ? s : -1)).filter(s => s >= 0);
  const notes = new Array(16).fill(0), oct = new Array(16).fill(0);
  const deg = d => scale[Math.max(0, Math.min(scale.length - 1, d))];
  if (style === 'pedal') {
    const answers = [deg(pick([2, 3, 4])), deg(pick([4, 6, 7])), deg(pick([5, 6, 2]))];   // trois notes qui reviennent
    let k = 0;
    for (const s of gated) {
      if (s % 4 === 0 || chance(0.4)) { notes[s] = 0; if (s % 4 === 2 && chance(0.5)) oct[s] = 1; }
      else notes[s] = answers[k++ % answers.length];
    }
  } else if (style === 'riff' || style === 'call') {
    // Motif de 4 notes en marche (pas de 1 ou 2 degrés), départ sur la tonique.
    const motif = [0];
    for (let i = 1; i < 4; i++) {
      let d = motif[i - 1] + pick([-2, -1, 1, 1, 2, 2, 3]);
      if (d < 0 || d > 5 || d === motif[i - 1]) d = motif[i - 1] + (motif[i - 1] < 3 ? 2 : -1);
      motif.push(d);
    }
    const half = gated.filter(s => s < 8), rest = gated.filter(s => s >= 8);
    half.forEach((s, i) => { notes[s] = deg(motif[i % 4]); });
    if (style === 'riff') {
      // Deuxième moitié : le motif, puis une fin qui retombe sur la tonique (ou la quinte).
      rest.forEach((s, i) => { notes[s] = deg(motif[i % 4] + (i >= rest.length - 2 ? 0 : i % 4 === 3 ? 1 : 0)); });
      if (rest.length) notes[rest.at(-1)] = chance(0.7) ? 0 : 7;
    } else {
      // Réponse : le motif décalé vers le haut, terminé sur la tonique ; la question finit sur la quinte.
      if (half.length) notes[half.at(-1)] = 7;
      rest.forEach((s, i) => { notes[s] = deg(motif[i % 4] + 2); });
      if (rest.length) notes[rest.at(-1)] = 0;
    }
  } else {
    // Arpège d'un accord de la gamme (i, iv, VI ou v), en aller-retour.
    const chord = pick([[0, 3, 7, 12], [0, 3, 7, 10], [5, 8, 12, 3], [8, 12, 3, 7], [7, 10, 2, 5]]).map(n => (n === 2 && !scale.includes(2) ? 3 : n));
    const seq = [...chord, ...chord.slice(1, -1).reverse()];
    gated.forEach((s, i) => { notes[s] = seq[i % seq.length]; if (notes[s] === 0 && i % seq.length === 0 && chance(0.3) && s % 4 !== 0) oct[s] = 1; });
  }
  if (chance(0.25)) { const s = pick(gated.filter(x => x % 4 === 3)); if (s !== undefined && notes[s] === 0) oct[s] = -1; }
  // Accents : 3 à 5, plutôt sur les contretemps (c'est ce qui fait « parler » la ligne).
  const accents = new Set([0]);
  const offs = gated.filter(s => s % 4 === 2 || s % 4 === 3);
  while (accents.size < 3 + Math.floor(Math.random() * 3) && accents.size < gated.length) accents.add(chance(0.7) && offs.length ? pick(offs) : pick(gated));
  // Glissés : entre deux notes qui se suivent et proches (jamais vers un silence), 2 à 4 par ligne.
  const slides = new Set();
  for (const s of gated) {
    if (slides.size >= 4) break;
    if (on[s + 1] && Math.abs(notes[s + 1] + 12 * oct[s + 1] - notes[s] - 12 * oct[s]) <= 5 && chance(0.35)) slides.add(s);
  }
  return on.map((g, s) => (g ? { note: notes[s], gate: true, acc: accents.has(s), slide: slides.has(s), oct: oct[s] } : { note: 0, gate: false, acc: false, slide: false, oct: 0 }));
}

// ---------- TR-909 / TR-808 ----------

const steps = str => [...str].map((c, s) => (c === 'X' ? 2 : c === 'x' ? 1 : 0)).map((v, s) => [s, v]).filter(([, v]) => v);
// Styles de batterie : chaque instrument a une ou plusieurs lignes possibles (X = accent, x = coup, . = rien).
const DRUM_STYLES = {
  tr: {
    gabber: { bd: ['X...X...X...X...'], oh: ['..x...x...x...x.'], hc: ['....x.......x...', '....x.......x..x'], ch: ['', 'x.x.x.x.x.x.x.x.'] },
    hardcore: { bd: ['X...X...X...X...', 'X...X...X...X.x.'], hc: ['....X.......X...'], oh: ['..x...x...x...x.'], ch: ['xxx.xxx.xxx.xxx.', 'x.xxx.xxx.xxx.xx'], rd: ['', 'x...x...x...x...'] },
    techno: { bd: ['X...X...X...X...'], ch: ['x.xxx.xxx.xxx.xx', '..x...x...x...x.', 'xxxxxxxxxxxxxxxx'], oh: ['..x...x...x...x.', '', '......x.......x.'], hc: ['....x.......x...', '', '....x.......x...'], rd: ['', 'x.x.x.x.x.x.x.x.'] },
    rave: { bd: ['X...X...X...X...'], sd: ['....X.......X...'], ch: ['x.x.x.x.x.x.x.x.'], oh: ['..x...x...x...x.'], rd: ['x...x...x...x...', ''] },
    breakbeat: { bd: ['X.x.......x.....', 'X.........X.x...', 'X..x......x..x..'], sd: ['....X..x.x..X...', '....X.......X..x', '....X.x.....X...'], ch: ['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx'], oh: ['', '..........x.....'] },
    hardstyle: { bd: ['X...X...X...X...'], hc: ['....X.......X...'], ch: ['..x...x...x...x.'], oh: ['', '..x...x...x...x.'], rd: ['', 'x...x...x...x...'] },
  },
  tr8: {
    electro: { bd: ['X.....x...x.....', 'X.....x..x......', 'X..x......x.....'], sd: ['....X.......X...'], cp: ['....x.......x...', ''], ch: ['x.x.x.x.x.x.x.x.', 'xxxxxxxxxxxxxxxx'], cb: ['', '..x.......x.....', '......x.......x.'] },
    house: { bd: ['X...X...X...X...'], cp: ['....X.......X...'], ch: ['x.x.x.x.x.x.x.x.'], oh: ['..x...x...x...x.'], cb: ['', '...x.......x....'], cl: ['', '.x...x.....x..x.'] },
    trap: { bd: ['X......x..x.....', 'X.........x..x..', 'X......x.x......'], cp: ['........X.......'], sd: ['', '........x.......'], ch: ['x.x.x.x.x.x.xxxx', 'x.x.x.xxx.x.x.x.', 'xxx.x.x.x.x.xxxx'], oh: ['', '..............x.'] },
    miami: { bd: ['X..x..x...x.....', 'X..x..x..x..x...'], sd: ['....X.......X...'], ch: ['xxxxxxxxxxxxxxxx'], cb: ['..x...x.....x...', ''], cl: ['', '.....x.....x....'] },
    hiphop: { bd: ['X......x.x......', 'X.x.......x.....'], sd: ['....X.......X...'], ch: ['x.x.x.x.x.x.x.x.'], oh: ['', '......x.........'], rs: ['', '...x......x.....'] },
  },
};
const FILLS = {
  tr: [{ sd: '............xxXX' }, { lt: '............x...', mt: '.............x..', ht: '..............xX' }, { sd: '............x.xX' }, { bd: '............xxxx' }],
  tr8: [{ lt: '............x...', mt: '.............x..', ht: '..............xX' }, { sd: '............xxxX' }, { ch: '............xxxx' }, { cp: '..............xX' }],
};

/**
 * Groove de 16 pas pour la TR-909 (`tr`) ou la TR-808 (`tr8`) : { instrument: [0 | 1 | 2] x16 } (2 = accent).
 * Un style du genre au hasard, une variante par instrument, parfois une ghost note, un fill sur le dernier temps, un crash.
 */
export function drumGroove(machine, ids, style = pick(Object.keys(DRUM_STYLES[machine]))) {
  const pat = Object.fromEntries(ids.map(id => [id, new Array(16).fill(0)]));
  const set = (id, str) => { if (pat[id]) for (const [s, v] of steps(str)) pat[id][s] = Math.max(pat[id][s], v); };
  for (const [id, lines] of Object.entries(DRUM_STYLES[machine][style])) set(id, pick(lines));
  // Ghost notes de caisse claire (ou de rimshot) sur des doubles croches faibles.
  const ghost = pat.sd ? 'sd' : 'rs';
  if (pat[ghost] && chance(0.5)) for (const s of [3, 7, 11, 14].filter(() => chance(0.3))) if (!pat[ghost][s] && !pat.bd?.[s]) pat[ghost][s] = 1;
  // Fill sur le dernier temps, une fois sur trois ; crash ou cymbale au début, une fois sur trois.
  if (chance(0.35)) {
    const fill = pick(FILLS[machine]);
    for (const id of Object.keys(fill)) if (pat[id]) for (let s = 12; s < 16; s++) pat[id][s] = 0;
    for (const [id, str] of Object.entries(fill)) set(id, str);
  }
  const crash = pat.cr ? 'cr' : pat.cy ? 'cy' : null;
  if (crash && chance(0.3)) pat[crash][0] = 2;
  return pat;
}
