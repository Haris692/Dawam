// Personnages cartoon « ronds et mignons » des vidéos Dawam : grosse tête, contours sombres, ombrage en aplat, visages expressifs.
// Repère local : origine au bassin, y vers le bas. Assis, un personnage mesure ≈ 340 px du bassin au sommet de la tête (échelle 1).
// On place les mains (repère du bassin, non pivoté) : les coudes viennent d'une cinématique inverse à deux segments.
// Interface : new Toon(parent, cfg) ; set(pose) à chaque image ; tint(couleur, k) pour la nuit ; phoneWorld(pose) ; headWorld(pose).
'use strict';
const TOON = { OL: '#3A2A26', LW: 5.5, ARM1: 58, ARM2: 54, SH: [46, -116], NECK: -146, HEAD: 86, R: 90, SLEEVE: 26 };
const circleD = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const ellipseD = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
let toonSeq = 0;

// coude à l'extérieur (out = -1 : vers la gauche, +1 : vers la droite)
function toonIk(sx, sy, tx, ty, out) {
  const A1 = TOON.ARM1, A2 = TOON.ARM2, dx = tx - sx, dy = ty - sy;
  const d = clamp(Math.hypot(dx, dy), Math.abs(A1 - A2) + 1, A1 + A2 - .5);
  const a = Math.atan2(dy, dx);
  const A = Math.acos(clamp((A1 * A1 + d * d - A2 * A2) / (2 * A1 * d), -1, 1));
  const e1 = [sx + A1 * Math.cos(a + A), sy + A1 * Math.sin(a + A)];
  const e2 = [sx + A1 * Math.cos(a - A), sy + A1 * Math.sin(a - A)];
  const e = (out < 0 ? e1[0] < e2[0] : e1[0] > e2[0]) ? e1 : e2;
  return [e[0], e[1], sx + d * Math.cos(a), sy + d * Math.sin(a)];
}

const TORSO = 'M-30 -152C-48 -152 -56 -142 -58 -122C-62 -84 -72 -44 -72 -14C-72 6 -58 12 -42 12L42 12C58 12 72 6 72 -14C72 -44 62 -84 58 -122C56 -142 48 -152 30 -152Z';
const HAIR_F = 'M-93 14C-99 -52 -56 -102 4 -101C64 -100 99 -52 93 14L82 14C83 -8 80 -26 70 -40C52 -40 40 -46 34 -54C18 -38 -12 -34 -36 -40C-50 -26 -66 -12 -79 4L-82 14Z';
const TUFT = 'M8 -99C10 -122 34 -132 50 -122C38 -121 30 -114 28 -100Z';
const HAIR_B = 'M-93 18C-99 -54 -56 -102 0 -102C56 -102 99 -54 93 18C82 50 42 64 0 64C-42 64 -82 50 -93 18Z';
const HIJAB = 'M0 -102C60 -102 102 -60 102 -4C102 36 96 66 106 98C112 120 104 138 80 144C40 152 -40 152 -80 144C-104 138 -112 120 -106 98C-96 66 -102 36 -102 -4C-102 -60 -60 -102 0 -102Z';
const KUFI = 'M-80 -36C-84 -98 -40 -113 0 -113C40 -113 84 -98 80 -36C40 -49 -40 -49 -80 -36Z';
const BEARD = 'M-88 16C-86 62 -52 95 0 97C52 95 86 62 88 16L83 16C81 50 50 74 0 76C-50 74 -81 50 -83 16Z';

class Toon {
  constructor(parent, cfg = {}) {
    const c = this.c = Object.assign({
      view: 'front', skin: '#D9A27A', top: '#5B8FB9', bottom: '#3D4A6B', shoe: '#3A2E2A', sock: '#F4F1EA',
      head: 'hair', hair: '#2A1A12', beard: false, kufi: null, kufiBand: '#D9A94E', hijab: '#E59AA0', under: '#FFF4E6',
      lashes: false, legs: 'sit', dress: false, collar: 'tee', sleeve: null, apron: null, straps: null, glasses: false,
      phoneColor: '#2B2A33', brow: null,
    }, cfg);
    this.id = 'toon' + (++toonSeq);
    this.seed = toonSeq * 1.37;
    this.paint = [];
    this.tintKey = '';
    this.H = { L: [0, 0], R: [0, 0] };
    this.root = el('g', {}, parent);
    this.defs = el('defs', {}, this.root);
    const lg = el('radialGradient', { id: this.id + '-light' }, this.defs);
    el('stop', { offset: 0, 'stop-color': '#FFF1D0', 'stop-opacity': .95 }, lg);
    el('stop', { offset: 1, 'stop-color': '#FFF1D0', 'stop-opacity': 0 }, lg);
    const L = () => el('g', {}, this.root);
    this.gBack = L();   // vue de dos : bras et mains derrière le buste
    this.gLegs = L();   // tibias, chaussures (genoux en vue de dos)
    this.gBody = L();   // buste (pivote avec lean)
    this.gLap = L();    // cuisses, jupe, jambes croisées (devant le buste)
    this.gUpper = L();  // haut des bras (sous le voile)
    this.gHead = L();   // tête (pivote avec lean)
    this.gFore = L();   // avant-bras
    this.gPalms = L();
    this.gPhone = L();
    this.gThumbs = L();
    this.buildLegs();
    this.buildBody();
    this.buildHead();
    this.buildArms();
    // téléphone
    this.phone = el('g', {}, this.gPhone);
    this.S_('rect', { x: -17, y: -31, width: 34, height: 62, rx: 8 }, this.phone, c.phoneColor, 4);
    this.screen = el('rect', { x: -13, y: -26, width: 26, height: 52, rx: 5, fill: '#2b2b30' }, this.phone);
    el('path', { d: 'M-8 -19L5 -23', stroke: '#FFFFFF', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .35 }, this.phone);
  }

  // ───────── outils de dessin ─────────
  P_(tag, attrs, parent) {
    const n = el(tag, attrs, parent);
    for (const prop of ['fill', 'stroke']) { const v = attrs[prop]; if (v && v[0] === '#') this.paint.push([n, v, prop]); }
    return n;
  }
  // forme pleine avec contour : le contour est peint sous le remplissage, seule sa moitié extérieure se voit
  S_(tag, attrs, parent, fill, lw = TOON.LW) {
    return this.P_(tag, Object.assign({ fill, stroke: TOON.OL, 'stroke-width': 2 * lw, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }, attrs), parent);
  }
  line(d, color, w, parent, extra = {}) {
    return this.P_('path', Object.assign({ d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, extra), parent);
  }
  clip(name, d) {
    const id = `${this.id}-${name}`;
    el('path', { d }, el('clipPath', { id }, this.defs));
    return `url(#${id})`;
  }
  // segment épais avec contour (bras, jambes)
  tube(parent, w, color, d = '') {
    const o = this.P_('path', { d, fill: 'none', stroke: TOON.OL, 'stroke-width': w + 2 * TOON.LW, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
    const f = this.P_('path', { d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, parent);
    return { o, f, set(dd) { o.setAttribute('d', dd); f.setAttribute('d', dd); } };
  }
  shoe(parent, x, y) {
    const g = el('g', { transform: `translate(${x} ${y})` }, parent);
    this.S_('path', { d: 'M-25 4C-25 -12 25 -12 25 4C25 13 17 15 0 15C-17 15 -25 13 -25 4Z' }, g, this.c.shoe);
    this.P_('ellipse', { cx: -8, cy: -3, rx: 8, ry: 3.5, fill: shade(this.c.shoe, .32) }, g);
  }

  // ───────── jambes ─────────
  buildLegs() {
    const c = this.c, front = c.view === 'front', pants = c.dress ? c.top : c.bottom, dk = shade(pants, -.16);
    if (c.legs === 'sit' && front) {
      if (!c.dress) for (const sg of [-1, 1]) this.tube(this.gLegs, 34, shade(pants, -.05), `M${sg * 31} 20L${sg * 34} 94`);
      for (const sg of [-1, 1]) this.shoe(this.gLegs, sg * 37, c.dress ? 114 : 106);
      const LAP = c.dress ? 'M-70 -18C-80 40 -82 84 -80 108C-40 118 40 118 80 108C82 84 80 40 70 -18Z'
        : 'M-72 -16C-76 22 -66 40 -34 40L34 40C66 40 76 22 72 -16Z';
      this.S_('path', { d: LAP }, this.gLap, pants);
      const sh = el('g', { 'clip-path': this.clip('lap', LAP) }, this.gLap);
      this.P_('path', { d: 'M40 -30C60 10 64 60 60 130L120 130L120 -30Z', fill: dk }, sh);
      if (c.dress) this.line('M-30 40Q-34 80 -36 110M26 40Q30 80 32 110', dk, 4, this.gLap);
      else this.line('M0 2V38', dk, 4, this.gLap);
    } else if (c.legs === 'cross') {
      if (front) {
        const LAP = 'M-118 10C-124 -16 -84 -24 -50 -18L50 -18C84 -24 124 -16 118 10C114 36 80 48 0 48C-80 48 -114 36 -118 10Z';
        this.S_('path', { d: LAP }, this.gLap, pants);
        const sh = el('g', { 'clip-path': this.clip('lap', LAP) }, this.gLap);
        this.P_('path', { d: 'M60 -30C96 -10 110 20 90 60L140 60L140 -30Z', fill: dk }, sh);
        this.line('M-98 24Q-30 36 34 12M98 24Q48 34 10 26', dk, 4, this.gLap);
        for (const sg of [-1, 1]) this.S_('ellipse', { cx: sg * 30, cy: 42, rx: 19, ry: 11, transform: `rotate(${sg * -12} ${sg * 30} 42)` }, this.gLap, c.sock, 4);
      } else {
        for (const sg of [-1, 1]) this.S_('ellipse', { cx: sg * 96, cy: 8, rx: 48, ry: 27 }, this.gLegs, pants);
      }
    }
  }

  // ───────── buste ─────────
  buildBody() {
    const c = this.c, g = this.gBody, front = c.view === 'front', top = c.top;
    const dk = shade(top, -.15), dk2 = shade(top, -.27);
    this.S_('path', { d: TORSO }, g, top);
    const sh = el('g', { 'clip-path': this.clip('torso', TORSO) }, g);
    this.P_('path', { d: 'M36 -160C62 -100 64 -40 46 20L100 20L100 -160Z', fill: dk }, sh);
    this.P_('ellipse', { cx: 0, cy: -152, rx: 74, ry: 30, fill: dk2 }, sh);   // ombre portée de la tête
    if (!front) {
      if (c.collar === 'qamis') this.line('M0 -120V8', dk, 3.5, g);
      return;
    }
    if (c.straps) for (const sg of [-1, 1]) this.tube(g, 12, c.straps, `M${sg * 34} -150Q${sg * 42} -90 ${sg * 46} -36`);
    if (c.apron) {
      const AP = 'M-40 -112L40 -112Q46 -50 54 12L-54 12Q-46 -50 -40 -112Z';
      this.S_('path', { d: AP }, g, c.apron, 3);
      this.S_('path', { d: 'M-22 -62h44v24q0 6 -6 6h-32q-6 0 -6 -6z' }, g, c.apron, 2.4);
      this.line('M-38 -112L-26 -150M38 -112L26 -150', shade(c.apron, -.25), 5, g);
    }
    const lt = shade(top, .3);
    if (c.collar === 'pyjama') {
      for (const sg of [-1, 1]) this.S_('path', { d: `M${sg * 2} -130L${sg * 34} -146Q${sg * 38} -126 ${sg * 24} -112Z` }, g, lt, 2.2);
      this.line('M0 -126V8', dk2, 3, g);
      for (const y of [-98, -68, -38]) this.S_('circle', { cx: 0, cy: y, r: 4.5 }, g, lt, 1.6);
    } else if (c.collar === 'qamis') {
      this.S_('path', { d: 'M-8 -140h16v74q0 6 -8 6q-8 0 -8 -6z' }, g, shade(top, -.05), 1.6);
      for (const y of [-124, -104, -84]) this.P_('circle', { cx: 0, cy: y, r: 3.4, fill: '#CDB892' }, g);
      this.line('M-24 -146Q0 -134 24 -146', dk2, 5, g);
    } else if (c.collar === 'shirt') {
      const w = shade(top, .5);
      for (const sg of [-1, 1]) this.S_('path', { d: `M0 -132L${sg * 30} -150L${sg * 34} -122Z` }, g, w, 2.2);
      this.line('M0 -130V8', dk2, 3, g);
      for (const y of [-102, -72, -42]) this.P_('circle', { cx: 0, cy: y, r: 3.6, fill: w }, g);
      this.S_('path', { d: 'M-52 -96h22v18q0 4 -4 4h-14q-4 0 -4 -4z' }, g, top, 1.6);
    } else if (c.collar === 'tee') {
      this.line('M-24 -144Q0 -120 24 -144', dk2, 4, g);
    }
  }

  // ───────── tête ─────────
  buildHead() {
    const c = this.c, front = c.view === 'front';
    const neck = el('g', { transform: `translate(0 ${TOON.NECK})` }, this.gHead);
    this.tiltG = el('g', {}, neck);
    const h = el('g', { transform: `translate(0 ${-TOON.HEAD})` }, this.tiltG);
    this.F = c.head === 'hijab'
      ? { ex: 27, ey: 25, k: 1.02, by: 2, ny: 39, my: 51, chx: 47, chy: 42 }
      : { ex: 30, ey: 10, k: 1.06, by: -17, ny: 28, my: 43, chx: 52, chy: 32 };
    if (c.head === 'hijab') this.buildHijab(h, front); else this.buildHair(h, front);
    if (front) this.buildFace(h);
  }
  buildHair(h, front) {
    const c = this.c, R = TOON.R, skin = c.skin, skD = shade(skin, -.13), hair = c.hair;
    this.ears = [-1, 1].map(sg => {
      const g = el('g', { transform: `translate(${sg * 85} 14)` }, h);
      this.S_('circle', { r: 17 }, g, skin);
      this.line(`M${-sg * 3} -7Q${sg * 6} -1 ${-sg * 2} 7`, skD, 4, g);
      return g;
    });
    const HEAD = circleD(0, 0, R);
    this.S_('path', { d: HEAD }, h, skin);
    const sh = el('g', { 'clip-path': this.clip('head', HEAD) }, h);
    if (front) {
      this.P_('path', { d: HEAD + circleD(-12, -14, 93), 'fill-rule': 'evenodd', fill: skD }, sh);
      this.light = el('ellipse', { cx: 0, cy: 80, rx: 110, ry: 84, fill: `url(#${this.id}-light)`, opacity: 0 }, sh);
      this.P_('path', { d: HAIR_F, fill: skD, transform: 'translate(0 9)' }, sh);   // ombre de la frange
      if (c.tuft !== false) this.S_('path', { d: TUFT }, h, hair);
      this.S_('path', { d: HAIR_F }, h, hair);
    } else {
      this.S_('path', { d: HAIR_B }, h, hair);
    }
    this.line('M-56 -74Q-28 -90 8 -90', shade(hair, .26), 8, h);   // reflet
    if (c.kufi) {
      this.S_('path', { d: KUFI }, h, c.kufi);
      const ks = el('g', { 'clip-path': this.clip('kufi', KUFI) }, h);
      this.P_('path', { d: 'M30 -124C70 -94 82 -62 78 -30L130 -30L130 -124Z', fill: shade(c.kufi, -.1) }, ks);
      this.line('M-73 -45C-40 -57 40 -57 73 -45', c.kufiBand, 4.5, h, { 'stroke-dasharray': '.5 8' });
    }
  }
  buildHijab(h, front) {
    const c = this.c, hj = c.hijab, dk = shade(hj, -.13), dk2 = shade(hj, -.24), lt = shade(hj, .32);
    this.S_('path', { d: HIJAB }, h, hj);
    const sh = el('g', { 'clip-path': this.clip('hijab', HIJAB) }, h);
    this.P_('path', { d: 'M40 -112C96 -62 102 40 72 172L140 172L140 -112Z', fill: dk }, sh);
    if (front) {
      this.line('M-66 98Q-74 120 -68 142M66 98Q74 120 68 142', dk2, 4, h);
      this.P_('path', { d: circleD(0, 20, 77), fill: dk2 }, sh);   // épaisseur du tissu autour du visage
      const FACE = circleD(0, 14, 72);
      this.S_('path', { d: FACE }, h, c.skin, 3.6);
      const fs = el('g', { 'clip-path': this.clip('face', FACE) }, h);
      this.P_('path', { d: FACE + circleD(-9, 5, 73), 'fill-rule': 'evenodd', fill: shade(c.skin, -.13) }, fs);
      this.light = el('ellipse', { cx: 0, cy: 92, rx: 96, ry: 76, fill: `url(#${this.id}-light)`, opacity: 0 }, fs);
      this.P_('path', { d: 'M-62.5 -7.5A66 66 0 0 1 62.5 -7.5', fill: 'none', stroke: c.under, 'stroke-width': 11 }, fs);   // bandeau
      this.line('M-57.3 -5.6A61 61 0 0 1 57.3 -5.6', shade(c.under, -.2), 2.4, fs);
    } else {
      this.line('M0 -94C12 0 6 80 0 160', dk2, 4, h);
    }
    this.line('M-74 -42Q-56 -80 -16 -90', lt, 9, h);   // reflet
  }
  buildFace(h) {
    const c = this.c, F = this.F;
    const f = this.faceG = el('g', {}, h);
    const blush = mix(c.skin, '#FF5A5A', .4);
    this.cheeks = [-1, 1].map(sg => this.P_('ellipse', { cx: sg * F.chx, cy: F.chy, rx: 13 * F.k, ry: 8 * F.k, fill: blush }, f));
    if (c.beard) {
      const bg = el('g', { 'clip-path': this.clip('beard', circleD(0, 0, TOON.R + 2)) }, f);
      const bc = c.beardColor || mix(c.hair, c.skin, .22);
      this.S_('path', { d: BEARD }, bg, bc, 3);
      this.S_('path', { d: 'M-14 31C-7 25 7 25 14 31C9 34 -9 34 -14 31Z' }, f, bc, 2.2);   // moustache
    }
    this.eyes = [-1, 1].map(sg => this.buildEye(f, sg));
    if (c.glasses) {
      const gl = '#3A2A26';
      for (const sg of [-1, 1]) this.P_('circle', { cx: sg * F.ex, cy: F.ey, r: 21, fill: '#FFFFFF', 'fill-opacity': .18, stroke: gl, 'stroke-width': 4.5 }, f);
      this.line(`M${-F.ex + 21} ${F.ey - 2}Q0 ${F.ey - 9} ${F.ex - 21} ${F.ey - 2}`, gl, 4.5, f);
    }
    const browC = c.brow || (c.head === 'hijab' ? '#3A2418' : shade(c.hair, -.1));
    this.brows = [-1, 1].map(() => this.line('', browC, 6.5, f));
    this.line(`M-5 ${F.ny - 2}Q0 ${F.ny + 4} 5 ${F.ny - 2}`, shade(c.skin, -.34), 3.6, f);
    const mc = '#4A1F1A';
    this.mouthLine = this.line('', mc, 4.6, f);
    this.mouthOpen = this.P_('path', { d: '', fill: '#6E2A24', stroke: mc, 'stroke-width': 3.2, 'stroke-linejoin': 'round' }, f);
    const mclip = el('clipPath', { id: this.id + '-mouth' }, this.defs);
    this.mouthClip = el('path', { d: '' }, mclip);
    const inner = el('g', { 'clip-path': `url(#${this.id}-mouth)` }, f);
    this.teeth = el('rect', { x: -20, y: F.my - 12, width: 40, height: 10, fill: '#FFFDF8' }, inner);
    this.tongue = this.P_('ellipse', { cx: 0, cy: F.my + 14, rx: 10, ry: 7, fill: '#E8706A' }, inner);
    this.mouthKey = '';
  }
  buildEye(f, sg) {
    const c = this.c, k = this.F.k, dark = '#2A1A16';
    const g = el('g', {}, f);
    const open = el('g', {}, g);
    this.P_('ellipse', { rx: 10 * k, ry: 13.5 * k, fill: dark }, open);
    el('circle', { cx: 3.4 * k, cy: -5 * k, r: 4.3 * k, fill: '#FFFFFF' }, open);
    el('circle', { cx: -3.4 * k, cy: 4.8 * k, r: 1.9 * k, fill: '#FFFFFF' }, open);
    if (c.lashes) this.line(`M${sg * 7 * k} ${-9.5 * k}L${sg * 13 * k} ${-15 * k}M${sg * 9.8 * k} ${-4.5 * k}L${sg * 16.5 * k} ${-7.5 * k}`, dark, 3.2, open);
    const lid = el('g', {}, g);
    const lidFill = this.P_('path', { d: '', fill: c.skin }, lid);
    const lidLine = this.line('', dark, 3.6, lid);
    const closed = this.line('', dark, 4.6, g);
    return { g, open, lid, lidFill, lidLine, closed, sg, key: '' };
  }

  // ───────── bras et mains ─────────
  buildArms() {
    const c = this.c, front = c.view === 'front', sl = c.sleeve || c.top;
    const gU = front ? this.gUpper : this.gBack, gF = front ? this.gFore : this.gBack;
    this.arm = {}; this.hand = {};
    for (const s of ['L', 'R']) {
      const up = this.tube(gU, TOON.SLEEVE, sl);
      const fo = this.tube(gF, TOON.SLEEVE - 2, sl);
      // raccord du coude : on repeint le bout du haut du bras sur le contour de l'avant-bras
      const stub = this.P_('path', { fill: 'none', stroke: sl, 'stroke-width': TOON.SLEEVE, 'stroke-linecap': 'butt' }, gF);
      gF.insertBefore(stub, fo.f);
      this.arm[s] = { up, fo, stub };
    }
    for (const s of ['L', 'R']) {
      const palm = this.S_('circle', { r: 16 }, front ? this.gPalms : this.gBack, c.skin);
      const thumb = this.S_('circle', { r: 7.5 }, front ? this.gThumbs : this.gBack, c.skin, 4);
      this.hand[s] = { palm, thumb };
    }
  }

  // ───────── pose ─────────
  // p : { x, y, s, lean, tilt, dy, turn, t, hands:{L,R}, elbow:{L,R}, phone:null|'L'|'R'|'both', phoneAng, glow, faceLight,
  //       face:{ eyes:'open'|'closed'|'happy'|'wide', lid, blink, look:[x,y], brow, worry, mouth, blush } }
  set(p) {
    const s = p.s || 1, lean = p.lean || 0;
    this.root.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y)}) scale(${s.toFixed(4)})`);
    const rot = `rotate(${lean.toFixed(2)})`;
    this.gBody.setAttribute('transform', rot);
    this.gHead.setAttribute('transform', rot);
    this.tiltG.setAttribute('transform', `rotate(${(p.tilt || 0).toFixed(2)}) translate(0 ${(p.dy || 0).toFixed(1)})`);
    const a = lean * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const toLocal = (x, y) => [x * ca + y * sa, -x * sa + y * ca];
    const toWorld = (x, y) => [x * ca - y * sa, x * sa + y * ca];
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? -1 : 1;
      const tgt = toLocal(p.hands[side][0], p.hands[side][1]);
      const sx = sg * TOON.SH[0], sy = TOON.SH[1];
      const r = toonIk(sx, sy, tgt[0], tgt[1], p.elbow && p.elbow[side] ? -sg : sg);
      const S = toWorld(sx, sy), Eb = toWorld(r[0], r[1]), Hd = toWorld(r[2], r[3]);
      const A = this.arm[side];
      A.up.set(`M${f1(S[0])} ${f1(S[1])}L${f1(Eb[0])} ${f1(Eb[1])}`);
      A.fo.set(`M${f1(Eb[0])} ${f1(Eb[1])}L${f1(Hd[0])} ${f1(Hd[1])}`);
      const ux = (Eb[0] - S[0]) / TOON.ARM1, uy = (Eb[1] - S[1]) / TOON.ARM1;
      A.stub.setAttribute('d', `M${f1(Eb[0] - ux * 14)} ${f1(Eb[1] - uy * 14)}L${f1(Eb[0])} ${f1(Eb[1])}`);
      const Hn = this.hand[side];
      Hn.palm.setAttribute('cx', f1(Hd[0])); Hn.palm.setAttribute('cy', f1(Hd[1]));
      let dx = Hd[0] - Eb[0], dy = Hd[1] - Eb[1];
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      let nx = -dy, ny = dx;
      if (nx * sg > 0) { nx = -nx; ny = -ny; }
      Hn.thumb.setAttribute('cx', f1(Hd[0] + dx * 5 + nx * 11)); Hn.thumb.setAttribute('cy', f1(Hd[1] + dy * 5 + ny * 11));
      this.H[side] = Hd;
    }
    if (vis(this.gPhone, !!p.phone && this.c.view === 'front')) {
      const pos = p.phone === 'both' ? [(this.H.L[0] + this.H.R[0]) / 2, (this.H.L[1] + this.H.R[1]) / 2] : this.H[p.phone];
      this.phonePos = pos;
      this.phone.setAttribute('transform', `translate(${f1(pos[0])} ${f1(pos[1])}) rotate(${(p.phoneAng || 0).toFixed(1)}) translate(0 -18)`);
      this.screen.setAttribute('fill', mix('#2b2b30', '#FFF4DC', p.glow || 0));
    }
    if (this.eyes) this.setFace(p);
  }
  setFace(p) {
    const f = p.face || {}, F = this.F, turn = p.turn || 0;
    this.faceG.setAttribute('transform', `translate(${f1(turn * 18)} 0)`);
    if (this.ears) {
      this.ears[0].setAttribute('transform', `translate(${f1(-85 + (turn > 0 ? 8 : 24) * turn)} 14)`);
      this.ears[1].setAttribute('transform', `translate(${f1(85 + (turn > 0 ? -24 : -8) * turn)} 14)`);
    }
    let blink = f.blink;
    if (blink === undefined) {
      blink = 0;
      if (p.t !== undefined) { const ph = (p.t + this.seed) % 3.9; if (ph < .18) blink = Math.sin(ph / .18 * Math.PI); }
    }
    const look = f.look || [0, 0];
    for (const e of this.eyes) this.setEye(e, f.eyes || 'open', blink, f.lid || 0, look);
    this.setBrows(f.brow || 0, f.worry || 0);
    this.setMouth(f.mouth || 'smile');
    const bl = (f.blush === undefined ? .8 : f.blush).toFixed(2);
    for (const ch of this.cheeks) ch.setAttribute('opacity', bl);
    if (this.light) this.light.setAttribute('opacity', ((p.faceLight || 0) * (p.glow || 0)).toFixed(3));
  }
  setEye(e, mode, blink, lid, look) {
    const F = this.F, k = F.k;
    e.g.setAttribute('transform', `translate(${f1(e.sg * F.ex + look[0])} ${f1(F.ey + look[1])})`);
    let m = mode;
    if ((m === 'open' || m === 'wide') && (blink > .8 || lid > .92)) m = 'shut';
    const key = m + blink.toFixed(2) + lid.toFixed(2);
    if (key === e.key) return;
    e.key = key;
    const isOpen = m === 'open' || m === 'wide';
    vis(e.open, isOpen);
    vis(e.closed, !isOpen);
    vis(e.lid, isOpen && lid > .01);
    if (isOpen) {
      const sc = m === 'wide' ? 1.14 : 1;
      e.open.setAttribute('transform', `scale(${sc} ${(sc * (1 - blink)).toFixed(3)})`);
      if (lid > .01) {
        const ly = lerp(-15, 12, lid) * k, w = 14.5 * k;
        e.lidFill.setAttribute('d', `M${-w} ${-19 * k}H${w}V${f1(ly)}Q0 ${f1(ly + 4 * k)} ${-w} ${f1(ly)}Z`);
        e.lidLine.setAttribute('d', `M${-11.5 * k} ${f1(ly + .5)}Q0 ${f1(ly + 4.5 * k)} ${11.5 * k} ${f1(ly + .5)}`);
      }
      return;
    }
    const lash = this.c.lashes ? `M${e.sg * 10 * k} ${1 * k}L${e.sg * 15.5 * k} ${-1 * k}` : '';
    if (m === 'happy') e.closed.setAttribute('d', `M${-11 * k} ${5 * k}Q0 ${-9 * k} ${11 * k} ${5 * k}`);
    else if (m === 'closed') e.closed.setAttribute('d', `M${-11 * k} ${-2 * k}Q0 ${8 * k} ${11 * k} ${-2 * k}` + lash);
    else e.closed.setAttribute('d', `M${-10.5 * k} ${1 * k}Q0 ${4 * k} ${10.5 * k} ${1 * k}` + lash);
  }
  setBrows(raise, worry) {
    const F = this.F, k = F.k, key = raise.toFixed(2) + worry.toFixed(2);
    if (key === this.browKey) return;
    this.browKey = key;
    this.brows.forEach((b, i) => {
      const sg = i ? 1 : -1, by = F.by - 6 * raise, xi = sg * 15 * k, xo = sg * 41 * k;
      b.setAttribute('d', `M${f1(xi)} ${f1(by + 2 - 6 * worry)}Q${f1(sg * 28 * k)} ${f1(by - 6 - 2 * worry)} ${f1(xo)} ${f1(by + 3 + 2 * worry)}`);
    });
  }
  setMouth(m) {
    if (m === this.mouthKey) return;
    this.mouthKey = m;
    const y = this.F.my;
    const lines = {
      smile: `M-12 ${y - 4}Q0 ${y + 8} 12 ${y - 4}`, small: `M-7 ${y - 1}Q0 ${y + 4} 7 ${y - 1}`,
      flat: `M-8 ${y + 1}Q0 ${y + 2} 8 ${y + 1}`, frown: `M-9 ${y + 3}Q0 ${y - 4} 9 ${y + 3}`, wavy: `M-11 ${y + 1}Q-5 ${y - 3} 0 ${y + 1}Q5 ${y + 5} 11 ${y + 1}`,
    };
    const shapes = {
      grin: `M-17 ${y - 6}Q0 ${y - 2} 17 ${y - 6}Q16 ${y + 17} 0 ${y + 17}Q-16 ${y + 17} -17 ${y - 6}Z`,
      open: `M-12 ${y - 3}Q0 ${y - 1} 12 ${y - 3}Q11 ${y + 12} 0 ${y + 12}Q-11 ${y + 12} -12 ${y - 3}Z`,
      o: ellipseD(0, y + 3, 7, 8.5), yawn: ellipseD(0, y + 6, 11, 15),
    };
    const isLine = !!lines[m];
    vis(this.mouthLine, isLine);
    vis(this.mouthOpen, !isLine);
    if (isLine) { this.mouthLine.setAttribute('d', lines[m]); this.mouthClip.setAttribute('d', ''); return; }
    const d = shapes[m] || shapes.grin;
    this.mouthOpen.setAttribute('d', d);
    this.mouthClip.setAttribute('d', d);
    vis(this.teeth, m === 'grin');
  }
  // assombrit (nuit) ou réchauffe toutes les couleurs du personnage
  tint(color, k) {
    const key = color + k.toFixed(3);
    if (key === this.tintKey) return;
    this.tintKey = key;
    for (const [n, base, prop] of this.paint) n.setAttribute(prop, k > 0 ? mix(base, color, k) : base);
  }
  // position du téléphone / du centre de la tête dans le repère de la scène
  phoneWorld(p) {
    const s = p.s || 1, pp = this.phonePos || [0, 0];
    return [p.x + pp[0] * s, p.y + (pp[1] - 18) * s];
  }
  headWorld(p) {
    const s = p.s || 1, a = (p.lean || 0) * Math.PI / 180, hy = TOON.NECK - TOON.HEAD;
    return [p.x - Math.sin(a) * hy * s, p.y + Math.cos(a) * hy * s];
  }
}

// petits « z » qui montent au-dessus d'un personnage endormi
function buildZzz(parent) {
  return [0, 1, 2].map(() => el('text', { 'font-family': 'Plus Jakarta Sans', 'font-weight': 800, 'font-size': 40, fill: '#FFF3D6',
    stroke: TOON.OL, 'stroke-width': 6, 'paint-order': 'stroke', 'stroke-linejoin': 'round', 'text-anchor': 'middle' }, parent));
}
function drawZzz(zs, t, x, y, op) {
  zs.forEach((z, i) => {
    const ph = (t * .5 + i / 3) % 1;
    z.textContent = 'z';
    z.setAttribute('x', f1(x + ph * 50 + Math.sin(t * 2 + i * 2) * 6));
    z.setAttribute('y', f1(y - ph * 120));
    z.setAttribute('font-size', f1(24 + ph * 26));
    z.setAttribute('opacity', (op * Math.sin(ph * Math.PI)).toFixed(3));
  });
}
