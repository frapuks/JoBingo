// Génère les icônes de l'app (SVG + PNG) sans aucune dépendance.
// Lancement, depuis la racine du dépôt :
//   npm run outils -- npm run icons -w apps/web
// La balle est décrite une seule fois (BALL) puis rendue en SVG et en PNG : les deux
// formats restent identiques si on retouche le dessin.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

const OUT = resolve(import.meta.dirname, '../public/icons');

const COLORS = {
  marine: [0x25, 0x3d, 0x6b],
  brique: [0x53, 0x18, 0x0d],
  cuir: [0xf4, 0xf1, 0xea],
};

// Coordonnées en rayons de balle, centre en (0, 0). Les coutures blanches sont
// simplement l'espace laissé entre les panneaux.
const BALL = [
  { cx: 0.95, cy: -0.95, r: 0.78, color: 'brique' },
  { cx: -0.95, cy: 0.95, r: 0.78, color: 'brique' },
  // Bande courbe : anneau d'un grand cercle dont le bord intérieur frôle le centre.
  { cx: -1.6, cy: 1.6, r: 2.263, width: 0.44, color: 'marine' },
];
// Liseré blanc au bord : sans lui, un panneau marine se fondrait dans le fond marine.
const PANEL_LIMIT = 0.9;

const VARIANTS = [
  { file: 'icon-192.png', size: 192, ball: 0.36, corner: 0.2 },
  { file: 'icon-512.png', size: 512, ball: 0.36, corner: 0.2 },
  // Zone sûre d'une icône maskable : cercle de 40 % du côté. La balle reste dedans.
  { file: 'maskable-512.png', size: 512, ball: 0.3, corner: 0 },
  // iOS arrondit lui-même les coins, et remplit la transparence en noir.
  { file: 'apple-touch-icon.png', size: 180, ball: 0.36, corner: 0 },
];

function inRoundedSquare(x, y, corner) {
  if (!corner) return true;
  const dx = Math.max(corner - x, 0, x - (1 - corner));
  const dy = Math.max(corner - y, 0, y - (1 - corner));
  return dx * dx + dy * dy <= corner * corner;
}

// Couleur au point (x, y) de l'icône, coordonnées dans [0, 1].
function paint(x, y, { ball, corner }) {
  if (!inRoundedSquare(x, y, corner)) return null;
  const u = (x - 0.5) / ball;
  const v = (y - 0.5) / ball;
  const d2 = u * u + v * v;
  if (d2 > 1) return COLORS.marine;
  if (d2 > PANEL_LIMIT * PANEL_LIMIT) return COLORS.cuir;
  for (const shape of BALL) {
    const d = Math.hypot(u - shape.cx, v - shape.cy);
    const inside = shape.width ? Math.abs(d - shape.r) <= shape.width / 2 : d <= shape.r;
    if (inside) return COLORS[shape.color];
  }
  return COLORS.cuir;
}

// Anticrénelage par suréchantillonnage 4×4.
function render(variant) {
  const { size } = variant;
  const S = 4;
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const c = paint((px + (sx + 0.5) / S) / size, (py + (sy + 0.5) / S) / size, variant);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a++;
        }
      }
      const i = (py * size + px) * 4;
      if (a) {
        pixels[i] = Math.round(r / a);
        pixels[i + 1] = Math.round(g / a);
        pixels[i + 2] = Math.round(b / a);
        pixels[i + 3] = Math.round((a / (S * S)) * 255);
      }
    }
  }
  return encodePng(size, pixels);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function svg() {
  const R = 36;
  const hex = (name) => '#' + COLORS[name].map((c) => c.toString(16).padStart(2, '0')).join('');
  const n = (v) => +v.toFixed(2);
  const shapes = BALL.map((s) =>
    s.width
      ? `<circle cx="${n(50 + s.cx * R)}" cy="${n(50 + s.cy * R)}" r="${n(s.r * R)}" fill="none" stroke="${hex(s.color)}" stroke-width="${n(s.width * R)}"/>`
      : `<circle cx="${n(50 + s.cx * R)}" cy="${n(50 + s.cy * R)}" r="${n(s.r * R)}" fill="${hex(s.color)}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="balle"><circle cx="50" cy="50" r="${n(R * PANEL_LIMIT)}"/></clipPath></defs><rect width="100" height="100" rx="20" fill="${hex('marine')}"/><circle cx="50" cy="50" r="${R}" fill="${hex('cuir')}"/><g clip-path="url(#balle)">${shapes}</g></svg>\n`;
}

mkdirSync(OUT, { recursive: true });
for (const variant of VARIANTS) {
  writeFileSync(resolve(OUT, variant.file), render(variant));
  console.log(`icons/${variant.file}`);
}
writeFileSync(resolve(OUT, 'favicon.svg'), svg());
console.log('icons/favicon.svg');
