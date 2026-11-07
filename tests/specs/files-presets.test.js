// Presets et fichiers unifiés : ★ Garder, menu ⋯ (renommer, dupliquer, importer un fichier de preset, supprimer),
// vos presets gardés à part du projet (ils reviennent après l'ouverture d'un fichier qui ne les a pas), banque dans un
// fichier .ravebench, icônes d'export / import dans les barres de titre.
export default async function (t, A) {
  const S = A.state;
  const { packFile } = await import('/js/project.js');
  const { loadFile } = await import('/js/app/files.js');
  const { mergeMine, mySnapshot } = await import('/js/app/mine.js');
  A.wm.toggle('piano', true);
  await t.wait(100);
  const bar = t.$('#synth-pbar');
  t.eq(bar.querySelector('.pb-save').dataset.icon, 'star', '« Garder » avec une étoile, plus de disquette');

  bar.querySelector('.pb-name').value = 'Ma basse';
  bar.querySelector('.pb-save').click();
  const id = S.synthPick;
  t.ok(S.synthUser.some(u => u.id === id && u.name === 'Ma basse'), 'preset gardé');

  // Menu ⋯ : renommer, dupliquer.
  bar.querySelector('.pb-more').click();
  const input = t.$('.pb-menu input');
  t.ok(input && t.$$('.pb-menu .cm-item').length >= 4, 'menu du preset : nom, dupliquer, exporter, importer, supprimer');
  input.value = 'Ma basse grave'; input.dispatchEvent(new Event('change'));
  t.eq(S.synthUser.find(u => u.id === id)?.name, 'Ma basse grave', 'renommé');
  t.$('.pb-menu .cm-item[data-icon="plus"]').click();
  t.ok(S.synthUser.some(u => u.name === 'Ma basse grave 2'), 'dupliqué sous un nom libre', S.synthUser.map(u => u.name));

  // Fichier de preset : il rejoint les vôtres sous un nom libre.
  const n = S.synthUser.length;
  const preset = S.synthUser.find(u => u.id === id);
  const file = new File([await packFile('preset', { tool: 'synth', preset }, [], () => null)], 'p.ravebench');
  await loadFile(file);
  t.eq(S.synthUser.length, n + 1, 'preset importé');
  t.ok(S.synthUser.at(-1).id !== id && S.synthUser.at(-1).name === 'Ma basse grave 3', 'nouvel identifiant, nom libre', S.synthUser.at(-1).name);

  // Vos éléments reviennent quand un fichier ouvert ne les a pas.
  const mine = structuredClone(mySnapshot());
  S.synthUser.length = 0;
  mergeMine(mine);
  t.eq(S.synthUser.length, n + 1, 'vos presets reviennent (fusion)');
  mergeMine(mine);
  t.eq(S.synthUser.length, n + 1, 'sans doublon');

  // Supprimer depuis le menu.
  A.wm.toggle('piano', true);
  bar.querySelector('.pb-sel').value = id; bar.querySelector('.pb-sel').dispatchEvent(new Event('change'));
  bar.querySelector('.pb-more').click();
  t.$('.pb-menu .cm-item[data-icon="trash"]').click();
  t.ok(!S.synthUser.some(u => u.id === id), 'supprimé');

  // Banque dans un fichier .ravebench, ouverte dans la banque affichée.
  const src = S.banks.flat().find(p => p?.sampleId?.startsWith('lib:'));
  const bank = new File([await packFile('bank', { name: 'Mon kit', pads: [{ name: 'Kick test', color: 5, sampleId: src.sampleId, bpm: 0, p: {} }] }, [], () => null)], 'b.ravebench');
  await loadFile(bank);
  t.eq([S.banks[S.bank][0]?.name, S.banks[S.bank][0]?.sampleId, S.bankNames[S.bank]], ['Kick test', src.sampleId, 'Mon kit'], 'banque importée dans la banque affichée');

  // Barres de titre : exporter / importer.
  t.eq(t.$$('[data-win="tr"] .win-file').map(b => b.dataset.icon), ['upload', 'download'], 'icônes importer / exporter');
}
