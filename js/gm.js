// General MIDI : les 128 sons du jeu standard (noms d'origine, en anglais, comme sur les instruments) en 16 familles
// de 8, et leur équivalent dans les presets du synthé (import et export des fichiers MIDI).

export const GM_FAMILIES = ['Piano', 'Chromatic Percussion', 'Organ', 'Guitar', 'Bass', 'Strings', 'Ensemble', 'Brass', 'Reed', 'Pipe',
  'Synth Lead', 'Synth Pad', 'Synth Effects', 'Ethnic', 'Percussive', 'Sound Effects'];

export const GM_NAMES = [
  'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano', 'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavinet',
  'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone', 'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
  'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ', 'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
  'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)', 'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar Harmonics',
  'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass', 'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
  'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato Strings', 'Orchestral Harp', 'Timpani',
  'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2', 'Choir Aahs', 'Voice Oohs', 'Synth Voice', 'Orchestra Hit',
  'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
  'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
  'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
  'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)', 'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass + lead)',
  'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)', 'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
  'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)', 'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
  'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bagpipe', 'Fiddle', 'Shanai',
  'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
  'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet', 'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot',
];

// Preset du synthé le plus proche de chaque son General MIDI (une entrée par son, dans l'ordre des numéros).
const NEAREST = [
  ...Array(8).fill('rave_piano'),
  'glass_pad', 'glass_pad', 'glass_pad', 'glass_pad', 'rave_piano', 'rave_piano', 'glass_pad', 'rave_piano',
  ...Array(5).fill('organ'), 'organ', 'organ', 'organ',
  'rave_piano', 'rave_piano', 'rave_piano', 'rave_piano', 'stab', 'detuned_lead', 'detuned_lead', 'glass_pad',
  'bass', 'bass', 'bass', 'bass', 'bass', 'bass', 'bass', 'reese',
  'high_strings', 'epic_strings', 'dark_strings', 'dark_strings', 'epic_strings', 'staccato_strings', 'glass_pad', 'orch_hit',
  'epic_strings', 'epic_strings', 'solina', 'solina', 'ooh_choir', 'ooh_choir', 'rave_choir', 'orch_hit',
  'horn', 'horn', 'horn', 'horn', 'horn', 'horn', 'stab', 'stab',
  'horn', 'horn', 'horn', 'horn', 'bombarde', 'bombarde', 'bombarde', 'bombarde',
  'init', 'init', 'init', 'init', 'init', 'init', 'init', 'init',
  'init', 'detuned_lead', 'init', 'init', 'screech', 'rave_choir', 'hardstyle_lead', 'gabber_lead',
  'glass_pad', 'warm_pad', 'supersaw_pad', 'rave_choir', 'dark_pad', 'thunder_pad', 'glass_pad', 'sweep_pad',
  'glass_pad', 'dark_pad', 'glass_pad', 'warm_pad', 'supersaw_pad', 'dark_pad', 'sweep_pad', 'laser',
  'rave_piano', 'rave_piano', 'rave_piano', 'rave_piano', 'glass_pad', 'cornemuse', 'high_strings', 'bombarde',
  'glass_pad', 'stab', 'stab', 'stab', 'stab', 'stab', 'stab', 'sweep_pad',
  'laser', 'laser', 'sweep_pad', 'laser', 'siren_fx', 'siren_fx', 'sweep_pad', 'laser',
];

// Son General MIDI de chaque preset fourni (export) : celui qui le décrit le mieux, sinon celui de sa famille.
const GM_OF = {
  rave_piano: 0, organ: 16, bass: 38, sub_bass: 38, reese: 39, acid: 87, epic_strings: 48, high_strings: 40, dark_strings: 42,
  staccato_strings: 45, solina: 50, ooh_choir: 53, dark_choir: 52, rave_choir: 54, orch_hit: 55, horn: 61, stab: 62,
  hardcore_stab: 62, belgian: 62, supersaw_stab: 62, init: 80, detuned_lead: 81, gabber_lead: 87, screech: 84, alarm_lead: 80,
  hardstyle_lead: 86, supersaw_uplift: 81, supersaw_pad: 90, warm_pad: 89, dark_pad: 92, glass_pad: 88, sweep_pad: 95,
  thunder_pad: 93, laser: 103, rave_siren: 125, siren_fx: 125, kick: 118, cornemuse: 109, biniou: 109, bagad: 109,
  bombarde: 68, bombardes: 68, bourdon: 109,
};
const GM_FAMILY = { strings: 48, pads: 89, choirs: 52, supersaw: 81, hoovers: 87, leads: 81, basses: 38, stabs: 62, keys: 0, breizh: 109, fx: 103 };

/** Preset du synthé le plus proche d'un son General MIDI (0..127). */
export const gmPreset = program => NEAREST[program] ?? 'init';
/** Son General MIDI d'un preset du synthé (id, famille). */
export const presetGm = (id, family) => GM_OF[id] ?? GM_FAMILY[family] ?? 0;
/** « 39 · Synth Bass 2 » : numéro (de 1 à 128, comme sur les instruments) et nom. */
export const gmLabel = program => `${program + 1} · ${GM_NAMES[program]}`;
