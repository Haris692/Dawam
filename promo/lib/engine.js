// Moteur commun des vidéos Dawam : easing, transformations, titres, téléphone, carte de fin, démarrage.
// Chaque page définit build() et render(t) puis appelle boot({ duration, build, render }).
// Toute l'animation est une fonction pure de t, ce qui permet le rendu image par image (render.mjs).
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  lin: p => p,
  outC: p => 1 - Math.pow(1 - p, 3),
  inC: p => p * p * p,
  ioC: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  ioS: p => .5 - .5 * Math.cos(Math.PI * p),
  outQ: p => 1 - Math.pow(1 - p, 5),
  outX: p => p >= 1 ? 1 : 1 - Math.pow(2, -10 * p),
  inX: p => p <= 0 ? 0 : Math.pow(2, 10 * p - 10),
  outB: p => { if (p <= 0) return 0; const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  outB2: p => { if (p <= 0) return 0; const c1 = 2.4, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
};
// progression 0→1 entre s et s+d, avec easing
const P = (t, s, d, e = E.outC) => e(clamp((t - s) / d));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
const mix = (a, b, p) => toHex(hex(a).map((v, i) => lerp(v, hex(b)[i], p)));
const shade = (c, k) => toHex(hex(c).map(v => k < 0 ? v * (1 + k) : v + (255 - v) * k));
const vis = (el, on) => { el.style.display = on ? '' : 'none'; return on; };
const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ');
// transform + opacité + flou en une passe (éléments HTML)
function T(el, o) {
  let s = '';
  if (o.x || o.y) s += `translate3d(${(o.x || 0).toFixed(2)}px,${(o.y || 0).toFixed(2)}px,0) `;
  if (o.rx) s += `rotateX(${o.rx.toFixed(3)}deg) `;
  if (o.ry) s += `rotateY(${o.ry.toFixed(3)}deg) `;
  if (o.r) s += `rotate(${o.r.toFixed(3)}deg) `;
  if (o.s !== undefined && o.s !== 1) s += `scale(${o.s.toFixed(4)}) `;
  el.style.transform = s || 'none';
  if (o.op !== undefined) { const op = clamp(o.op); el.style.opacity = op.toFixed(3); el.style.visibility = op < .002 ? 'hidden' : 'visible'; }
  if (o.blur !== undefined) el.style.filter = o.blur > .05 ? `blur(${o.blur.toFixed(2)}px)` : 'none';
}
// SVG
const SVGNS = 'http://www.w3.org/2000/svg';
function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVGNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
const f1 = v => v.toFixed(1);

// titres en deux lignes : apparition / sortie par masque
function headline(node, t, tin, tout) {
  let any = false;
  node.querySelectorAll('.ln').forEach((ln, i) => {
    const a = P(t, tin + i * .09, .8, E.outX), b = P(t, tout + i * .05, .45, E.inC);
    ln.style.transform = `translateY(${((1 - a) * 118 - b * 118).toFixed(2)}%)`;
    if (a > 0 && b < 1) any = true;
  });
  node.style.visibility = any ? 'visible' : 'hidden';
}
function fadeUp(node, t, tin, tout, dist = 26) {
  const a = P(t, tin, .8, E.outC), b = P(t, tout, .4, E.inC);
  T(node, { y: (1 - a) * dist - b * dist * .6, op: a * (1 - b) });
}
function popIn(node, t, tin, tout, o = {}) {
  const a = P(t, tin, .7, E.outB), b = P(t, tout, .35, E.inC);
  T(node, { x: o.x || 0, y: (o.y || 0) + (1 - a) * 40 - b * 30, s: lerp(.8, 1, a) - .1 * b, r: o.r || 0, op: P(t, tin, .2) * (1 - b) });
}

const ICON = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  beads: '<circle cx="12" cy="4.5" r="2"/><circle cx="17.3" cy="6.7" r="2"/><circle cx="19.5" cy="12" r="2"/><circle cx="17.3" cy="17.3" r="2"/><circle cx="12" cy="19.5" r="2"/><circle cx="6.7" cy="17.3" r="2"/><circle cx="4.5" cy="12" r="2"/><circle cx="6.7" cy="6.7" r="2"/>',
};
const SPARK = 'M0 -1C.12 -.24 .24 -.12 1 0C.24 .12 .12 .24 0 1C-.12 .24 -.24 .12 -1 0C-.24 -.12 -.12 -.24 0 -1Z';

// ───────── téléphone ─────────
const STATUSBAR = (color = '#000') => `<div class="sb"><div class="time" style="color:${color}">9:41</div>
  <svg style="left:398px" width="34" height="20" viewBox="0 0 34 20" fill="${color}"><rect x="0" y="12" width="6" height="7" rx="1.6"/><rect x="9" y="9" width="6" height="10" rx="1.6"/><rect x="18" y="5.5" width="6" height="13.5" rx="1.6"/><rect x="27" y="2" width="6" height="17" rx="1.6"/></svg>
  <svg style="left:442px" width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round"><path d="M11.46 16.46A5 5 0 0 1 18.54 16.46"/><path d="M7.93 12.93A10 10 0 0 1 22.07 12.93"/><path d="M4.39 9.39A15 15 0 0 1 25.61 9.39"/><circle cx="15" cy="20" r="1.6" fill="${color}" stroke="none"/></svg>
  <svg style="left:482px;top:34px" width="46" height="20" viewBox="0 0 46 20" fill="${color}"><rect x="1" y="1" width="38" height="18" rx="5.5" fill="none" stroke="${color}" stroke-opacity=".4" stroke-width="1.6"/><rect x="3.6" y="3.6" width="32.8" height="12.8" rx="3.4"/><path d="M41.5 7v6c1.2-.4 2-1.6 2-3s-.8-2.6-2-3z" fill-opacity=".45"/></svg></div>`;
function makePhone(layers, extra = '', sbColor = '#000') {
  const ph = document.createElement('div');
  ph.className = 'phone';
  ph.innerHTML = `<i class="pb pb1"></i><i class="pb pb2"></i><i class="pb pb3"></i><i class="pb pb4"></i><div class="screen">` +
    layers.map(s => s.startsWith('<') ? s : `<img data-k="${s}" src="../assets/screens/${s}.jpg" alt="">`).join('') +
    extra + STATUSBAR(sbColor) + `<div class="island"></div><div class="tapring"></div><div class="tap"></div></div>`;
  return ph;
}
// toucher sur l'écran : liste [t, x, y] en coordonnées écran (560×1214)
function drawTaps(phone, t, taps) {
  const tap = phone.querySelector('.tap'), ring = phone.querySelector('.tapring');
  let tp = null;
  for (const k of taps) if (t >= k[0] - .05 && t < k[0] + .75) tp = k;
  if (!tp) { T(tap, { op: 0 }); T(ring, { op: 0 }); return; }
  const lt = t - tp[0];
  const a = P(lt, -.05, .15), press = P(lt, .1, .1) - P(lt, .22, .12), fo = P(lt, .3, .25);
  tap.style.left = ring.style.left = tp[1] + 'px'; tap.style.top = ring.style.top = tp[2] + 'px';
  T(tap, { s: lerp(1.3, 1, a) - .14 * press, op: a * (1 - fo) });
  const rp = P(lt, .22, .5, E.outC);
  T(ring, { s: 1 + 1.4 * rp, op: rp > 0 ? (1 - rp) : 0 });
}

// ───────── étincelles et motif géométrique ─────────
function buildSparks(svgNode, color, seed, n = 26) {
  const rnd = mulberry32(seed), list = [];
  for (let i = 0; i < n; i++) {
    const g = el('path', { d: SPARK, fill: color }, svgNode);
    list.push({ el: g, x: rnd() * 1080, y: rnd() * 1920, s: 6 + rnd() * 14, v: 10 + rnd() * 26, ph: rnd() * 6.28, w: .8 + rnd() * 1.6 });
  }
  return list;
}
function drawSparks(list, t, op, svgNode) {
  svgNode.style.opacity = op.toFixed(3);
  if (!vis(svgNode, op > .002)) return;
  for (const s of list) {
    const y = ((s.y - t * s.v) % 1920 + 1920) % 1920;
    const tw = .25 + .75 * Math.pow(.5 + .5 * Math.sin(t * s.w + s.ph), 2);
    s.el.setAttribute('transform', `translate(${f1(s.x)} ${f1(y)}) scale(${(s.s * (.7 + .3 * tw)).toFixed(2)})`);
    s.el.setAttribute('opacity', (tw * .8).toFixed(3));
  }
}
function buildPattern(svgNode, color) {
  const a = 180, r = a / 2, out = [];
  for (let j = -1; j <= 11; j++) for (let i = -1; i <= 6; i++) {
    const cx = i * a + 90, cy = j * a + 60, pts = [];
    for (const k of [0, 3, 6, 1, 4, 7, 2, 5]) { const an = k * Math.PI / 4 + Math.PI / 8; pts.push(f1(cx + r * Math.cos(an)) + ' ' + f1(cy + r * Math.sin(an))); }
    const p = el('path', { d: 'M' + pts.join('L') + 'Z', pathLength: 1, 'stroke-dasharray': '1 1', stroke: color }, svgNode);
    out.push({ el: p, dist: Math.hypot(cx - 540, cy - 900) / 1100 });
  }
  return out;
}
function drawPattern(list, t, t0, op, svgNode) {
  svgNode.style.opacity = op.toFixed(3);
  if (!vis(svgNode, op > .002)) return;
  for (const p of list) p.el.style.strokeDashoffset = (1 - P(t, t0 + p.dist * 1.2, 1.2, E.ioC)).toFixed(4);
}

// ───────── carte de fin commune ─────────
function buildEnd(stage, series) {
  const wrap = document.createElement('div');
  wrap.className = 'L full end';
  wrap.innerHTML = `<div class="L endbg"></div><svg class="L pattern" width="1080" height="1920"></svg><svg class="L sparks" width="1080" height="1920"></svg>
    <div class="emb"><img src="../assets/img/emblem.png" alt=""></div>
    <div class="word">${'Dawam'.split('').map(c => `<span class="m"><span>${c}</span></span>`).join('')}</div>
    <div class="tag">Petit, mais constant.</div>
    <div class="series">${series}</div>
    <div class="platw"><div class="plat">iPhone · Android · Web</div></div>`;
  stage.appendChild(wrap);
  return { wrap, bg: wrap.querySelector('.endbg'), pat: buildPattern(wrap.querySelector('.pattern'), '#FFF3D6'), patSvg: wrap.querySelector('.pattern'),
    sp: buildSparks(wrap.querySelector('.sparks'), '#FFF1CC', 11), spSvg: wrap.querySelector('.sparks'),
    emb: wrap.querySelector('.emb'), letters: Array.from(wrap.querySelectorAll('.word .m>span')),
    tag: wrap.querySelector('.tag'), series: wrap.querySelector('.series'), plat: wrap.querySelector('.platw') };
}
// volet circulaire doré depuis (cx, cy), puis logo et slogan
function drawEnd(R, t, t0, cx = 540, cy = 1400) {
  const w = P(t, t0, .8, E.ioC);
  if (!vis(R.wrap, w > 0)) return;
  R.wrap.style.clipPath = w >= 1 ? 'none' : `circle(${(w * 2300).toFixed(1)}px at ${cx}px ${cy}px)`;
  drawPattern(R.pat, t, t0 + .2, .12 * P(t, t0 + .2, 1), R.patSvg);
  drawSparks(R.sp, t, P(t, t0 + .3, 1), R.spSvg);
  const pe = P(t, t0 + .45, .9, E.outB);
  T(R.emb, { s: lerp(.5, 1, pe), op: P(t, t0 + .45, .3), y: Math.sin(t * 1.4) * 4 });
  R.letters.forEach((l, i) => { const a = P(t, t0 + .65 + i * .06, .9, E.outX); l.style.transform = `translateY(${((1 - a) * 110).toFixed(2)}%)`; });
  fadeUp(R.tag, t, t0 + 1.0, 999, 30);
  fadeUp(R.series, t, t0 + 1.3, 999, 24);
  fadeUp(R.plat, t, t0 + 1.5, 999, 24);
}

// ───────── démarrage : préchargement, aperçu temps réel ou rendu image par image ─────────
async function boot({ duration, build, render }) {
  window.DURATION = duration;
  const faces = ['800 40px "Plus Jakarta Sans"', '600 40px "Plus Jakarta Sans"', 'italic 500 40px Lora', '400 40px Amiri', '700 40px Amiri', '800 40px "TikTok Sans"', '600 40px "TikTok Sans"'];
  await Promise.all(faces.map(f => document.fonts.load(f, 'Dawam دَوَام ﷺ')));
  await document.fonts.ready;
  build();
  await Promise.all(Array.from(document.images).map(im => im.decode().catch(() => {})));
  const draw = t => render(clamp(t, 0, duration));
  window.renderAt = draw;
  window.__ready = true;
  const q = new URLSearchParams(location.search);
  if (q.has('render')) { draw(0); return; }
  const fit = () => { $('#stage').style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`; };
  fit(); addEventListener('resize', fit);
  if (q.get('t') !== null) { draw(parseFloat(q.get('t'))); return; }
  let t0 = performance.now(), paused = false, cur = 0;
  addEventListener('keydown', e => {
    if (e.code === 'Space') paused = !paused;
    if (e.code === 'ArrowRight') cur = Math.min(duration, cur + 1);
    if (e.code === 'ArrowLeft') cur = Math.max(0, cur - 1);
    t0 = performance.now() - cur * 1000;
  });
  const loop = now => { if (!paused) cur = ((now - t0) / 1000) % duration; draw(cur); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}
