// Lecture des anciens fichiers de banque et de session (.apckit, JSON, chaque son embarqué en data-URL). Les banques
// s'exportent maintenant dans un fichier .ravebench (js/app/files.js) ; ces fichiers-là s'ouvrent toujours.
import { t } from './i18n.js';
import { fromDataUrl } from './project.js';

export const FORMAT = 'apc-studio-kit';

// Renvoie { kind, bpm, globals, preset, banks: [[{ name, color, bpm, p, bytes } | null] x40] }.
export async function unpack(file) {
  const data = JSON.parse(await file.text());
  if (data.format !== FORMAT) throw new Error(t('kit.badFile'));
  const banks = [];
  for (const bank of data.banks) {
    banks.push(await Promise.all(bank.pads.map(async s => s && { ...s, audio: undefined, bytes: fromDataUrl(s.audio) })));
  }
  return { ...data, banks };
}
