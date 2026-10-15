// Écrans de l'app recréés en HTML (560×1214), textes repris de l'app : à mettre dans makePhone([...]) comme calques.
// Chaque écran a une fonction de construction (HTML) et une fonction draw…(root, …) appelée à chaque image (fonction pure de t).
// À charger après engine.js et screens.js ; styles dans ecrans.css.
'use strict';
const OKSVG = '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>';
const NAV = on => `<div class="e-nav">${['Accueil', 'Invocations', 'Groupes', 'Profil'].map(n => `<b class="${n === on ? 'on' : ''}"><i></i>${n}</b>`).join('')}</div>`;
const nb = s => String(s).replace(/ ﷺ/g, '\u00A0ﷺ');   // « ﷺ » jamais seul en début de ligne
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// invocations communes matin / soir (ADHKAR de l'app, dans l'ordre)
const ADHKAR_SOIR = [
  { ar: 'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ', ph: 'Astaghfiru llaha lladhi la ilaha illa Huwa l-Hayyu l-Qayyumu wa atubu ilayh',
    fr: "Je demande pardon à Allah, Celui en dehors duquel il n'y a pas de divinité, le Vivant, le Subsistant, et je me repens à Lui.", n: 3, src: 'Abu Dawud & Tirmidhi' },
  { ar: 'حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ', ph: "Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbu l-'arshi l-'azim",
    fr: "Allah me suffit. Nul dieu que Lui. En Lui je place ma confiance. Il est le Seigneur du Trône immense.", n: 7, src: 'Abu Dawud' },
  { ar: 'اللَّهُمَّ أَجِرْنِي مِنَ النَّارِ', ph: 'Allahumma ajirni mina n-nar', fr: 'Ô Allah, préserve-moi du Feu.', n: 7, src: "Abu Dawud & Nasa'i" },
];

// les trois dernières de la série (8 en tout)
const ADHKAR_FIN = [
  { ar: 'سُورَةُ الْإِخْلَاصِ', ph: 'Qul Huwa llahu Ahad, Allahu s-Samad, lam yalid wa lam yulad, wa lam yakun lahu kufuwan ahad',
    fr: "Sourate Al-Ikhlas — Dis : Il est Allah, Unique. Allah, le Seul à qui on s'adresse. Il n'engendre pas et n'est pas engendré. Et nul n'est égal à Lui.", n: 10, src: 'Coran 112' },
  { ar: 'سُورَةُ الْفَلَقِ + سُورَةُ النَّاسِ', ph: "Qul a'udhu bi Rabbi l-falaq... / Qul a'udhu bi Rabbi n-nas...", fr: 'Sourate Al-Falaq + Sourate An-Nas — les deux protections.', n: 3, src: 'Coran 113-114' },
  { ar: 'سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ', ph: "SubhanAllahi l-'azimi wa bihamdih", fr: "Gloire à Allah l'Immense et louange à Lui.", n: 3, src: 'Bukhari & Muslim' },
];

// ───────── accueil ─────────
// o = { hello, name, chip, sections: [{ label, items: [{ e, t, xp }] }] }
function scrAccueil(id, o) {
  let n = 0;
  const secs = o.sections.map(s => `<div class="sec">${s.label}</div>` + s.items.map(it => `<div class="row e-card" data-i="${n++}"><div class="tile">${it.e}</div>
      <div class="tt">${nb(it.t)}<br><span class="e-xp">+${it.xp} XP</span></div><div class="e-ok"><i>${OKSVG}</i></div></div>`).join('')).join('');
  return `<div class="e e-acc" id="${id}"><div class="e-pad hello"><div class="s">${o.hello || 'Sabāḥ al-khayr,'}</div><div class="e-h1 n">${o.name}</div></div>
    <div class="e-pad prog e-card"><div class="ring"><svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="36" fill="none" stroke="#FAEEDA" stroke-width="9"/>
      <circle class="arc" cx="42" cy="42" r="36" fill="none" stroke="#BA7517" stroke-width="9" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg><b class="rn">${n}</b></div>
      <div><div class="t">Encore ${n} actions</div><div class="u">Continue, tu progresses bien</div></div></div>
    ${o.chip ? `<div class="e-pad jchip"><span>${o.chip}</span></div>` : ''}
    <div class="e-pad list" style="top:${o.chip ? 440 : 380}px">${secs}</div>${NAV('Accueil')}</div>`;
}
// done : liste des instants où chaque action est cochée (dans l'ordre des lignes) ; now : index de la ligne « Maintenant »
function drawAccueil(root, t, done, now = -1) {
  const rows = root.querySelectorAll('.row'), n = rows.length;
  let k = 0;
  rows.forEach((r, i) => {
    const a = done[i] !== undefined ? P(t, done[i], .35, E.outB2) : 0;
    if (a > .5) k++;
    T(r.querySelector('.e-ok i'), { s: lerp(.4, 1, a), op: P(t, done[i] ?? 1e9, .12) });
    r.classList.toggle('now', i === now && a < .5);
    r.style.opacity = a > .5 ? '.62' : '1';
  });
  const left = n - k;
  root.querySelector('.rn').textContent = left;
  root.querySelector('.arc').style.strokeDashoffset = (1 - k / n).toFixed(4);
  root.querySelector('.prog .t').textContent = left ? `Encore ${left} action${left > 1 ? 's' : ''}` : 'Journée complète ✨';
  root.querySelector('.prog .u').textContent = left ? 'Continue, tu progresses bien' : 'Petit, mais constant.';
}

// ───────── invocations (série du soir / du matin) ─────────
// o = { tab: 'Soir'|'Matin', items: ADHKAR_SOIR, start: index de la première carte affichée }
function scrInvoc(id, o) {
  const items = o.items || ADHKAR_SOIR, total = o.total || 8, lab = o.tab === 'Matin' ? 'SÉRIE DU MATIN' : 'SÉRIE DU SOIR';
  const cards = items.map((it, i) => `<div class="icard e-card" data-i="${i}"><div class="hd"><div class="cnt"><span>${it.n}</span><i>${OKSVG}</i></div>
      <div><div class="kk">ADHKAR · ${String(i + 1 + (o.base || 0)).padStart(2, '0')}</div><div class="tt">${o.tab === 'Matin' ? 'Adhkar du matin' : 'Adhkar du soir'}</div></div></div>
      <div class="ar">${it.ar}</div><div class="ph">${it.ph}</div><div class="fr">${it.fr}</div><div class="ft"><span>${it.src}</span><b>× ${it.n}</b></div></div>`).join('');
  return `<div class="e e-inv" id="${id}" data-total="${total}"><div class="e-pad top"><div><div class="e-k">Aujourd'hui</div><div class="e-h1">Invocations</div></div>
      <div class="r">${o.tab.toUpperCase()}<span>${total} séries</span></div></div>
    <div class="e-pad tabs">${['Matin', 'Soir', 'Dhikr'].map(n => `<b class="${n === o.tab ? 'on' : ''}">${n === 'Matin' ? '🌅' : n === 'Soir' ? '🌙' : '📿'} ${n}</b>`).join('')}</div>
    <div class="e-pad serie"><div class="k">${lab}</div><div class="v"><span class="sd">${o.base || 0}</span> / ${total} invocations</div><div class="bar"><i style="width:0"></i></div><div class="pill"><span class="sd">${o.base || 0}</span>/${total}</div></div>
    <div class="e-pad tip">Tape une carte à chaque récitation — le compteur descend jusqu'au ✓.</div>
    <div class="e-pad stack">${cards}<div class="done" style="opacity:0"><div class="big">${OKSVG}</div><div class="t">${o.doneTitle || 'Invocations du soir ✓'}</div><div class="s">${o.doneSub || 'Que Allah l\'accepte de toi.'}</div></div></div>${NAV('Invocations')}</div>`;
}
// taps : instants des touchers (ils descendent les compteurs carte après carte) ; base : séries déjà faites avant ces cartes
function drawInvoc(root, t, taps, base = 0) {
  const cards = Array.from(root.querySelectorAll('.icard'));
  const reps = cards.map(c => +c.querySelector('.cnt span').textContent || 0);
  if (!root.__reps) root.__reps = reps;
  const R = root.__reps;
  let tapIdx = 0; const fin = [];
  R.forEach((n, i) => { tapIdx += n; fin[i] = taps[tapIdx - 1]; });
  const nTap = taps.filter(x => x <= t).length;
  let used = 0, doneCards = 0;
  cards.forEach((c, i) => {
    const n = R[i], mine = clamp(nTap - used, 0, n); used += n;
    const f = fin[i] !== undefined ? fin[i] : 1e9;
    if (t >= f) doneCards++;
    c.querySelector('.cnt span').textContent = n - mine;
    T(c.querySelector('.cnt i'), { s: lerp(.4, 1, P(t, f, .3, E.outB2)), op: P(t, f, .1) });
    // la carte terminée s'envole vers le haut, la suivante prend sa place
    const out = P(t, f + .45, .45, E.inC), prevF = i ? (fin[i - 1] ?? 1e9) : -1e9, inn = P(t, prevF + .55, .45, E.outC);
    const press = taps.some(x => t >= x && t < x + .16 && x <= f && x > prevF) ? .985 : 1;
    T(c, { y: lerp(60, 0, inn) - 700 * out, s: press * lerp(.96, 1, inn), op: (i === 0 ? 1 : inn) * (1 - out) });
  });
  root.querySelectorAll('.sd').forEach(s => { s.textContent = base + doneCards; });
  const total = +root.dataset.total;
  root.querySelector('.serie .bar i').style.width = (100 * (base + doneCards) / total).toFixed(1) + '%';
  const last = fin[cards.length - 1] ?? 1e9, d = root.querySelector('.done');
  T(d, { s: lerp(.85, 1, P(t, last + .7, .5, E.outB)), op: P(t, last + .7, .25) });
}

// ───────── séance de dhikr : réglage des durées ─────────
function scrDhikrSetup(id) {
  const rows = [['🤲', 'Istighfar', 'La demande de pardon'], ['💚', 'Salawat', 'La prière sur le Prophète ﷺ'], ['☝️', 'Tahlil', 'Le meilleur dhikr']];
  return `<div class="e e-ds" id="${id}"><div class="e-pad hd"><div class="e-h1">Séance de dhikr</div><div class="s">Définis la durée pour chaque invocation</div></div>
    <div class="e-pad rows">${rows.map((r, i) => `<div class="row e-card"><div class="em">${r[0]}</div><div class="tt">${r[1]}<span>${r[2]}</span></div>
      <div class="ctl"><b>−</b><div class="m" data-i="${i}">5 min</div><b>+</b></div></div>`).join('')}</div>
    <div class="e-pad tot">Total<b class="tt2">15 min</b></div><div class="e-cta" style="bottom:150px">▶ Commencer la séance</div>${NAV('Invocations')}</div>`;
}
function drawDhikrSetup(root, mins) {
  root.querySelectorAll('.m').forEach((m, i) => { m.textContent = mins[i] + ' min'; });
  root.querySelector('.tt2').textContent = mins.reduce((a, b) => a + b, 0) + ' min';
}

// ───────── groupe de dhikr collectif ─────────
// o = { name, dhikr, ar, goal, code, members: [[initiale, couleur, nom]] }
function scrGroupe(id, o) {
  return `<div class="e e-grp" id="${id}"><div class="e-pad hd"><div class="e-k">Dhikr collectif</div><div class="e-h1" style="font-size:40px">${o.name}</div><div class="s">${o.members.length} membres · en temps réel</div></div>
    <div class="code">${o.code}</div>
    <div class="e-pad main e-card"><div class="dk">${o.dhikr}</div><div class="ar">${o.ar}</div><div class="num">0</div><div class="of">sur ${fmt(o.goal)}</div>
      <div class="bar"><i style="width:0"></i></div><div class="pct">0%</div></div>
    <div class="e-pad mem">${o.members.map((m, i) => `<div class="mrow"><div class="av" style="background:${m[1]}">${m[0]}</div><div class="nm">${m[2]}</div><div class="c" data-i="${i}">0</div></div>`).join('')}</div>
    <div class="e-cta tapb">+1 — Taper</div>${NAV('Groupes')}
    <div class="win"><div class="em">🤍</div><div class="t">Ma sha Allah !</div><div class="s">Objectif atteint — ${fmt(o.goal)}<br>${o.short || o.dhikr}</div></div></div>`;
}
// v : total du groupe ; per : compteurs par membre ; win : progression de l'écran « objectif atteint »
function drawGroupe(root, v, per, goal, win = 0) {
  root.querySelector('.num').textContent = fmt(v);
  root.querySelector('.main .bar i').style.width = (100 * clamp(v / goal)).toFixed(2) + '%';
  root.querySelector('.pct').textContent = Math.round(100 * clamp(v / goal)) + '%';
  root.querySelectorAll('.mrow .c').forEach((c, i) => { c.textContent = fmt(per[i] || 0); });
  T(root.querySelector('.win'), { op: win, s: lerp(1.04, 1, win) });
}

// ───────── Qiyam entre frères ─────────
// o = { name, members: [[initiale, couleur, nom, série, parSemaine, statut|null]], me: index }
function scrQiyam(id, o) {
  return `<div class="e e-qy" id="${id}"><div class="e-pad hd"><div class="e-k">Qiyam al-Layl · ${o.name}</div><div class="e-h1">Prière de la nuit —<br>qui est debout ?</div></div><div class="moon">🌙</div>
    <div class="e-pad defi">Défi semaine — ${o.defi || 3} Qiyam chacun</div>
    <div class="e-pad list">${o.members.map((m, i) => `<div class="mrow${i === o.me ? ' me' : ''}"><div class="av" style="background:${m[1]}">${m[0]}</div>
      <div class="nm">${m[2]}<span>🔥 <b class="sk">${m[3]}</b> j · ${m[4]}/sem</span></div><div class="st${m[5] ? '' : ' no'}">${m[5] ? '✓ Fait à ' + m[5] : 'pas encore'}</div></div>`).join('')}</div>
    <div class="e-cta btn">J'ai fait le Qiyam cette nuit</div>${NAV('Groupes')}</div>`;
}
// ok : 0 → 1 au moment où l'on appuie ; heure : heure affichée
function drawQiyam(root, ok, me, heure, streak) {
  const b = root.querySelector('.btn'), row = root.querySelectorAll('.mrow')[me];
  const on = ok > .5;
  b.classList.toggle('ok', on);
  b.textContent = on ? `✓ Fait à ${heure} — barakAllahu fik` : "J'ai fait le Qiyam cette nuit";
  T(b, { s: 1 - .04 * Math.sin(Math.PI * clamp(ok * 2)) });
  const st = row.querySelector('.st');
  st.className = 'st' + (on ? '' : ' no');
  st.textContent = on ? '✓ Fait à ' + heure : 'pas encore';
  row.querySelector('.sk').textContent = on ? streak + 1 : streak;
}

// ───────── profil ─────────
// o = { name, palier, streak, actifs, semaine, badges: [[icône, nom, sous-titre, verrouillé]] }
function scrProfil(id, o) {
  return `<div class="e e-pro" id="${id}"><div class="head"><div class="k">PROFIL</div><div class="av">${o.name[0]}</div><div class="nm">${o.name}</div>
      <div class="pl"><b>${o.palier}</b><b>🔥 <span class="sk">${o.streak}</span>j</b></div>
      <div class="cs"><span>Constance · 30 derniers jours</span><span><span class="ac">${o.actifs}</span> / 30 jours</span></div><div class="cb"><i style="width:${(100 * o.actifs / 30).toFixed(1)}%"></i></div></div>
    <div class="e-pad stats"><div class="e-card"><div class="ic">✅</div><div class="v ac">${o.actifs}</div><div class="l">Jours actifs</div></div>
      <div class="e-card"><div class="ic" style="background:#FDF0DC">🔥</div><div class="v"><span class="sk">${o.streak}</span>j</div><div class="l">Streak</div></div>
      <div class="e-card"><div class="ic" style="background:#FDF0DC">⚡</div><div class="v">${o.semaine}%</div><div class="l">Semaine</div></div></div>
    <div class="e-pad msg e-card">${o.msg || 'Belle série — ne la brise pas !'}</div>
    <div class="e-pad bt">Badges</div>
    <div class="e-pad badges">${o.badges.map(b => `<div class="e-card${b[3] ? ' lk' : ''}"><div class="ic">${b[0]}</div><div class="n">${b[1]}</div><div class="s">${b[2]}</div></div>`).join('')}</div>${NAV('Profil')}</div>`;
}
function drawProfil(root, streak, actifs, msg) {
  root.querySelectorAll('.sk').forEach(s => { s.textContent = streak; });
  root.querySelectorAll('.ac').forEach(s => { s.textContent = actifs; });
  root.querySelector('.cb i').style.width = (100 * actifs / 30).toFixed(1) + '%';
  if (msg) root.querySelector('.msg').textContent = msg;
}

// ───────── compteur guidé ─────────
// o = { k, title, ar, target, step }
function scrCompteur(id, o) {
  const ms = [];
  for (let v = o.step; v <= o.target; v += o.step) ms.push(`<b data-v="${v}">${v}</b>`);
  return `<div class="e e-cpt" id="${id}"><div class="hd"><div class="k">${o.k}</div><div class="t">${nb(o.title)}</div></div>
    <div class="e-pad ar">${o.ar}</div>
    <div class="circ"><svg viewBox="0 0 360 360"><circle cx="180" cy="180" r="160" fill="#fff" stroke="#FAEEDA" stroke-width="22"/>
      <circle class="arc" cx="180" cy="180" r="160" fill="none" stroke="#BA7517" stroke-width="22" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>
      <div class="v"><b class="cv">0</b><span>sur ${o.target}</span></div></div>
    <div class="e-pad ms">${ms.join('')}</div><div class="e-pad hint">Tape le cercle à chaque récitation</div></div>`;
}
function drawCompteur(root, v, target) {
  root.querySelector('.cv').textContent = Math.floor(v);
  root.querySelector('.arc').style.strokeDashoffset = (1 - clamp(v / target)).toFixed(4);
  root.querySelectorAll('.ms b').forEach(b => b.classList.toggle('on', v >= +b.dataset.v));
}

// ───────── lecture du Coran (chrono) ─────────
// o = { ar, name, desc }
function scrCoran(id, o) {
  return `<div class="e e-qr" id="${id}"><div class="hd"><div class="k">Lecture du Coran · +15 XP</div><div class="t">${o.title || 'Lecture du Coran'}</div></div>
    <div class="e-pad sc e-card"><div class="ar">${o.ar}</div><div class="n">${o.name}</div><div class="d">${o.desc}</div></div>
    <div class="e-pad tm"><b class="cv">00:00</b><span>temps de lecture</span></div><div class="e-cta" style="bottom:90px">Terminer ✓</div></div>`;
}
function drawCoran(root, sec) { root.querySelector('.cv').textContent = mmss(Math.max(0, sec)); }
