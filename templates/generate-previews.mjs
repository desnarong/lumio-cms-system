/*
 * Draws `preview.png` for every template pack from its own `tokens.json`.
 * Pure Node (zlib + a tiny PNG encoder), no image libraries:
 *
 *   node templates/generate-previews.mjs
 *
 * The colours come from the tokens, so a thumbnail can never disagree with the
 * theme the template actually applies.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const ROOT = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const WIDTH = 1200;
const HEIGHT = 630;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
};

const encodePng = (width, height, pixels) => {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const toRgb = (hex) => {
  const value = hex.replace('#', '');
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
};

const mix = (from, to, t) => from.map((channel, index) => Math.round(channel + (to[index] - channel) * t));

const shade = (rgb, amount) =>
  rgb.map((channel) => Math.max(0, Math.min(255, Math.round(channel * amount))));

const canvas = () => new Uint8ClampedArray(WIDTH * HEIGHT * 4);

const put = (pixels, x, y, rgb, alpha = 1) => {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const index = (y * WIDTH + x) * 4;
  pixels[index] = pixels[index] * (1 - alpha) + rgb[0] * alpha;
  pixels[index + 1] = pixels[index + 1] * (1 - alpha) + rgb[1] * alpha;
  pixels[index + 2] = pixels[index + 2] * (1 - alpha) + rgb[2] * alpha;
  pixels[index + 3] = 255;
};

const verticalGradient = (pixels, from, to) => {
  for (let y = 0; y < HEIGHT; y += 1) {
    const color = mix(from, to, y / (HEIGHT - 1));
    for (let x = 0; x < WIDTH; x += 1) put(pixels, x, y, color);
  }
};

const roundedRect = (pixels, x0, y0, width, height, radius, rgb, alpha = 1) => {
  for (let y = y0; y < y0 + height; y += 1) {
    for (let x = x0; x < x0 + width; x += 1) {
      const dx = x < x0 + radius ? x0 + radius - x : x > x0 + width - radius - 1 ? x - (x0 + width - radius - 1) : 0;
      const dy = y < y0 + radius ? y0 + radius - y : y > y0 + height - radius - 1 ? y - (y0 + height - radius - 1) : 0;
      if (dx * dx + dy * dy > radius * radius) continue;
      put(pixels, x, y, rgb, alpha);
    }
  }
};

const render = ({ primary, accent }) => {
  const pixels = canvas();
  const brand = toRgb(primary);
  const accentRgb = toRgb(accent);

  // Brand gradient background, slightly darker at the bottom edge.
  const top = shade(mix(brand, accentRgb, 0.25), 1.08);
  const bottom = shade(mix(accentRgb, brand, 0.55), 0.82);
  for (let y = 0; y < HEIGHT; y += 1) {
    const base = mix(top, bottom, y / (HEIGHT - 1));
    for (let x = 0; x < WIDTH; x += 1) put(pixels, x, y, shade(base, 0.94 + (x / WIDTH) * 0.12));
  }

  // Page card.
  roundedRect(pixels, 72, 68, WIDTH - 144, HEIGHT - 136, 28, [255, 255, 255]);

  // Logo dot + headline bars + body bars + primary button.
  roundedRect(pixels, 128, 132, 84, 84, 22, brand);
  roundedRect(pixels, 128, 264, 660, 40, 20, [15, 23, 42]);
  roundedRect(pixels, 128, 322, 430, 40, 20, [15, 23, 42]);
  roundedRect(pixels, 128, 404, 720, 18, 9, [203, 213, 225]);
  roundedRect(pixels, 128, 436, 560, 18, 9, [203, 213, 225]);
  roundedRect(pixels, 128, 496, 248, 58, 14, brand);
  roundedRect(pixels, 156, 518, 192, 14, 7, [255, 255, 255], 0.9);

  // Preview of an image block on the right.
  roundedRect(pixels, 856, 132, WIDTH - 144 - 856 + 72, 422, 22, mix(accentRgb, [255, 255, 255], 0.72));

  return pixels;
};

const index = JSON.parse(readFileSync(join(ROOT, 'index.json'), 'utf8'));
for (const name of index.templates) {
  const dir = join(ROOT, name);
  const tokens = JSON.parse(readFileSync(join(dir, 'tokens.json'), 'utf8'));
  const png = encodePng(WIDTH, HEIGHT, render({ primary: tokens.colors.primary, accent: tokens.colors.accent }));
  writeFileSync(join(dir, 'preview.png'), png);
  console.log(`${name}/preview.png (${png.length} bytes) จากสี ${tokens.colors.primary} / ${tokens.colors.accent}`);
}