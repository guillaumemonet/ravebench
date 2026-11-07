// Sortie vers un instrument MIDI externe (synthé, groovebox, piano numérique, autre logiciel) : les notes des blocs
// d'une piste reliée partent avec leur instant (horodatage Web MIDI aligné sur l'horloge audio, donc sur ce qu'on
// entend), le son de l'instrument (sélection de banque + Program Change) au départ de la lecture, et tout est coupé à
// l'arrêt. Même interface que les synthés pour la timeline : noteOn, noteOff, cut.

export class MidiOut {
  /** @param {AudioContext} ctx  @param {MIDIOutput} port  @param {number} ch voie (0..15) */
  constructor(ctx, port, ch) {
    this.ctx = ctx;
    this.port = port;
    this.ch = ch;
    this.on = new Map();   // clé de note -> numéro de note jouée
  }

  // Instant Web MIDI (ms, horloge de performance.now) d'un instant audio ; maintenant si `when` est absent.
  stamp(when) {
    const now = performance.now();
    if (when == null) return now;
    const o = this.ctx.getOutputTimestamp?.();
    const ref = o?.performanceTime ? o : { contextTime: this.ctx.currentTime, performanceTime: now };
    return Math.max(now, ref.performanceTime + (when - ref.contextTime) * 1000);
  }
  send(data, when) {
    try { this.port.send(data, this.stamp(when)); } catch (err) { console.warn('MIDI out', err); }
  }

  /** Son de l'instrument : banque (msb * 128 + lsb, envoyée si > 0) puis programme (0..127, rien si < 0). */
  program(prog, bank = 0) {
    if (bank > 0) { this.send([0xb0 | this.ch, 0, (bank >> 7) & 127]); this.send([0xb0 | this.ch, 32, bank & 127]); }
    if (prog >= 0) this.send([0xc0 | this.ch, prog & 127]);
  }

  noteOn(note, vel, when, key = note) {
    const n = Math.max(0, Math.min(127, Math.round(note)));
    if (this.on.has(key)) this.noteOff(note, false, when, key);
    this.on.set(key, n);
    this.send([0x90 | this.ch, n, Math.max(1, Math.min(127, Math.round(vel * 127)))], when);
  }

  noteOff(note, immediate = false, when, key = note) {
    const n = this.on.get(key) ?? Math.round(note);
    this.on.delete(key);
    this.send([0x80 | this.ch, n, 0], immediate ? undefined : when);
  }

  // Arrêt : les messages déjà programmés sont annulés (si le navigateur le permet), les notes jouées sont relâchées,
  // puis « toutes les notes off » ; le même message repart un peu plus tard, après les débuts de notes déjà envoyés.
  cut(prefix = '') {
    try { this.port.clear?.(); } catch { /* pas de file d'attente à vider */ }
    for (const [key, n] of [...this.on]) {
      if (!String(key).startsWith(prefix)) continue;
      this.send([0x80 | this.ch, n, 0]);
      this.on.delete(key);
    }
    this.send([0xb0 | this.ch, 123, 0]);
    setTimeout(() => this.send([0xb0 | this.ch, 123, 0]), 400);
  }
}
