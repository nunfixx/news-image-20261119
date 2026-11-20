// news-image-20261119 — "THE WORLD IN ONE DAY"
// Draws the front page of Thursday 19 November 2026 as a 1024x1024 PNG.
//
// Node 22, standard library only. No network, no file reads at runtime.
// Everything here is written by hand for this entry: a 5x7 bitmap font,
// a small raster canvas, and a minimal PNG encoder (zlib via node:zlib).
// Two runs write byte-identical output.
//
// Run:  node main.ts                          -> writes /output/entry.png
//       MAKEFUN_OUTPUT_DIR=out node main.ts   -> writes out/entry.png

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 cells; "#" is ink, "." is blank.
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  ";": [".....", ".##..", ".##..", ".....", ".##..", ".##..", ".#..."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "'": ["..#..", "..#..", ".#...", ".....", ".....", ".....", "....."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", "#.##.", "#..##"],
};

function glyphOf(ch: string): string[] {
  return FONT[ch] ?? FONT[" "];
}

// ---------------------------------------------------------------------------
// Canvas: a plain RGB byte buffer, 1024x1024.
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;

type RGB = [number, number, number];

const PAPER: RGB = [246, 239, 221];
const INK: RGB = [22, 22, 22];
const NAVY: RGB = [27, 42, 74];
const RED: RGB = [196, 30, 30];
const WHITE: RGB = [255, 255, 255];
const SKY: RGB = [214, 232, 240];
const SUN: RGB = [245, 190, 40];
const GREY: RGB = [84, 88, 100];
const LIGHT: RGB = [226, 232, 240];
const PURPLE: RGB = [96, 62, 150];
const ORANGE: RGB = [222, 112, 18];
const TEAL: RGB = [0, 128, 118];
const GREEN: RGB = [38, 138, 58];
const BLUE: RGB = [52, 110, 190];

const px = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) setPx(xx, yy, c);
  }
}

function outline(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) setPx(cx + dx, cy + dy, c);
    }
  }
}

function ring(cx: number, cy: number, r: number, c: RGB, t: number): void {
  for (let a = 0; a < 360; a++) {
    const rad = (a * Math.PI) / 180;
    for (let d = -t; d <= t; d++) {
      setPx(Math.round(cx + (r + d) * Math.cos(rad)), Math.round(cy + (r + d) * Math.sin(rad)), c);
    }
  }
}

function line(x0: number, y0: number, x1: number, y1: number, c: RGB, w = 1): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const hw = Math.floor(w / 2);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps);
    const y = Math.round(y0 + ((y1 - y0) * i) / steps);
    rect(x - hw, y - hw, w, w, c);
  }
}

function poly(points: Array<[number, number]>, c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x0, y0] = points[i];
      const [x1, y1] = points[(i + 1) % points.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) setPx(x, y, c);
    }
  }
}

// ---------------------------------------------------------------------------
// Text: draw glyphs at integer scale; 6*scale advance per character.
// ---------------------------------------------------------------------------

function charAdvance(scale: number): number {
  return 6 * scale;
}

function textWidth(s: string, scale: number): number {
  if (s.length === 0) return 0;
  return s.length * charAdvance(scale) - scale;
}

function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = glyphOf(ch);
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "#") rect(x + col * scale, y + r * scale, scale, scale, c);
    }
  }
}

function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    drawChar(ch, cx, y, scale, c);
    cx += charAdvance(scale);
  }
}

function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}

function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur === "" ? word : cur + " " + word;
    if (textWidth(next, scale) <= maxW) {
      cur = next;
    } else {
      if (cur !== "") lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------------------
// PNG encoder: signature, IHDR, one IDAT (zlib, filter 0), IEND.
// ---------------------------------------------------------------------------

function makeCrcTable(): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}

const CRC_TABLE = makeCrcTable();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Pictograms. Each is drawn around a centre (cx, cy) inside a ~90px box.
// ---------------------------------------------------------------------------

function drawScales(cx: number, cy: number): void {
  // upright post, crossbar, two hanging pans, base, red finial
  line(cx, cy - 30, cx, cy + 28, NAVY, 4);
  line(cx - 34, cy - 30, cx + 34, cy - 30, NAVY, 4);
  disc(cx, cy - 38, 4, RED);
  for (const side of [-1, 1]) {
    const bx = cx + side * 34;
    const px0 = cx + side * 22;
    line(bx, cy - 30, px0 - 10, cy - 2, NAVY, 2);
    line(bx, cy - 30, px0 + 10, cy - 2, NAVY, 2);
    poly(
      [
        [px0 - 12, cy - 2],
        [px0 + 12, cy - 2],
        [px0, cy + 12],
      ],
      NAVY,
    );
  }
  line(cx - 20, cy + 30, cx + 20, cy + 30, NAVY, 4);
}

function drawPad(cx: number, cy: number): void {
  // game controller: dark body, white d-pad, four coloured buttons
  rect(cx - 42, cy - 18, 84, 38, NAVY);
  disc(cx - 42, cy + 2, 12, NAVY);
  disc(cx + 42, cy + 2, 12, NAVY);
  rect(cx - 42, cy - 18, 84, 6, NAVY);
  // d-pad (white cross, left side)
  rect(cx - 32, cy - 10, 6, 20, WHITE);
  rect(cx - 38, cy - 4, 18, 6, WHITE);
  // buttons (diamond of four dots, right side)
  disc(cx + 26, cy - 10, 4, RED);
  disc(cx + 34, cy - 2, 4, SUN);
  disc(cx + 26, cy + 6, 4, GREEN);
  disc(cx + 18, cy - 2, 4, BLUE);
  // two small sticks
  disc(cx - 6, cy + 4, 4, LIGHT);
  disc(cx + 6, cy + 4, 4, LIGHT);
}

function drawFlame(cx: number, cy: number): void {
  // outer flame, inner flame, ground line
  poly(
    [
      [cx, cy - 42],
      [cx + 12, cy - 18],
      [cx + 24, cy - 2],
      [cx + 18, cy + 26],
      [cx - 18, cy + 26],
      [cx - 24, cy - 2],
      [cx - 12, cy - 18],
    ],
    ORANGE,
  );
  poly(
    [
      [cx, cy - 16],
      [cx + 8, cy - 2],
      [cx + 12, cy + 10],
      [cx + 8, cy + 24],
      [cx - 8, cy + 24],
      [cx - 12, cy + 10],
      [cx - 8, cy - 2],
    ],
    SUN,
  );
  line(cx - 26, cy + 34, cx + 26, cy + 34, NAVY, 3);
}

function drawBridge(cx: number, cy: number): void {
  // two towers, arched span, deck, water below
  rect(cx - 34, cy - 32, 6, 52, NAVY);
  rect(cx + 28, cy - 32, 6, 52, NAVY);
  line(cx - 44, cy + 20, cx + 44, cy + 20, NAVY, 4);
  line(cx - 31, cy + 20, cx - 31, cy - 6, NAVY, 2);
  line(cx + 31, cy + 20, cx + 31, cy - 6, NAVY, 2);
  line(cx - 31, cy - 6, cx, cy - 22, NAVY, 2);
  line(cx, cy - 22, cx + 31, cy - 6, NAVY, 2);
  line(cx - 14, cy + 20, cx - 14, cy - 12, NAVY, 2);
  line(cx + 14, cy + 20, cx + 14, cy - 12, NAVY, 2);
  line(cx - 44, cy + 30, cx - 20, cy + 30, BLUE, 3);
  line(cx - 12, cy + 36, cx + 16, cy + 36, BLUE, 3);
  line(cx + 24, cy + 30, cx + 44, cy + 30, BLUE, 3);
}

function drawStorm(cx: number, cy: number): void {
  // cyclone: three concentric rings plus wind dashes
  ring(cx, cy, 10, TEAL, 2);
  ring(cx, cy, 20, TEAL, 2);
  ring(cx, cy, 30, TEAL, 2);
  disc(cx, cy, 4, TEAL);
  line(cx - 46, cy - 18, cx - 34, cy - 18, TEAL, 3);
  line(cx + 34, cy + 18, cx + 46, cy + 18, TEAL, 3);
  line(cx - 46, cy + 22, cx - 34, cy + 22, TEAL, 3);
  line(cx + 34, cy - 22, cx + 46, cy - 22, TEAL, 3);
}

function drawLeaf(cx: number, cy: number): void {
  // leaf: pointed diamond, centre vein, stem
  poly(
    [
      [cx, cy - 40],
      [cx + 26, cy - 4],
      [cx, cy + 28],
      [cx - 26, cy - 4],
    ],
    GREEN,
  );
  line(cx, cy - 36, cx, cy + 26, [20, 90, 40], 2);
  line(cx, cy + 28, cx - 10, cy + 42, NAVY, 3);
  line(cx - 26, cy + 42, cx + 26, cy + 42, NAVY, 3);
}

// ---------------------------------------------------------------------------
// Lead illustration: Shenzhen skyline with three flags.
// Box: x0, y0, w, h. Sky, sun, buildings with lit windows, ground strip.
// ---------------------------------------------------------------------------

function drawSkyline(x0: number, y0: number, w: number, h: number): void {
  rect(x0, y0, w, h, SKY);
  disc(x0 + w - 64, y0 + 34, 22, SUN);
  const base = y0 + h - 24;
  // [x offset, width, height, colour]
  const towers: Array<[number, number, number, RGB]> = [
    [0, 62, 118, GREY],
    [70, 52, 168, NAVY],
    [130, 44, 208, GREY],
    [182, 70, 108, NAVY],
    [260, 48, 148, GREY],
    [316, 60, 128, NAVY],
    [384, 54, 98, GREY],
    [446, 62, 138, NAVY],
  ];
  for (const [dx, bw, bh, col] of towers) {
    const bx = x0 + dx;
    rect(bx, base - bh, bw, bh, col);
    // lit windows: small squares on a fixed grid, every other one lit
    const cols = Math.floor(bw / 16);
    const rows = Math.floor(bh / 22);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) {
          rect(bx + 6 + c * 16, base - bh + 8 + r * 22, 5, 7, LIGHT);
        }
      }
    }
  }
  // ground strip
  rect(x0, base, w, 24, NAVY);
  // flags planted in front of the skyline
  drawFlagChina(x0 + 34, base - 78);
  drawFlagRussia(x0 + 212, base - 78);
  drawFlagUsa(x0 + 372, base - 78);
}

function drawFlagChina(x: number, y: number): void {
  line(x, y, x, y + 58, INK, 2);
  rect(x + 2, y, 46, 28, RED);
  // one big star (plus of squares) and four small stars
  rect(x + 10, y + 8, 10, 3, SUN);
  rect(x + 13, y + 5, 3, 10, SUN);
  rect(x + 26, y + 4, 3, 3, SUN);
  rect(x + 32, y + 8, 3, 3, SUN);
  rect(x + 32, y + 14, 3, 3, SUN);
  rect(x + 26, y + 18, 3, 3, SUN);
}

function drawFlagRussia(x: number, y: number): void {
  line(x, y, x, y + 58, INK, 2);
  rect(x + 2, y, 46, 28, WHITE);
  rect(x + 2, y + 9, 46, 10, BLUE);
  rect(x + 2, y + 19, 46, 9, RED);
}

function drawFlagUsa(x: number, y: number): void {
  line(x, y, x, y + 58, INK, 2);
  rect(x + 2, y, 46, 28, WHITE);
  for (let s = 0; s < 4; s++) rect(x + 2, y + s * 7, 46, 4, RED);
  rect(x + 2, y, 20, 15, NAVY);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      rect(x + 4 + c * 5, y + 3 + r * 5, 2, 2, WHITE);
    }
  }
}

// ---------------------------------------------------------------------------
// Page layout.
// ---------------------------------------------------------------------------

interface Panel {
  kicker: string;
  colour: RGB;
  pic: (cx: number, cy: number) => void;
  head: string[];
  sub: string;
}

const PANELS: Panel[] = [
  {
    kicker: "WORLD COURT",
    colour: RED,
    pic: drawScales,
    head: ["MYANMAR GUILTY", "OF GENOCIDE"],
    sub: "WORLD COURT FINDS GENOCIDE; REPARATIONS ORDERED.",
  },
  {
    kicker: "GAMES",
    colour: PURPLE,
    pic: drawPad,
    head: ["GTA VI SCORES 99", "ON METACRITIC"],
    sub: "ROCKSTAR EPIC GOES LIVE WORLDWIDE; 13 YEARS AFTER GTA V.",
  },
  {
    kicker: "BANGLADESH",
    colour: ORANGE,
    pic: drawFlame,
    head: ["BANGLADESH BURNS", "LOCKDOWN BITES"],
    sub: "YUNUS HOME TORCHED; AT LEAST 4 REPORTED KILLED IN A WEEK OF VIOLENCE.",
  },
  {
    kicker: "UKRAINE",
    colour: NAVY,
    pic: drawBridge,
    head: ["BRIDGE HIT FOR", "A THIRD TIME"],
    sub: "UKRAINE DRONES STRIKE THE CRIMEA LINK AGAIN; RAIL HALTED, ROAD SHUT.",
  },
  {
    kicker: "INDIA",
    colour: TEAL,
    pic: drawStorm,
    head: ["80,000 FLEE", "CYCLONE AKVAN"],
    sub: "ODISHA EVACUATES COAST; LANDFALL DUE FRIDAY NOON.",
  },
  {
    kicker: "CLIMATE",
    colour: GREEN,
    pic: drawLeaf,
    head: ["COP31 DRAFT", "DROPS FOSSIL", "FUELS"],
    sub: "TEXT CUT TO 80 PARAGRAPHS; FOSSIL FUELS GONE.",
  },
];

function drawMasthead(): void {
  rect(0, 0, W, 96, NAVY);
  drawTextCentered("THE WORLD IN ONE DAY", W / 2, 10, 3, WHITE);
  drawTextCentered("THURSDAY, 19 NOVEMBER 2026", W / 2, 42, 4, WHITE);
  rect(0, 96, W, 6, RED);
}

function drawLead(): void {
  const x = 20;
  const y = 116;
  const w = 984;
  const h = 272;
  rect(x, y, w, h, WHITE);
  outline(x, y, w, h, NAVY, 2);
  drawSkyline(x + 16, y + 16, 524, 240);
  const tx = 584;
  drawText("LEAD STORY", tx, y + 18, 2, RED);
  drawText("TRUMP, XI, PUTIN", tx, y + 44, 4, INK);
  drawText("MEET IN SHENZHEN", tx, y + 76, 4, INK);
  const body = wrap(
    "FIRST-EVER TRILATERAL SUMMIT ENDS WITH A PEACE DECLARATION ON NUCLEAR RISK, FUEL AND UN REFORM.",
    404,
    2,
  );
  let by = y + 122;
  for (const ln of body) {
    drawText(ln, tx, by, 2, INK);
    by += 17;
  }
  rect(tx, by + 6, 64, 4, RED);
  drawText("NO MENTION OF UKRAINE OR IRAN;", tx, by + 20, 2, INK);
  drawText("NO ARMS-CONTROL TIMETABLE SET.", tx, by + 37, 2, INK);
}

function drawPanel(p: Panel, x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, WHITE);
  outline(x, y, w, h, NAVY, 2);
  rect(x + 2, y + 2, w - 4, 6, p.colour);
  drawText(p.kicker, x + 14, y + 20, 2, p.colour);
  p.pic(x + Math.floor(w / 2), y + 88);
  let hy = y + 140;
  for (const ln of p.head) {
    drawTextCentered(ln, x + Math.floor(w / 2), hy, 3, INK);
    hy += 24;
  }
  const subLines = wrap(p.sub, w - 28, 2);
  let sy = y + 222;
  for (const ln of subLines) {
    drawTextCentered(ln, x + Math.floor(w / 2), sy, 2, INK);
    sy += 17;
  }
}

function drawPage(): void {
  fill(PAPER);
  drawMasthead();
  drawLead();
  const cols = [20, 353, 686];
  const rows = [404, 708];
  const pw = 317;
  const ph = 288;
  for (let i = 0; i < PANELS.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    drawPanel(PANELS[i], cols[col], rows[row], pw, ph);
  }
}

// ---------------------------------------------------------------------------
// Entry point.
// ---------------------------------------------------------------------------

function main(): void {
  drawPage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.png");
  writeFileSync(outPath, encodePNG());
  console.log("wrote " + outPath);
}

main();
