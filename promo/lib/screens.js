// Écrans et cartes de l'app recréés en HTML, réutilisables d'une vidéo à l'autre (voir screens.css).
'use strict';
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// séance de dhikr guidée — étape 1 (Istighfar)
function sessionScreen(id) {
  return `<div class="layer sds" id="${id}"><div class="sds-top"><div class="dots"><i class="on"></i><i></i><i></i></div><div class="tt">05:00</div></div>
    <div class="sds-body"><div class="lbl">📿 · 1 / 3</div><div class="ar">رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ</div>
    <div class="ph">Rabi ghfir li wa toub 'alayya innaka anta t-tawwabou-r-Rahim</div>
    <div class="fr">Seigneur pardonne-moi et accepte mon repentir. Tu es Celui qui accepte le repentant et le Très Miséricordieux.</div>
    <div class="cd">05:00</div><div class="bar"><i style="width:100%"></i></div></div><div class="sds-cta">Passer au suivant →</div></div>`;
}
// compte à rebours de 05:00 → 05:00 − (t − t0) × vitesse
function drawSession(root, t, t0, speed = 1) {
  const sec = clamp(300 - Math.max(0, t - t0) * speed, 0, 300);
  const txt = mmss(Math.ceil(sec));
  root.querySelector('.cd').textContent = txt;
  root.querySelector('.tt').textContent = txt;
  root.querySelector('.bar i').style.width = (sec / 3).toFixed(2) + '%';
}

// fil de réseau social générique (aucune marque) qui défile
const FEED = [['#FF7A59', '#FFB86B'], ['#5B6CFF', '#9E7BFF'], ['#16A085', '#7BD389'], ['#E84393', '#FD79A8'], ['#0984E3', '#74B9FF'], ['#E17055', '#FDCB6E'], ['#6C5CE7', '#A29BFE']];
function feedScreen(id) {
  return `<div class="layer feed" id="${id}">${FEED.map((c, i) => `<div class="post" style="background:linear-gradient(160deg,${c[0]},${c[1]})">
      <i style="left:${120 + (i * 97) % 300}px;top:${300 + (i * 131) % 400}px;width:${120 + (i * 37) % 120}px;height:${120 + (i * 37) % 120}px;opacity:.25"></i>
      <div class="side"><b></b><b></b><b></b><b></b></div><div class="meta"><b style="width:60%"></b><b style="width:92%"></b><b style="width:74%"></b></div></div>`).join('')}
    <div class="time">⏱ 2 h 14 aujourd'hui</div></div>`;
}
// défilement : un post toutes les `every` secondes, transition rapide (swipe)
function drawFeed(root, t, t0, every = .55) {
  const posts = root.querySelectorAll('.post'), n = posts.length;
  const k = Math.max(0, t - t0) / every, i = Math.floor(k), f = E.ioC(clamp((k - i) / .35));
  posts.forEach((p, j) => {
    const pos = j - (i % n) - f;
    const wrapped = pos < -1.5 ? pos + n : pos;
    p.style.transform = `translateY(${(wrapped * 1214).toFixed(1)}px)`;
  });
}

// carte de groupe : compteur de `from` à `to`
function groupCard(id, left, top) {
  return `<div class="gcard" id="${id}" style="left:${left}px;top:${top}px"><div class="gk">Groupe famille</div><div class="gl">Salawat sur le Prophète ﷺ</div>
    <div class="gar" lang="ar">صَلَّى ٱللَّٰهُ عَلَيْهِ وَسَلَّمَ</div><div class="gnumW"><div class="gnum">640</div><div class="gof">sur 1 000</div></div>
    <div class="gbar"><i></i></div><div class="gmem"><b style="background:#3E7C74">S</b><b style="background:#41597A">Y</b><b style="background:#C98B86">I</b><span>3 membres · en temps réel</span></div><div class="gpct">64%</div></div>`;
}
function drawGroup(root, t, t0, d, from = 640, to = 1000) {
  const v = lerp(from, to, P(t, t0, d, E.ioC));
  root.querySelector('.gnum').textContent = fmt(v);
  root.querySelector('.gbar i').style.width = (v / 10).toFixed(2) + '%';
  root.querySelector('.gpct').textContent = Math.round(v / 10) + '%';
}

// grille de constance (cases qui se remplissent)
const GRID_STATES = 'CPCCPCCMCC' + 'PCCCMCCPCC' + 'CCPCCCPCCC';
function gridCard(id, left, top, w, cols = 10, n = 30, size = 0) {
  const gap = 14, pad = 36, sq = size || (w - 2 * pad - (cols - 1) * gap) / cols, rows = Math.ceil(n / cols);
  const h = pad * 2 + 70 + rows * sq + (rows - 1) * gap;
  let html = `<div class="grid" id="${id}" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px">
    <div style="position:absolute;left:${pad}px;top:${pad}px" class="gt">Constance</div><div style="position:absolute;right:${pad}px;top:${pad + 7}px" class="gs">30 derniers jours</div>`;
  for (let i = 0; i < n; i++) {
    const x = pad + (i % cols) * (sq + gap), y = pad + 70 + Math.floor(i / cols) * (sq + gap);
    const st = GRID_STATES[i % GRID_STATES.length];
    html += `<div class="sq" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${sq.toFixed(1)}px;height:${sq.toFixed(1)}px"><i style="background:${st === 'C' ? '#1F9D63' : st === 'P' ? '#D9A94E' : '#CBC3F6'}"></i></div>`;
  }
  return html + '</div>';
}
function drawGrid(root, t, t0, step = .05) {
  root.querySelectorAll('.sq i').forEach((q, i) => {
    const a = P(t, t0 + i * step, .4, E.outB2);
    T(q, { s: lerp(.3, 1, a), op: P(t, t0 + i * step, .12) });
  });
}

// étape « Bilan de ta journée » (convenances du sommeil)
function sleepStepScreen(id) {
  return `<div class="layer" id="${id}" style="background:var(--bg)"><div class="gs-h"><div class="k">Avant de dormir · +15 XP</div><div class="t">Convenances du sommeil</div></div>
    <div class="gs-b"><div class="l">Étape 1 / 5</div><div class="e">📋</div><div class="tt">Bilan de ta journée</div>
    <div class="d">Qu'as-tu accompli ? Qu'as-tu manqué ? Sois honnête, sans sévérité excessive.</div></div><div class="gs-f">Suivant →</div></div>`;
}
