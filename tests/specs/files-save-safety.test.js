// Sûreté des sauvegardes : un réglage tourné n'ajoute pas d'étape d'annulation (pas d'instantané complet à chaque cran),
// une sauvegarde en attente part dès que l'onglet est masqué ou fermé, et un démarrage en échec propose de récupérer
// la sauvegarde ou de repartir d'un projet vide.
export default async function (t, A) {
  const S = A.state, h = A.tlHistory;
  const { turnKnob } = await import('/js/app/actions.js');
  const { onMixChange } = await import('/js/app/mixer-ui.js');
  const { save, savePending } = await import('/js/app/save.js');

  // Potentiomètres et faders : enregistrés, sans instantané d'annulation.
  h.commit();
  const past = h.past.length, last = h.last;
  let reads = 0;
  const read = h.read;
  h.read = () => { reads++; return read(); };
  for (let k = 0; k < 30; k++) turnKnob(0, { delta: k % 2 ? 1 : -1 });
  for (const id of Object.keys(S.mix.channels).slice(0, 1)) for (let k = 0; k < 30; k++) { S.mix.channels[id].volume = 0.5 + k / 100; onMixChange(id); }
  h.read = read;
  t.eq(reads, 0, 'aucun instantané de l\'état pendant 60 crans de potentiomètre et de fader');
  t.eq(h.past.length, past, 'aucune étape d\'annulation ajoutée');
  t.ok(h.last === last, 'instantané inchangé');
  t.ok(savePending(), 'les réglages seront bien enregistrés');

  // Onglet masqué ou fermé : la sauvegarde en attente part tout de suite.
  S.bpm = 171;
  save();
  dispatchEvent(new Event('pagehide'));
  t.ok(await t.until(async () => (await A.store.loadState())?.bpm === 171, 3000), 'pagehide : la sauvegarde en attente est écrite sans attendre');

  // Démarrage en échec : les deux boutons de secours, et la sauvegarde téléchargeable telle quelle.
  const files = [];
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) files.push({ name: this.download, href: this.href }); else origClick.call(this); };
  await A.startRescue();
  const box = document.querySelector('#start-rescue');
  t.ok(box && box.querySelectorAll('button').length === 2, 'démarrage en échec : deux boutons de secours');
  box.querySelector('button').click();
  HTMLAnchorElement.prototype.click = origClick;
  t.ok(files.length === 1 && files[0].name.endsWith('.json'), 'la sauvegarde se télécharge', files);
  const raw = files.length ? JSON.parse(await (await fetch(files[0].href)).text()) : null;
  t.eq(raw?.main?.bpm, 171, 'le fichier contient la sauvegarde telle quelle');
  box.remove();
  // Mettre de côté : plus de sauvegarde principale (l'application repartirait d'un projet vide).
  await A.store.setAsideState();
  t.eq(await A.store.loadState(), undefined, 'sauvegarde mise de côté');
  save();
  dispatchEvent(new Event('pagehide'));
  t.ok(await t.until(async () => !!(await A.store.loadState()), 3000), 'l\'état courant se réenregistre');
}
