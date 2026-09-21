// Génère les icônes de l'app à partir de icons-source/logo.png. Depuis la racine :
//   npm run icons
// sharp est installé à la volée dans le conteneur outils, jamais dans le projet :
// il n'a pas de binaire pour le Pi 32 bits et y ferait échouer le build.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const sharp = createRequire('/tmp/sharp/')('sharp');

const SOURCE = resolve(import.meta.dirname, '../icons-source/logo.png');
const OUT = resolve(import.meta.dirname, '../public/icons');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

// L'ours seul : le nom du club, sous lui, serait illisible à la taille d'une icône.
// Bornes verticales mesurées sur logo.png (2550×3300) ; à revoir si l'image change.
const BEAR_BAND = { top: 300, bottom: 2260 };

// Part de la largeur occupée par l'ours. Une icône maskable est découpée par Android
// (cercle, carré arrondi…) : seul un cercle de 80 % du côté est garanti visible.
const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 0.84 },
  { file: 'icon-512.png', size: 512, scale: 0.84 },
  { file: 'maskable-512.png', size: 512, scale: 0.6 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.8 },
  { file: 'favicon-64.png', size: 64, scale: 0.92 },
];

async function bear() {
  const { width } = await sharp(SOURCE).metadata();
  const band = await sharp(SOURCE)
    .extract({ left: 0, top: BEAR_BAND.top, width, height: BEAR_BAND.bottom - BEAR_BAND.top })
    .png()
    .toBuffer();
  return sharp(band).trim().png().toBuffer();
}

// Fond blanc plein : la tête et le ballon sont des trous transparents dans le logo,
// et iOS remplirait la transparence en noir.
async function icon(bearPng, { file, size, scale }) {
  const inner = await sharp(bearPng)
    .resize({ width: Math.round(size * scale), height: Math.round(size * scale), fit: 'inside' })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: WHITE } })
    .composite([{ input: inner, gravity: 'center' }])
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT, file));
}

const bearPng = await bear();
for (const spec of ICONS) {
  await icon(bearPng, spec);
  console.log(`icons/${spec.file}`);
}
