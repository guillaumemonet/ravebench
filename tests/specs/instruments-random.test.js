// Aléatoire musical (TB-303 : motif qui revient et se résout, accents, glissés ; TR-909 / TR-808 : un groove du genre)
// et bouton d'un instrument qui joue fenêtre fermée : il clignote dans la barre des plugins.
export default async function (t, A) {
  const S = A.state;
  const { acidLine, drumGroove } = await import('/js/patterngen.js');
  const { drum } = await import('/js/app/core.js');

  // TB-303 : 50 lignes, toutes jouables et musicales.
  let ok = 0;
  for (let k = 0; k < 50; k++) {
    const l = acidLine();
    const g = l.filter(s => s.gate);
    const distinct = new Set(g.map(s => s.note + 12 * s.oct)).size;
    const slidesOk = l.every((s, i) => !s.slide || l[i + 1]?.gate);
    if (l.length === 16 && l[0].gate && g.every(s => s.note >= 0 && s.note <= 12) && distinct >= 2 && g.some(s => s.acc) && slidesOk) ok++;
  }
  t.eq(ok, 50, 'lignes de 303 : 16 pas, départ sur le temps, au moins 2 notes, des accents, glissés vers une note');
  A.wm.toggle('acid', true);
  t.$('#acid-random').click();
  t.ok(S.acid.patterns[S.acid.pattern][0].gate, 'bouton Aléatoire de la 303');

  // TR-909 / TR-808.
  const g9 = drumGroove('tr', ['bd', 'sd', 'rs', 'hc', 'lt', 'mt', 'ht', 'ch', 'oh', 'cr', 'rd']);
  t.ok(g9.bd[0] > 0 && Object.values(g9).flat().filter(Boolean).length >= 8, 'groove 909 : grosse caisse sur le premier temps, un vrai groove', g9);
  A.wm.toggle('tr', true);
  t.$('#tr-random').click();
  t.ok(S.tr.patterns[S.tr.pattern].bd.some(Boolean), 'bouton Aléatoire de la 909');
  A.wm.toggle('tr8', true);
  t.$('#tr8-random').click();
  t.ok(Object.values(S.tr8.patterns[S.tr8.pattern]).flat().some(Boolean), 'bouton Aléatoire de la 808');

  // La 909 joue, sa fenêtre est fermée : son bouton clignote ; arrêtée, il s'arrête.
  drum.start();
  A.wm.toggle('tr', false);
  const btn = t.$('#plugins button[data-plugin="tr"]');
  await t.until(() => btn.classList.contains('running'), 2000);
  t.ok(btn.classList.contains('running'), 'la 909 joue fenêtre fermée : son bouton clignote');
  A.wm.toggle('tr', true);
  await t.wait(350);
  t.ok(!btn.classList.contains('running'), 'fenêtre ouverte : plus de clignotement');
  drum.stop();
}
