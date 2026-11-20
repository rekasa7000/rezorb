/**
 * One-off generator for the Rezorb logo files (public/brand/*.svg) and the shared path data
 * (src/components/brand/logo-paths.ts). Text is OUTLINED so the SVGs render identically
 * without any fonts installed.
 *
 * Needs `fontkit` (not a project dependency) and two font files:
 *   UNBOUNDED  = Unbounded variable (any subset with the letters R E Z B)
 *   SERIF      = Instrument Serif Italic (letters r e)
 * Run:  UNBOUNDED=… SERIF=… node scripts/brand/build-logo.mjs   (from a folder where `npm i fontkit` was run)
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(process.env.FONTKIT_FROM ?? import.meta.url);
const fontkit = require("fontkit");

const OUT = process.env.OUT ?? "public/brand";
const unbounded = fontkit.openSync(process.env.UNBOUNDED).getVariation({ wght: 900 });
const serif = fontkit.openSync(process.env.SERIF);

const C = { ink: "#14101F", star: "#F5F1FF", nebula: "#FF3DB8", plasma: "#8B5CFF" };

/** Outline a string; returns glyph path data in a y-down coordinate space starting at x=0, baseline y=0. */
function outline(font, text, size, tracking = 0) {
  const k = size / font.unitsPerEm;
  const run = font.layout(text);
  let x = 0;
  const parts = [];
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i];
    const d = g.path.toSVG();
    if (d) parts.push(`<path transform="translate(${(x + p.xOffset * k).toFixed(2)} 0) scale(${k.toFixed(5)} ${(-k).toFixed(5)})" d="${d}"/>`);
    x += p.xAdvance * k + tracking;
  });
  return { svg: parts.join(""), width: x - tracking };
}

/** The orb (64×64 design box, centre 32,32, orb r=17, ring rx=29). */
function orb(id, x, y, bodyD, ring, mono) {
  const k = bodyD / 34;
  const fillOrb = mono ? "currentColor" : `url(#${id}-g)`;
  const ringC = mono ? "currentColor" : ring;
  const E = `<ellipse cx="32" cy="34" rx="29" ry="9" transform="rotate(-18 32 34)" stroke="${ringC}" stroke-width="4" fill="none"`;
  return `<g transform="translate(${(x - 32 * k).toFixed(2)} ${(y - 32 * k).toFixed(2)}) scale(${k.toFixed(4)})">
    <g clip-path="url(#${id}-t)">${E} opacity="0.55"/></g>
    <circle cx="32" cy="32" r="17" fill="${fillOrb}"/>
    <g clip-path="url(#${id}-b)">${E}/></g>
  </g>`;
}
const defs = (id, mono) => `<defs>
  ${mono ? "" : `<radialGradient id="${id}-g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ff9be0"/><stop offset=".5" stop-color="${C.nebula}"/><stop offset="1" stop-color="#5a1fb8"/></radialGradient>`}
  <clipPath id="${id}-t" clipPathUnits="userSpaceOnUse"><rect x="-200" y="-200" width="400" height="234"/></clipPath>
  <clipPath id="${id}-b" clipPathUnits="userSpaceOnUse"><rect x="-200" y="34" width="400" height="300"/></clipPath>
</defs>`;

const wrap = (w, h, body, id, mono, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" role="img" aria-label="${title}"><title>${title}</title>${defs(id, mono)}${body}</svg>`;

const SIZE = 100;
const capH = unbounded.capHeight * (SIZE / unbounded.unitsPerEm);

/** All-caps lockup: REZ ● RB (orb replaces the O). */
function caps({ text, mono = false, id = "c" }) {
  const rez = outline(unbounded, "REZ", SIZE, -2);
  const rb = outline(unbounded, "RB", SIZE, -2);
  const bodyD = capH * 0.94;
  const ringHalf = (29 / 34) * bodyD * 0.5 * 2 * 0.5; // visual half-width of ring
  const gap = ringHalf * 0.9;
  const pad = 14;
  const ox = pad + rez.width + gap + ringHalf;
  const baseline = pad + capH;
  const body = `<g fill="${text}" transform="translate(${pad} ${baseline})">${rez.svg}</g>${orb(id, ox, baseline - capH / 2, bodyD, C.plasma, mono)}<g fill="${text}" transform="translate(${(ox + ringHalf + gap).toFixed(2)} ${baseline})">${rb.svg}</g>`;
  const w = ox + ringHalf + gap + rb.width + pad;
  return { w, h: baseline + pad, body, baseline, capH };
}

/** Editorial lockup: italic serif "re" + ZORB (orb replaces the O). */
function editorial({ text, re, mono = false, id = "e" }) {
  const reSize = SIZE * 1.55;
  const r = outline(serif, "re", reSize, 0);
  const z = outline(unbounded, "Z", SIZE, 0);
  const rb = outline(unbounded, "RB", SIZE, -2);
  const bodyD = capH * 0.94;
  const ringHalf = (29 / 34) * bodyD * 0.5;
  const gap = ringHalf * 0.9;
  const pad = 14;
  const baseline = pad + capH;
  let x = pad;
  const reG = `<g fill="${re}" transform="translate(${x} ${baseline})">${r.svg}</g>`;
  x += r.width + 4;
  const zG = `<g fill="${text}" transform="translate(${x} ${baseline})">${z.svg}</g>`;
  x += z.width + gap + ringHalf;
  const o = orb(id, x, baseline - capH / 2, bodyD, C.plasma, mono);
  x += ringHalf + gap;
  const rbG = `<g fill="${text}" transform="translate(${x.toFixed(2)} ${baseline})">${rb.svg}</g>`;
  x += rb.width + pad;
  return { w: x, h: baseline + pad, body: reG + zG + o + rbG };
}

function mark({ mono = false, id = "m", ring = C.plasma }) {
  const body = orb(id, 50, 50, 50, ring, mono);
  return { w: 100, h: 100, body };
}

fs.mkdirSync(OUT, { recursive: true });
const files = {
  "rezorb-wordmark.svg": [caps({ text: C.star, id: "w1" }), "w1", false, "Rezorb"],
  "rezorb-wordmark-ink.svg": [caps({ text: C.ink, id: "w2" }), "w2", false, "Rezorb"],
  "rezorb-wordmark-mono.svg": [caps({ text: "currentColor", mono: true, id: "w3" }), "w3", true, "Rezorb"],
  "rezorb-editorial.svg": [editorial({ text: C.star, re: C.nebula, id: "e1" }), "e1", false, "Rezorb"],
  "rezorb-editorial-ink.svg": [editorial({ text: C.ink, re: C.nebula, id: "e2" }), "e2", false, "Rezorb"],
  "rezorb-mark.svg": [mark({ id: "m1" }), "m1", false, "Rezorb mark"],
  "rezorb-mark-mono.svg": [mark({ mono: true, id: "m2" }), "m2", true, "Rezorb mark"],
};
for (const [name, [g, id, mono, title]] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), wrap(g.w, g.h, g.body, id, mono, title) + "\n");
}

// Stacked: big mark above the all-caps wordmark.
{
  const c = caps({ text: C.star, id: "s1" });
  const markD = 150;
  const W = Math.max(c.w, markD + 80);
  const body = `${orb("s1m", W / 2, markD / 2 + 10, markD * 0.62, C.plasma, false)}<g transform="translate(${((W - c.w) / 2).toFixed(1)} ${markD + 20})">${c.body}</g>`;
  fs.writeFileSync(path.join(OUT, "rezorb-stacked.svg"), wrap(W, markD + 20 + c.h, body, "s1m", false, "Rezorb").replace("</defs>", defs("s1", false).replace(/<\/?defs>/g, "") + "</defs>") + "\n");
}
console.log("wrote", fs.readdirSync(OUT).join(", "));
