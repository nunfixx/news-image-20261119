// "The World in One Day" — make.fun news-image-20261119 entry.
// A program that draws one image summing up Thursday 19 November 2026's
// world news as a newspaper front page, and writes it to /output/entry.png.
// Pure TypeScript, standard library only. No network, no files read, no
// randomness: two runs write byte-identical output.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------- canvas

const W = 1024;
const H = 1024;
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

const PAPER: RGB = [246, 241, 227];
const INK: RGB = [25, 25, 25];
const WHITE: RGB = [255, 255, 255];
const NAVY: RGB = [27, 47, 74];
const RED: RGB = [179, 39, 30];
const SKY: RGB = [216, 230, 240];
const SEA: RGB = [46, 107, 158];
const STEEL: RGB = [70, 76, 84];
const SMOKE: RGB = [138, 138, 138];
const ORANGE: RGB = [224, 122, 26];
const YELLOW: RGB = [240, 196, 60];
const TEAL: RGB = [31, 122, 109];
const OCHRE: RGB = [192, 122, 26];
const GREEN: RGB = [46, 125, 50];
const PURPLE: RGB = [91, 75, 138];
const GREY: RGB = [90, 90, 90];

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(W, Math.ceil(x + w));
  const y1 = Math.min(H, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
  }
}

function frame(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
  for (let i = 0; i < t; i++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) setPx(x, y + i, c);
  }
}

function vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
  for (let i = 0; i < t; i++) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) setPx(x + i, y, c);
  }
}

// Bresenham line, thickness t (square brush).
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    fillRect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    for (let x = -half; x <= half; x++) setPx(cx + x, cy + y, c);
  }
}

function circleOutline(cx: number, cy: number, r: number, c: RGB, t = 2): void {
  const n = 48;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
  }
  for (let i = 0; i < pts.length - 1; i++) line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], c, t);
}

// Even-odd scanline polygon fill.
function poly(pts: [number, number][], c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) setPx(x, y, c);
    }
  }
}

function polyOutline(pts: [number, number][], c: RGB, t = 2): void {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    line(a[0], a[1], b[0], b[1], c, t);
  }
}

// ---------------------------------------------------------------- font
// A hand-written 5x7 bitmap font (uppercase only; all labels are set in
// capitals, as a newspaper front page would). Each glyph is 7 rows of
// 5 bits, written as strings so the shapes are visible in the source.

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '"': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '*': ['00000', '10101', '01110', '10101', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '@': ['01110', '10001', '10111', '10101', '10110', '10000', '01110'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  _: ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
};

const GLYPH_W = 5;
const GLYPH_H = 7;
const ADVANCE = 6; // glyph + 1px gap, in font units

function textWidth(s: string, scale: number, spacing = 0): number {
  return s.length * (ADVANCE + spacing) * scale - spacing * scale;
}

interface TextOpts {
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  spacing?: number; // extra font units between characters
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB, opts: TextOpts = {}): void {
  const { align = 'left', bold = false, spacing = 0 } = opts;
  const w = textWidth(s, scale, spacing);
  let cx = x;
  if (align === 'center') cx = x - Math.floor(w / 2);
  if (align === 'right') cx = x - w;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?'];
    for (let row = 0; row < GLYPH_H; row++) {
      for (let col = 0; col < GLYPH_W; col++) {
        if (g[row][col] === '1') {
          fillRect(cx + col * scale, y + row * scale, scale, scale, c);
          if (bold) fillRect(cx + col * scale + 1, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += (ADVANCE + spacing) * scale;
  }
}

// Greedy word wrap; returns lines that fit maxW pixels at the given scale.
function wrapText(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const trial = cur === '' ? word : cur + ' ' + word;
    if (textWidth(trial, scale) <= maxW || cur === '') {
      cur = trial;
    } else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- PNG
// Minimal whole-PNG writer: IHDR + one IDAT (zlib deflate, level 9) + IEND.
// Deterministic: zlib output depends only on the input bytes and level.

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- icons
// Small clean vector pictograms, each drawn inside a ~64px box centred
// on (cx, cy). They label the story at a glance; the words carry the facts.

function iconScales(cx: number, cy: number): void {
  // scales of justice: post, beam, two pans, base
  vline(cx, cy - 26, cy + 26, INK, 3);
  hline(cx - 30, cx + 30, cy - 24, INK, 3);
  fillCircle(cx, cy - 26, 4, RED);
  line(cx - 30, cy - 24, cx - 38, cy + 2, INK, 2);
  line(cx - 30, cy - 24, cx - 22, cy + 2, INK, 2);
  line(cx + 30, cy - 24, cx + 22, cy + 2, INK, 2);
  line(cx + 30, cy - 24, cx + 38, cy + 2, INK, 2);
  poly([[cx - 38, cy + 2], [cx - 22, cy + 2], [cx - 30, cy + 12]], NAVY);
  poly([[cx + 22, cy + 2], [cx + 38, cy + 2], [cx + 30, cy + 12]], NAVY);
  hline(cx - 18, cx + 18, cy + 28, INK, 3);
}

function iconController(cx: number, cy: number): void {
  // game controller: body, d-pad, buttons, sticks
  fillRect(cx - 34, cy - 14, 68, 30, NAVY);
  frame(cx - 34, cy - 14, 68, 30, INK, 2);
  fillRect(cx - 26, cy - 8, 6, 16, WHITE);
  fillRect(cx - 31, cy - 3, 16, 6, WHITE);
  fillCircle(cx + 20, cy - 6, 4, RED);
  fillCircle(cx + 28, cy + 2, 4, YELLOW);
  fillCircle(cx + 12, cy + 2, 4, GREEN);
  fillCircle(cx + 20, cy + 8, 4, WHITE);
  fillCircle(cx - 8, cy + 6, 4, WHITE);
  fillCircle(cx + 4, cy + 6, 4, WHITE);
}

function iconFlame(cx: number, cy: number): void {
  // flame: outer tongue, inner core, ground line
  poly(
    [[cx, cy - 34], [cx + 16, cy - 12], [cx + 22, cy + 6], [cx + 12, cy + 24],
     [cx - 12, cy + 24], [cx - 22, cy + 6], [cx - 14, cy - 10]],
    ORANGE,
  );
  poly(
    [[cx, cy - 10], [cx + 9, cy + 4], [cx + 5, cy + 18], [cx - 5, cy + 18], [cx - 9, cy + 4]],
    YELLOW,
  );
  hline(cx - 26, cx + 26, cy + 28, INK, 2);
}

function iconBridge(cx: number, cy: number): void {
  // bridge under attack: deck, arch, towers, cables, water below
  line(cx - 36, cy + 10, cx, cy - 24, STEEL, 3);
  line(cx, cy - 24, cx + 36, cy + 10, STEEL, 3);
  vline(cx - 24, cy - 28, cy + 10, NAVY, 4);
  vline(cx + 24, cy - 28, cy + 10, NAVY, 4);
  vline(cx - 12, cy - 14, cy + 10, STEEL, 2);
  vline(cx + 12, cy - 14, cy + 10, STEEL, 2);
  hline(cx - 38, cx + 38, cy + 10, INK, 4);
  hline(cx - 36, cx + 36, cy + 22, SEA, 3);
  hline(cx - 28, cx + 28, cy + 28, SEA, 2);
}

function iconCyclone(cx: number, cy: number): void {
  // cyclone: concentric spiral rings with wind streaks
  circleOutline(cx, cy, 28, TEAL, 3);
  circleOutline(cx, cy, 18, TEAL, 3);
  circleOutline(cx, cy, 8, TEAL, 3);
  fillCircle(cx, cy, 4, NAVY);
  hline(cx - 40, cx - 31, cy - 18, STEEL, 2);
  hline(cx + 31, cx + 40, cy + 8, STEEL, 2);
  hline(cx - 40, cx - 31, cy + 14, STEEL, 2);
  hline(cx + 31, cx + 40, cy - 20, STEEL, 2);
}

function iconLeaf(cx: number, cy: number): void {
  // leaf: blade, vein, stem, ground line
  poly(
    [[cx, cy - 30], [cx + 22, cy - 8], [cx + 10, cy + 24], [cx - 14, cy + 20], [cx - 22, cy - 6]],
    GREEN,
  );
  line(cx, cy - 26, cx - 6, cy + 20, INK, 2);
  line(cx - 8, cy + 20, cx - 16, cy + 30, INK, 3);
  hline(cx - 30, cx + 30, cy + 30, INK, 2);
}

// ---------------------------------------------------------------- layout

function star(cx: number, cy: number, rOuter: number, rInner: number, points: number, c: RGB): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    pts.push([Math.round(cx + r * Math.cos(a)), Math.round(cy + r * Math.sin(a))]);
  }
  poly(pts, c);
}

function drawMasthead(): void {
  fillRect(0, 0, W, 104, NAVY);
  fillRect(0, 104, W, 6, RED);
  drawText('THE WORLD IN ONE DAY', W / 2, 16, 3, WHITE, { align: 'center', spacing: 1 });
  drawText('THURSDAY, 19 NOVEMBER 2026', W / 2, 48, 5, WHITE, { align: 'center', bold: true });
}

function drawLead(): void {
  const x0 = 24;
  const y0 = 124;
  const w = 976;
  const h = 328;
  fillRect(x0, y0, w, h, WHITE);
  frame(x0, y0, w, h, INK, 2);

  // --- Shenzhen skyline illustration, three flags in front
  const ix = 40;
  const iy = 140;
  const iw = 552;
  const ih = 296;
  fillRect(ix, iy, iw, ih, SKY);
  fillCircle(ix + 492, iy + 46, 24, YELLOW);
  // towers, bases on the ground line iy+262
  fillRect(ix + 8, iy + 142, 54, 120, STEEL);
  fillRect(ix + 70, iy + 92, 40, 170, NAVY);
  poly([[ix + 130, iy + 262], [ix + 150, iy + 40], [ix + 170, iy + 40], [ix + 190, iy + 262]], STEEL);
  fillRect(ix + 200, iy + 162, 60, 100, NAVY);
  fillRect(ix + 270, iy + 112, 44, 150, STEEL);
  fillRect(ix + 322, iy + 172, 56, 90, NAVY);
  fillRect(ix + 386, iy + 132, 48, 130, STEEL);
  fillRect(ix + 442, iy + 152, 58, 110, NAVY);
  fillRect(ix + 508, iy + 182, 36, 80, STEEL);
  // windows
  const wins: [number, number][] = [
    [ix + 18, iy + 156], [ix + 38, iy + 156], [ix + 18, iy + 180], [ix + 38, iy + 180],
    [ix + 80, iy + 110], [ix + 94, iy + 110], [ix + 80, iy + 140], [ix + 94, iy + 170],
    [ix + 152, iy + 80], [ix + 152, iy + 120], [ix + 152, iy + 160],
    [ix + 214, iy + 178], [ix + 238, iy + 178], [ix + 214, iy + 204], [ix + 238, iy + 204],
    [ix + 282, iy + 130], [ix + 298, iy + 130], [ix + 282, iy + 160], [ix + 298, iy + 190],
    [ix + 336, iy + 188], [ix + 358, iy + 188], [ix + 336, iy + 212],
    [ix + 400, iy + 150], [ix + 418, iy + 150], [ix + 400, iy + 180], [ix + 418, iy + 206],
    [ix + 458, iy + 170], [ix + 480, iy + 170], [ix + 458, iy + 196], [ix + 480, iy + 220],
    [ix + 518, iy + 196], [ix + 518, iy + 220],
  ];
  for (const [wx, wy] of wins) fillRect(wx, wy, 5, 7, SKY);
  // ground
  fillRect(ix, iy + 262, iw, 34, NAVY);
  // three flags: China, Russia, USA — poles from flag top to the ground
  const fy = iy + 196;
  const fx1 = ix + 56;
  const fx2 = ix + 236;
  const fx3 = ix + 416;
  vline(fx1, fy, iy + 262, INK, 3);
  vline(fx2, fy, iy + 262, INK, 3);
  vline(fx3, fy, iy + 262, INK, 3);
  // China: red field, one big yellow star
  fillRect(fx1, fy, 64, 40, RED);
  star(fx1 + 14, fy + 13, 9, 4, 5, YELLOW);
  fillCircle(fx1 + 34, fy + 8, 2, YELLOW);
  fillCircle(fx1 + 42, fy + 14, 2, YELLOW);
  fillCircle(fx1 + 34, fy + 22, 2, YELLOW);
  // Russia: white / blue / red horizontal stripes
  fillRect(fx2, fy, 64, 13, WHITE);
  fillRect(fx2, fy + 13, 64, 14, SEA);
  fillRect(fx2, fy + 27, 64, 13, RED);
  // USA: stripes with a blue canton
  for (let s = 0; s < 7; s++) {
    fillRect(fx3, fy + s * 6, 64, 6, s % 2 === 0 ? RED : WHITE);
  }
  fillRect(fx3, fy, 26, 22, NAVY);
  fillCircle(fx3 + 7, fy + 6, 2, WHITE);
  fillCircle(fx3 + 18, fy + 6, 2, WHITE);
  fillCircle(fx3 + 7, fy + 15, 2, WHITE);
  fillCircle(fx3 + 18, fy + 15, 2, WHITE);

  // --- lead text
  const tx = 616;
  drawText('LEAD STORY', tx, 150, 2, RED, { bold: true });
  drawText('TRUMP, XI, PUTIN', 600, 178, 4, INK, { bold: true });
  drawText('MEET IN SHENZHEN', 600, 212, 4, INK, { bold: true });
  const sub = wrapText(
    'First-ever trilateral summit ends with a Peace Declaration on nuclear risk, fuel and UN reform.',
    2,
    368,
  );
  sub.forEach((ln, i) => drawText(ln, tx, 262 + i * 18, 2, INK));
  hline(tx, tx + 120, 344, RED, 3);
  const sub2 = wrapText(
    'No mention of Ukraine or Iran; no arms-control timetable set.',
    2,
    368,
  );
  sub2.forEach((ln, i) => drawText(ln, tx, 356 + i * 18, 2, GREY));
}

interface Panel {
  x: number;
  y: number;
  accent: RGB;
  cat: string;
  icon: (cx: number, cy: number) => void;
  head: string[];
  sub: string;
}

const PANELS: Panel[] = [
  {
    x: 24, y: 468, accent: RED, cat: 'WORLD COURT', icon: iconScales,
    head: ['MYANMAR GUILTY', 'OF GENOCIDE'],
    sub: 'World Court finds genocide; reparations ordered.',
  },
  {
    x: 353, y: 468, accent: PURPLE, cat: 'GAMES', icon: iconController,
    head: ['GTA VI SCORES', '99 ON METACRITIC'],
    sub: 'Rockstar epic goes live worldwide, 13 years after GTA V.',
  },
  {
    x: 682, y: 468, accent: ORANGE, cat: 'BANGLADESH', icon: iconFlame,
    head: ['BANGLADESH BURNS', 'AS LOCKDOWN BITES'],
    sub: 'Yunus home torched; at least 4 reported killed in a week of violence.',
  },
  {
    x: 24, y: 740, accent: NAVY, cat: 'UKRAINE', icon: iconBridge,
    head: ['BRIDGE HIT FOR', 'A THIRD TIME'],
    sub: 'Ukraine drones strike the Crimea link again; rail halted, road shut.',
  },
  {
    x: 353, y: 740, accent: TEAL, cat: 'INDIA', icon: iconCyclone,
    head: ['80,000 FLEE', 'CYCLONE AKVAN'],
    sub: 'Odisha evacuates coast; landfall due Friday noon.',
  },
  {
    x: 682, y: 740, accent: GREEN, cat: 'CLIMATE', icon: iconLeaf,
    head: ['COP31 DRAFT DROPS', 'FOSSIL FUELS'],
    sub: 'Text cut to 80 paragraphs; fossil fuels gone.',
  },
];

function drawPanel(p: Panel): void {
  const w = 317;
  const h = 260;
  fillRect(p.x, p.y, w, h, WHITE);
  frame(p.x, p.y, w, h, INK, 2);
  fillRect(p.x, p.y, w, 8, p.accent);
  drawText(p.cat, p.x + 16, p.y + 20, 2, p.accent, { bold: true });
  p.icon(p.x + 158, p.y + 105);
  p.head.forEach((ln, i) => drawText(ln, p.x + 158, p.y + 148 + i * 26, 3, INK, { align: 'center', bold: true }));
  const lines = wrapText(p.sub, 2, 285);
  lines.forEach((ln, i) => drawText(ln, p.x + 158, p.y + 204 + i * 17, 2, INK, { align: 'center' }));
}

function main(): void {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawLead();
  for (const p of PANELS) drawPanel(p);
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePNG());
}

main();
