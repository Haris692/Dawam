// Kit des vidéos au format TikTok : apparition des textes, carte de fin courte. À charger après ../lib/engine.js.
'use strict';
// texte à la TikTok : une boîte par ligne (lignes séparées par \n)
function cap(stage, text, cls, top, extra = '') {
  const d = document.createElement('div');
  d.className = 'cap ' + cls;
  d.style.top = top + 'px';
  d.innerHTML = `<span class="l">${text.replace(/\n/g, '<br>')}</span>` + extra;
  stage.appendChild(d);
  return d;
}
// apparition « pop » (comme les textes natifs), disparition sèche
function pop(node, t, tin, tout, o = {}) {
  const a = P(t, tin, .32, E.outB2), out = P(t, tout, .18, E.inC);
  T(node, { x: o.x || 0, y: (o.y || 0) + (1 - a) * 18, s: lerp(.82, 1, a) * (1 - .06 * out), r: o.r || 0, op: P(t, tin, .1) * (1 - out) });
}
function el2(stage, html) {
  const w = document.createElement('div');
  w.innerHTML = html.trim();
  const n = w.firstChild;
  stage.appendChild(n);
  return n;
}
// carte de fin courte (logo, slogan, « Lien en bio »)
function tkEnd(stage) { return buildEnd(stage, 'Lien en bio 🤍'); }
