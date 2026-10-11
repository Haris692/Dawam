// Personnages illustrés « sans visage » (vue de face ou de dos), posés image par image.
// Repère local : origine au bassin, y vers le bas ; un personnage assis mesure ≈ 340 px du bassin au sommet de la tête (échelle 1).
// On place les mains (coordonnées du bassin, non pivotées) : les coudes sont calculés par cinématique inverse à deux segments.
'use strict';
const ARM1 = 100, ARM2 = 96, SHOULDER = [62, -216];

function ik2(sx, sy, tx, ty, side) {
  const dx = tx - sx, dy = ty - sy;
  const d = clamp(Math.hypot(dx, dy), Math.abs(ARM1 - ARM2) + 1, ARM1 + ARM2 - .5);
  const a = Math.atan2(dy, dx);
  const A = Math.acos(clamp((ARM1 * ARM1 + d * d - ARM2 * ARM2) / (2 * ARM1 * d), -1, 1));
  const e1 = [sx + ARM1 * Math.cos(a + A), sy + ARM1 * Math.sin(a + A)];
  const e2 = [sx + ARM1 * Math.cos(a - A), sy + ARM1 * Math.sin(a - A)];
  const e = (side < 0 ? e1[0] < e2[0] : e1[0] > e2[0]) ? e1 : e2;
  return [e[0], e[1], sx + d * Math.cos(a), sy + d * Math.sin(a)];
}

const TORSO = 'M-60 0L-69 -198Q-73 -232 -44 -238L44 -238Q73 -232 69 -198L60 0Q0 9 -60 0Z';
const TORSO_SHADE_F = 'M18 -238L44 -238Q73 -232 69 -198L60 0Q40 6 18 8Z';
const TORSO_SHADE_B = 'M-18 -238L-44 -238Q-73 -232 -69 -198L-60 0Q-40 6 -18 8Z';

class Person {
  constructor(parent, cfg = {}) {
    const c = this.c = Object.assign({
      view: 'front', skin: '#C68A60', top: '#2F6B66', bottom: '#34405E', shoe: '#2B2420',
      head: 'hair', hair: '#2A1C14', beard: false, kufi: null, hijab: '#E6D3B3', dress: false, legs: 'sit', phoneColor: '#1d1d1f',
    }, cfg);
    this.paint = [];
    const P_ = (tag, attrs, parent, color, prop = 'fill') => { const n = el(tag, Object.assign({ [prop]: color }, attrs), parent); this.paint.push([n, color, prop]); return n; };
    this.P_ = P_;
    this.root = el('g', {}, parent);
    this.gLegs = el('g', {}, this.root);
    this.gArmsBack = el('g', {}, this.root);
    this.gBody = el('g', {}, this.root);
    this.gArmsFront = el('g', {}, this.root);
    this.gHead = el('g', {}, this.root);
    this.gPhone = el('g', {}, this.root);
    this.gHands = el('g', {}, this.root);
    this.buildLegs(c.legs);
    // buste
    const front = c.view === 'front';
    P_('rect', { x: -15, y: -262, width: 30, height: 36, rx: 10 }, this.gBody, c.skin);
    P_('path', { d: TORSO }, this.gBody, c.top);
    P_('path', { d: front ? TORSO_SHADE_F : TORSO_SHADE_B, opacity: .55 }, this.gBody, shade(c.top, -.16));
    if (front && c.head !== 'hijab') P_('path', { d: 'M-17 -238L0 -212L17 -238', fill: 'none', 'stroke-width': 5, 'stroke-linecap': 'round' }, this.gBody, shade(c.top, -.2), 'stroke');
    // tête (pivote autour du haut du cou)
    const neck = el('g', { transform: 'translate(0 -252)' }, this.gHead);
    this.tiltG = el('g', {}, neck);
    const h = el('g', { transform: 'translate(0 -40)' }, this.tiltG);
    this.buildHead(h);
    // bras : derrière le buste en vue de dos (seuls les coudes dépassent)
    const armG = front ? this.gArmsFront : this.gArmsBack;
    this.arm = {}; this.hand = {};
    for (const s of ['L', 'R']) {
      this.arm[s] = P_('path', { fill: 'none', 'stroke-width': 30, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, armG, c.sleeve || c.top, 'stroke');
      this.hand[s] = P_('circle', { r: 14 }, front ? this.gHands : this.gArmsBack, c.skin);
    }
    // téléphone
    P_('rect', { x: -20, y: -38, width: 40, height: 76, rx: 9 }, this.gPhone, c.phoneColor);
    this.screen = el('rect', { x: -16.5, y: -34, width: 33, height: 68, rx: 6, fill: '#2b2b30' }, this.gPhone);
    this.H = { L: [0, 0], R: [0, 0] };
    this.tintKey = '';
  }
  buildLegs(kind) {
    const c = this.c, g = this.gLegs, P_ = this.P_;
    const pants = c.dress ? c.top : c.bottom;
    if (kind === 'sit') {
      if (c.dress) {
        for (const sg of [-1, 1]) {
          P_('path', { d: `M${sg * 34} 110L${sg * 38} 176`, 'stroke-width': 30, 'stroke-linecap': 'round' }, g, c.skin, 'stroke');
          P_('ellipse', { cx: sg * 42, cy: 186, rx: 30, ry: 14 }, g, c.shoe);
        }
        P_('path', { d: 'M-66 -24L66 -24Q90 50 86 132Q0 146 -86 132Q-90 50 -66 -24Z' }, g, pants);
        P_('path', { d: 'M24 -24L66 -24Q90 50 86 132Q56 140 30 141Z', opacity: .5 }, g, shade(pants, -.16));
      } else {
        for (const sg of [-1, 1]) {
          P_('path', { d: `M${sg * 36} 40L${sg * 38} 172`, 'stroke-width': 42, 'stroke-linecap': 'round' }, g, shade(pants, -.08), 'stroke');
          P_('path', { d: `M${sg * 30} -4L${sg * 36} 34`, 'stroke-width': 50, 'stroke-linecap': 'round' }, g, pants, 'stroke');
          P_('ellipse', { cx: sg * 42, cy: 188, rx: 32, ry: 15 }, g, c.shoe);
        }
      }
    } else if (kind === 'cross') {
      if (c.view === 'front') {
        P_('path', { d: 'M-128 18Q-136 -14 -58 -12L58 -12Q136 -14 128 18Q118 50 0 48Q-118 50 -128 18Z' }, g, pants);
        P_('path', { d: 'M-40 30Q0 44 40 30', fill: 'none', 'stroke-width': 4, opacity: .5 }, g, shade(pants, -.25), 'stroke');
      } else {
        for (const sg of [-1, 1]) P_('ellipse', { cx: sg * 104, cy: 4, rx: 50, ry: 28 }, g, shade(pants, -.06));
        P_('path', { d: 'M-118 10Q-120 -16 -60 -14L60 -14Q120 -16 118 10Q100 34 0 32Q-100 34 -118 10Z' }, g, pants);
      }
    } else if (kind === 'stand') {
      if (c.dress) {
        for (const sg of [-1, 1]) P_('ellipse', { cx: sg * 40, cy: 246, rx: 30, ry: 13 }, g, c.shoe);
        P_('path', { d: 'M-62 -10L62 -10L94 238Q0 250 -94 238Z' }, g, pants);
      } else {
        for (const sg of [-1, 1]) {
          P_('path', { d: `M${sg * 30} -4L${sg * 32} 232`, 'stroke-width': 46, 'stroke-linecap': 'round' }, g, pants, 'stroke');
          P_('ellipse', { cx: sg * 38, cy: 246, rx: 32, ry: 14 }, g, c.shoe);
        }
      }
    }
  }
  buildHead(h) {
    const c = this.c, P_ = this.P_, front = c.view === 'front';
    if (c.head === 'hijab') {
      const hd = shade(c.hijab, -.13);
      P_('path', { d: 'M-57 -2A57 57 0 0 1 57 -2L61 36Q66 60 96 70L98 82L-98 82L-96 70Q-66 60 -61 36Z' }, h, c.hijab);
      if (front) {
        P_('path', { d: 'M-46 56Q0 78 46 56', fill: 'none', 'stroke-width': 3, opacity: .55 }, h, hd, 'stroke');
        P_('ellipse', { cx: 0, cy: 6, rx: 31, ry: 37 }, h, c.skin);
        P_('path', { d: 'M-27 -21Q0 -37 27 -21', fill: 'none', 'stroke-width': 7, 'stroke-linecap': 'round' }, h, hd, 'stroke');
      } else {
        P_('path', { d: 'M0 -54Q8 10 0 78', fill: 'none', 'stroke-width': 3, opacity: .5 }, h, hd, 'stroke');
        P_('path', { d: 'M-57 -2A57 57 0 0 1 -10 -57Q-30 -20 -40 40Z', opacity: .25 }, h, hd);
      }
      return;
    }
    for (const sg of [-1, 1]) P_('circle', { cx: sg * 45, cy: 2, r: 9 }, h, shade(c.skin, -.06));
    P_('circle', { cx: 0, cy: 0, r: 46 }, h, c.skin);
    if (front) {
      P_('path', { d: 'M-46 -4Q-50 -54 0 -52Q50 -54 46 -4Q41 -28 0 -30Q-41 -28 -46 -4Z' }, h, c.hair);
      if (c.beard) P_('path', { d: 'M-43 2Q-41 54 0 56Q41 54 43 2Q33 30 0 31Q-33 30 -43 2Z' }, h, shade(c.hair, .06));
    } else {
      P_('path', { d: 'M-47 2Q-49 -54 0 -52Q49 -54 47 2Q45 32 26 40Q0 46 -26 40Q-45 32 -47 2Z' }, h, c.hair);
    }
    if (c.kufi) {
      P_('path', { d: 'M-42 -22Q-40 -60 0 -60Q40 -60 42 -22Q0 -31 -42 -22Z' }, h, c.kufi);
      P_('path', { d: 'M-40 -27Q0 -36 40 -27', fill: 'none', 'stroke-width': 3, opacity: .6 }, h, shade(c.kufi, -.15), 'stroke');
    }
  }
  // p : { x, y, s, lean, tilt, dy, hands:{L:[x,y],R:[x,y]}, phone:null|'L'|'R'|'both', phoneAng, glow }
  set(p) {
    const s = p.s || 1, lean = p.lean || 0;
    this.root.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y)}) scale(${s.toFixed(4)})`);
    this.gBody.setAttribute('transform', `rotate(${lean.toFixed(2)})`);
    this.gHead.setAttribute('transform', `rotate(${lean.toFixed(2)})`);
    this.tiltG.setAttribute('transform', `rotate(${(p.tilt || 0).toFixed(2)}) translate(0 ${(p.dy || 0).toFixed(1)})`);
    const a = lean * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const toLocal = (x, y) => [x * ca + y * sa, -x * sa + y * ca];
    const toWorld = (x, y) => [x * ca - y * sa, x * sa + y * ca];
    for (const side of ['L', 'R']) {
      const sg = side === 'L' ? -1 : 1;
      const tgt = toLocal(p.hands[side][0], p.hands[side][1]);
      const sx = sg * SHOULDER[0], sy = SHOULDER[1];
      const r = ik2(sx, sy, tgt[0], tgt[1], sg);
      const S = toWorld(sx, sy), Eb = toWorld(r[0], r[1]), Hd = toWorld(r[2], r[3]);
      this.arm[side].setAttribute('d', `M${f1(S[0])} ${f1(S[1])}L${f1(Eb[0])} ${f1(Eb[1])}L${f1(Hd[0])} ${f1(Hd[1])}`);
      this.hand[side].setAttribute('cx', f1(Hd[0])); this.hand[side].setAttribute('cy', f1(Hd[1]));
      this.H[side] = Hd;
    }
    if (vis(this.gPhone, !!p.phone)) {
      const pos = p.phone === 'both' ? [(this.H.L[0] + this.H.R[0]) / 2, (this.H.L[1] + this.H.R[1]) / 2] : this.H[p.phone];
      this.phonePos = pos;
      this.gPhone.setAttribute('transform', `translate(${f1(pos[0])} ${f1(pos[1])}) rotate(${(p.phoneAng || 0).toFixed(1)}) translate(0 -24)`);
      this.screen.setAttribute('fill', mix('#2b2b30', '#FFF4DC', p.glow || 0));
    }
  }
  // assombrit (nuit) ou réchauffe (aube) toutes les couleurs du personnage
  tint(color, k) {
    const key = color + k.toFixed(3);
    if (key === this.tintKey) return;
    this.tintKey = key;
    for (const [n, base, prop] of this.paint) n.setAttribute(prop, k > 0 ? mix(base, color, k) : base);
  }
  // position du téléphone dans le repère de la scène
  phoneWorld(p) {
    const s = p.s || 1, pp = this.phonePos || [0, 0];
    return [p.x + pp[0] * s, p.y + (pp[1] - 24) * s];
  }
}
