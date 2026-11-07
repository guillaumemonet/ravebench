// MIDI et instruments : piste reliée à un instrument externe (fausse sortie MIDI qui note ce qu'elle reçoit : son au
// départ, notes horodatées, tout coupé à l'arrêt), changement de son reçu d'un clavier (Program Change), fichiers MIDI
// avec leurs sons General MIDI (import : preset le plus proche ; export : voie et son par piste).
export default async function (t, A) {
  const S = A.state;
  const { midiHub } = await import('/js/app/midi-ui.js');
  const { timeline } = await import('/js/app/core.js');
  const { writeMidi, readMidi } = await import('/js/smf.js');
  const { importMidiFile, timelineMidiTracks } = await import('/js/app/midi-files.js');
  const { gmPreset } = await import('/js/gm.js');
  const { presetOrder, synthPresets } = await import('/js/app/presets-bar.js');

  const log = [];
  const fake = { id: 'fake-out', name: 'Fake synth', send: (data, ts) => log.push({ data: [...data], ts }), clear() {} };
  midiHub.outputs.push(fake);

  // Menu de la piste 1 › Instrument MIDI externe… : sortie, son 39 (Synth Bass 2).
  const head = t.$$('.tl-head')[0];
  head.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 50, clientY: 200 }));
  await t.wait(50);
  t.$('.track-menu .cm-item[data-icon="keys"]').click();
  await t.wait(50);
  const [port, ch, prog] = t.$$('.mout-panel select');
  port.value = 'Fake synth'; port.dispatchEvent(new Event('change'));
  ch.value = 2; ch.dispatchEvent(new Event('change'));
  prog.value = 38; prog.dispatchEvent(new Event('change'));
  t.eq(S.tl.tracks[0].midi, { port: 'Fake synth', ch: 2, prog: 38, bank: 0 }, 'piste reliée : sortie, voie 3, son 39');
  t.ok(log.some(m => m.data[0] === 0xc2 && m.data[1] === 38), 'le son part tout de suite (Program Change voie 3)');
  t.ok(!t.$('.tl-head .tl-ext').hidden, 'badge MIDI sur la piste');
  document.body.click();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

  // Lecture : son au départ, notes horodatées, arrêt.
  S.tl.tracks[0].clips.push({ id: 'ext1', type: 'note', start: 0, len: 4, pat: 4, loop: false, seq: [{ t: 0, len: 1, note: 60, vel: 0.8 }, { t: 1, len: 1, note: 63, vel: 0.5 }], name: 'Ext', cat: 'lead', color: 9 });
  log.length = 0;
  timeline.play(0);
  await t.until(() => log.some(m => m.data[0] === 0x92 && m.data[1] === 63), 3000);
  timeline.stop();
  await t.wait(50);
  const on = log.filter(m => m.data[0] === 0x92);
  t.ok(log.findIndex(m => m.data[0] === 0xc2) < log.findIndex(m => m.data[0] === 0x92), 'le son est envoyé avant les notes');
  t.eq(on.map(m => m.data[1]), [60, 63], 'les notes du bloc partent vers l\'instrument');
  t.ok(on[1].ts - on[0].ts > 0.9 * timeline.beatDur * 1000 && on[1].ts - on[0].ts < 1.1 * timeline.beatDur * 1000, 'notes horodatées à un temps d\'écart', on[1].ts - on[0].ts);
  t.eq(on[1].data[2], 64, 'vélocité');
  t.ok(log.some(m => m.data[0] === 0xb2 && m.data[1] === 123), 'arrêt : toutes les notes off');
  S.tl.tracks[0].clips = S.tl.tracks[0].clips.filter(c => c.id !== 'ext1');

  // Export MIDI : la piste reliée garde sa voie et son son.
  S.tl.tracks[0].clips.push({ id: 'ext2', type: 'note', start: 0, len: 4, pat: 4, loop: false, seq: [{ t: 0, len: 1, note: 48, vel: 0.8 }], name: 'Ext', cat: 'lead', color: 9 });
  const mt = timelineMidiTracks().find(x => x.channel === 2);
  t.ok(mt && mt.program === 38, 'export : voie et son de l\'instrument', mt);
  const back = readMidi(writeMidi(timelineMidiTracks(), 120));
  t.ok(back.tracks.some(tr => tr.notes.some(n => n.ch === 2 && n.prog === 38)), 'le fichier écrit contient le Program Change');
  S.tl.tracks[0].clips = S.tl.tracks[0].clips.filter(c => c.id !== 'ext2');
  S.tl.tracks[0].midi = null;

  // Import : chaque voie devient un bloc avec le preset le plus proche de son son General MIDI.
  const file = new File([writeMidi([{ name: 'Strings', channel: 0, program: 48, notes: [{ t: 0, len: 4, note: 60 }] }, { name: 'Bass', channel: 1, program: 38, notes: [{ t: 0, len: 1, note: 36 }] }], 120)], 'gm.mid', { type: 'audio/midi' });
  await importMidiFile(file);
  const clips = S.tl.tracks.flatMap(tr => tr.clips);
  t.eq([clips.find(c => c.name === 'Strings')?.preset, clips.find(c => c.name === 'Bass')?.preset], [gmPreset(48), gmPreset(38)], 'import : presets choisis par le son General MIDI');

  // Program Change reçu d'un clavier qui suit la fenêtre active (page du synthé) : le 3e preset du menu.
  A.setPage('synth');
  midiHub.onMessage('Fake keyboard', new Uint8Array([0xc0, 2]));
  await t.wait(50);
  const third = presetOrder(synthPresets.cfg)[2];
  t.eq(S.preset, third.id, 'Program Change : 3e son du synthé', S.preset);
  midiHub.onMessage('Fake keyboard', new Uint8Array([0xb0, 0, 0]));
  midiHub.onMessage('Fake keyboard', new Uint8Array([0xb0, 32, 0]));
  midiHub.onMessage('Fake keyboard', new Uint8Array([0xc0, 0]));
  await t.wait(50);
  t.eq(S.preset, presetOrder(synthPresets.cfg)[0].id, 'avec sélection de banque 0 : le 1er son');
  midiHub.outputs.splice(midiHub.outputs.indexOf(fake), 1);
}
