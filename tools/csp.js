// Politique de sécurité du contenu (CSP) de index.html : seuls les scripts de l'application, l'import map (par son
// empreinte SHA-256) et les bibliothèques de la voix (cdnjs, jsDelivr) peuvent s'exécuter. Un fichier ouvert ne peut
// donc jamais faire exécuter de code, même si un nom piégé arrivait dans la page.
// L'empreinte change à chaque modification de l'import map (nouveau module, numéro de version ?v=N) :
//   node tools/csp.js          met l'empreinte à jour dans index.html
//   node tools/csp.js --check  vérifie seulement (utilisé par tests/check.js)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'index.html');

export function importMapHash(html) {
  const m = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error('index.html : import map introuvable');
  // Le navigateur calcule l'empreinte sur le texte du script tel qu'il le lit (fins de ligne normalisées en \n).
  return 'sha256-' + crypto.createHash('sha256').update(m[1].replace(/\r\n?/g, '\n'), 'utf8').digest('base64');
}

export const policy = hash => [
  `script-src 'self' '${hash}' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net 'wasm-unsafe-eval'`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const META = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/;

export function cspProblem(html) {
  const meta = META.exec(html);
  if (!meta) return 'index.html : balise Content-Security-Policy absente';
  if (meta[0] !== `<meta http-equiv="Content-Security-Policy" content="${policy(importMapHash(html))}">`) return 'index.html : empreinte de l\'import map périmée dans la CSP (lancez node tools/csp.js)';
  return null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const html = fs.readFileSync(FILE, 'utf8');
  if (process.argv.includes('--check')) {
    const p = cspProblem(html);
    console.log(p ?? 'CSP à jour');
    process.exit(p ? 1 : 0);
  }
  const tag = `<meta http-equiv="Content-Security-Policy" content="${policy(importMapHash(html))}">`;
  const out = META.test(html) ? html.replace(META, tag) : html.replace(/(<meta charset="[^"]*">)/, `$1\n  ${tag}`);
  fs.writeFileSync(FILE, out);
  console.log('CSP mise à jour');
}
