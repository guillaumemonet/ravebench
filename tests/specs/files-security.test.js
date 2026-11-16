// Sécurité des fichiers ouverts : un nom piégé reste du texte, un son embarqué n'est jamais une adresse réseau,
// et la vraie page (index.html, avec sa CSP) charge l'import map mais refuse tout script ajouté dans la page.
export default async function (t, A) {
  const S = A.state;
  const { showLibrary } = await import('/js/app/library-ui.js');
  const { MY_SOUNDS } = await import('/js/library.js');
  const { fromDataUrl } = await import('/js/project.js');

  // Un morceau piégé : nom de son en HTML, son « embarqué » qui pointe vers une adresse réseau.
  window.__xss = 0;
  const trap = '<img src=x onerror="window.__xss=1">';
  const file = {
    format: 'ravebench-file', version: 1, kind: 'song',
    data: { bpm: S.bpm, tl: JSON.parse(JSON.stringify(S.tl)), userSounds: [{ sampleId: 'user:trap', name: trap, cat: 'mine' }] },
    samples: { 'user:trap': { name: trap, audio: 'http://127.0.0.1:9/x.wav' }, 'user:ok': { name: 'ok', audio: 'data:audio/wav;base64,UklGRg==' } },
  };
  const conf = window.confirm;
  window.confirm = () => true;
  await A.loadFile(new File([JSON.stringify(file)], 'trap.ravebench'));
  window.confirm = conf;
  showLibrary('sounds', MY_SOUNDS, 'img src');
  const row = [...document.querySelectorAll('.lib-item')].find(r => r.textContent.includes('onerror'));
  t.ok(row, 'le son au nom piégé est dans la bibliothèque');
  t.eq(row?.querySelector('span')?.textContent, trap, 'son nom est affiché comme du texte');
  t.ok(!document.querySelector('#library img, .lib-item img'), 'aucune balise créée par le nom');
  await t.wait(300);
  t.eq(window.__xss, 0, 'aucun code exécuté');
  t.ok(!(await A.store.loadSample('user:trap')), 'un son « embarqué » en adresse réseau est ignoré');
  t.eq((await A.store.loadSample('user:ok'))?.data?.byteLength, 4, 'un vrai son embarqué (data: base64) est lu');
  t.eq(fromDataUrl('https://example.com/a.wav'), null, 'fromDataUrl refuse une adresse réseau');
  showLibrary('sounds', MY_SOUNDS, '');

  // La vraie page, avec sa politique de sécurité (la page de test, elle, est servie sans).
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-2000px;width:800px;height:600px';
  frame.src = '/index.html';
  document.body.appendChild(frame);
  await t.until(() => frame.contentDocument?.readyState === 'complete', 10000);
  const versioned = () => frame.contentWindow.performance.getEntriesByType('resource').some(e => /\/js\/i18n\.js\?v=\d+/.test(e.name));
  t.ok(await t.until(versioned, 10000), 'import map de index.html acceptée par la CSP (modules chargés avec leur version)');
  const doc = frame.contentDocument;
  const blocked = [];
  doc.addEventListener('securitypolicyviolation', e => blocked.push(e.violatedDirective));
  window.__xss2 = 0;
  const box = doc.createElement('div');
  box.innerHTML = '<img src="x" onerror="parent.__xss2 = 1">';
  doc.body.appendChild(box);
  await t.until(() => blocked.length, 3000);
  await t.wait(200);
  t.eq(window.__xss2, 0, 'CSP : un gestionnaire inline ajouté à la page ne s\'exécute pas');
  t.ok(blocked.some(d => d.startsWith('script-src')), 'CSP : le navigateur signale le blocage', blocked);
  frame.remove();
}
