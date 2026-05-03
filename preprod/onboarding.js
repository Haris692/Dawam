// ═══ ONBOARDING V3 ═══

let ob3 = {
  page:1, dir:1,
  name:'', city:'',
  prayer:null, coran:null, night:null, situation:null,
  intentions:[], obstacles:[],
  theme:null,
  committed:false, freeForAllah:false, fiOpen:false,
  _notifEndpoint:null
};

const OB3 = {
  GR:'#3B6D11', GD:'#BA7517', BG:'#EDE8DA', CA:'#F5EFE3',
  TX:'#2C1A0E', MU:'#7A5C3E'
};

// ── Entrée ────────────────────────────────────────────────────
function goToOnboarding() {
  const splash = document.getElementById('splash');
  const btn = event?.currentTarget;
  if (btn) { btn.style.transform='scale(.96)'; setTimeout(()=>btn.style.transform='',150); }
  ob3 = { page:1, dir:1, name:'', city:'', prayer:null, coran:null, night:null, situation:null,
          intentions:[], obstacles:[], theme:null, committed:false, freeForAllah:false, fiOpen:false, _notifEndpoint:null };
  if (splash) {
    splash.classList.add('splash-exiting');
    setTimeout(() => { showScreen('onboarding'); ob3Render(); }, 400);
  } else {
    showScreen('onboarding'); ob3Render();
  }
}

// ── Moteur de rendu ───────────────────────────────────────────
// ob3Render() = render complet + animation d'entrée (navigation uniquement)
function ob3Render() {
  const el = document.getElementById('onboarding');
  if (!el) return;
  const cls = ob3.dir >= 0 ? 'ob3-fwd' : 'ob3-bck';
  // 11 pages : P1-P7 questionnaire, P8 thème, P9 résumé, P10 paywall, P11 notifs
  const pages = [null,ob3P1,ob3P2,ob3P3,ob3P4,ob3P5,ob3P6,ob3P7,ob3P8,ob3P9,ob3P10,ob3P11];
  const fn = pages[ob3.page];
  if (!fn) return;
  el.innerHTML = `<div class="ob3-wrap ${cls}">${fn()}</div>`;
}

// ob3Navigate() = anime la sortie, puis render la nouvelle page
function ob3Navigate(newPage, dir) {
  ob3.dir = dir;
  const wrap = document.querySelector('#onboarding .ob3-wrap');
  if (!wrap) { ob3.page = newPage; ob3Render(); return; }
  wrap.classList.add(dir > 0 ? 'ob3-exit-fwd' : 'ob3-exit-bck');
  setTimeout(() => { ob3.page = newPage; ob3Render(); }, 200);
}

// ── Micro-composants ──────────────────────────────────────────
function ob3Dots() {
  const cur = ob3.page - 1;
  let h = '<div class="ob3-dots">';
  // 9 dots : pages 1-9 (P1-P9), P10/P11 post-questionnaire affichent tous les dots en "done"
  for (let i = 0; i < 9; i++) {
    if (i === cur)    h += '<div class="ob3-dot ob3-dot-cur"></div>';
    else if (i < cur) h += '<div class="ob3-dot ob3-dot-done"></div>';
    else              h += '<div class="ob3-dot ob3-dot-idle"></div>';
  }
  return h + '</div>';
}

function ob3Ec(e, s=72) {
  return `<div class="ob3-ec" style="width:${s}px;height:${s}px;font-size:${Math.round(s*.47)}px">${e}</div>`;
}
function ob3Gl(c) { return `<p class="ob3-gl">${c}</p>`; }
function ob3Qb(c) { return `<div class="ob3-qb">${c}</div>`; }

// Radio — onclick utilise ob3SelectRc (mutation DOM, pas de re-render)
function ob3Rc({ emoji, label, sub, val, field }) {
  const sel = ob3[field] === val;
  return `<button class="ob3-rc${sel?' ob3-sel':''}" data-field="${field}" data-val="${val}" onclick="ob3SelectRc(this,'${field}','${val}')">
    <span class="ob3-rc-e">${emoji}</span>
    <div class="ob3-rc-txt"><div class="ob3-rc-lbl">${label}</div><div class="ob3-rc-sub">${sub}</div></div>
    <div class="ob3-radio${sel?' ob3-radio-on':''}">${sel?'<div class="ob3-radio-dot"></div>':''}</div>
  </button>`;
}

// Checkbox — onclick utilise ob3SelectCc (mutation DOM, pas de re-render)
function ob3Cc({ emoji, label, sub, val, field }) {
  const on = ob3[field].includes(val);
  return `<button class="ob3-cc${on?' ob3-sel':''}" data-field="${field}" data-val="${val}" onclick="ob3SelectCc(this,'${field}','${val}')">
    <span class="ob3-rc-e">${emoji}</span>
    <div class="ob3-rc-txt"><div class="ob3-rc-lbl">${label}</div>${sub?`<div class="ob3-rc-sub">${sub}</div>`:''}</div>
    <div class="ob3-chk${on?' ob3-chk-on':''}">${on?`<svg width="11" height="8" viewBox="0 0 11 8"><path d="M1 4L4 7L10 1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}</div>
  </button>`;
}

function ob3Nav(n, total, label='Suivant →', dim=false) {
  return `<div class="ob3-nav">
    <button class="ob3-nav-bk" onclick="ob3Back()">
      <svg width="8" height="13" viewBox="0 0 8 13"><path d="M6 1.5L2 6.5l4 5" stroke="${OB3.MU}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <span class="ob3-nav-ct">${n} / ${total}</span>
    <button class="ob3-nav-nx${dim?' ob3-nav-dim':''}" onclick="ob3Next()">${label}</button>
  </div>`;
}

function ob3Shell(dot, content, label='Suivant →', dim=false) {
  return `<div class="ob3-shell">
    ${ob3Dots()}
    <div class="ob3-body">${content}</div>
    ${ob3Nav(dot+1, 9, label, dim)}
  </div>`;
}

// ── CycleWheel ────────────────────────────────────────────────
function ob3CycleWheel() {
  const cx=100,cy=100,R=62,nr=22;
  const tr=a=>a*Math.PI/180, pt=a=>({x:cx+R*Math.cos(tr(a)),y:cy+R*Math.sin(tr(a))});
  const ns=[{l:'MATIN',e:'🌅',a:-90,d:0},{l:'MIDI',e:'☀️',a:0,d:0},{l:'SOIR',e:'🌆',a:90,d:0},{l:'NUIT',e:'🌙',a:180,d:1}];
  const f=(R-nr-3)/R;
  const arcs=ns.map((n,i)=>{
    const nx=ns[(i+1)%4],p1=pt(n.a),p2=pt(nx.a);
    const s={x:cx+(p1.x-cx)*f,y:cy+(p1.y-cy)*f},e={x:cx+(p2.x-cx)*f,y:cy+(p2.y-cy)*f};
    return `<path d="M ${s.x} ${s.y} A ${R-nr-3} ${R-nr-3} 0 0 1 ${e.x} ${e.y}" fill="none" stroke="${OB3.GD}" stroke-width="1.2" opacity=".5" marker-end="url(#ob3cwa)"/>`;
  }).join('');
  const nsvg=ns.map(n=>{
    const p=pt(n.a);
    return `<g><circle cx="${p.x}" cy="${p.y}" r="${nr}" fill="${n.d?'#1B2B4B':OB3.CA}" stroke="${OB3.GD}" stroke-width=".7" opacity="${n.d?.95:.65}"/>
    <text x="${p.x}" y="${p.y-4}" text-anchor="middle" dominant-baseline="middle" font-size="14">${n.e}</text>
    <text x="${p.x}" y="${p.y+11}" text-anchor="middle" font-family="-apple-system" font-size="6.5" font-weight="700" fill="${n.d?'rgba(255,255,255,0.85)':OB3.TX}" opacity="${n.d?1:.7}" letter-spacing=".6">${n.l}</text></g>`;
  }).join('');
  return `<svg width="200" height="200" viewBox="0 0 200 200">
    <defs><marker id="ob3cwa" markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto"><path d="M1,1L7,4L1,7" fill="none" stroke="${OB3.GD}" stroke-width="1.2" opacity=".65" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${OB3.GD}" stroke-width=".8" stroke-dasharray="4 5" opacity=".2"/>
    ${arcs}
    <circle cx="${cx}" cy="${cy}" r="20" fill="${OB3.CA}" stroke="${OB3.GD}" stroke-width=".7" opacity=".5"/>
    <text x="${cx}" y="${cy-3}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-size="10" fill="${OB3.GD}" opacity=".9">✦</text>
    <text x="${cx}" y="${cy+7}" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system" font-size="6.5" font-weight="700" fill="${OB3.GD}" opacity=".65" letter-spacing=".8">DAWAM</text>
    ${nsvg}
  </svg>`;
}

// ── Boussole ──────────────────────────────────────────────────
function ob3Compass(prayers) {
  const cx=100,cy=100,R=68,nr=22;
  const tr=a=>a*Math.PI/180, pt=a=>({x:cx+R*Math.cos(tr(a)),y:cy+R*Math.sin(tr(a))});
  const PNS=[{id:'fajr',l:'Fajr',a:-90},{id:'dhuhr',l:'Dhuhr',a:-18},{id:'asr',l:'Asr',a:54},{id:'maghrib',l:'Magh.',a:126},{id:'isha',l:'Isha',a:198}];
  const f=(R-nr)/R;
  const arcs=PNS.map((n,i)=>{
    const nx=PNS[(i+1)%5];
    if(!prayers.includes(n.id)||!prayers.includes(nx.id))return '';
    const p1=pt(n.a),p2=pt(nx.a),ar=R-nr;
    const s={x:cx+(p1.x-cx)*f,y:cy+(p1.y-cy)*f},e={x:cx+(p2.x-cx)*f,y:cy+(p2.y-cy)*f};
    return `<path d="M ${s.x} ${s.y} A ${ar} ${ar} 0 0 1 ${e.x} ${e.y}" fill="none" stroke="${OB3.GD}" stroke-width="2.5" opacity=".55" stroke-linecap="round"/>`;
  }).join('');
  const ticks=Array.from({length:20},(_,i)=>{
    const a=tr(i/20*360),ri=R-4,ro=R+2;
    return `<line x1="${cx+ri*Math.cos(a)}" y1="${cy+ri*Math.sin(a)}" x2="${cx+ro*Math.cos(a)}" y2="${cy+ro*Math.sin(a)}" stroke="${OB3.GD}" stroke-width=".6" opacity=".15"/>`;
  }).join('');
  const nsvg=PNS.map(n=>{
    const p=pt(n.a),ac=prayers.includes(n.id);
    return `<g>${ac?`<circle cx="${p.x}" cy="${p.y}" r="${nr+4}" fill="${OB3.GD}" opacity=".12"/>`:''}
    <circle cx="${p.x}" cy="${p.y}" r="${nr}" fill="${ac?OB3.GD:OB3.CA}" stroke="${ac?OB3.GD:'rgba(186,117,23,0.28)'}" stroke-width="1.5"/>
    <text x="${p.x}" y="${p.y+.5}" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system,system-ui" font-size="8.5" font-weight="700" fill="${ac?'#fff':OB3.MU}">${n.l}</text></g>`;
  }).join('');
  return `<svg width="200" height="200" viewBox="0 0 200 200">
    <circle cx="${cx}" cy="${cy}" r="${R+8}" fill="none" stroke="${OB3.GD}" stroke-width=".5" stroke-dasharray="2 6" opacity=".12"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${OB3.GD}" stroke-width=".8" stroke-dasharray="3 5" opacity=".2"/>
    ${ticks}${arcs}${nsvg}
    <circle cx="${cx}" cy="${cy}" r="24" fill="${OB3.CA}" stroke="${OB3.GD}" stroke-width="1" opacity=".45"/>
    <circle cx="${cx}" cy="${cy}" r="20" fill="${OB3.CA}" stroke="${OB3.GD}" stroke-width=".5" opacity=".25"/>
    <text x="${cx}" y="${cy-5}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia,serif" font-size="11" fill="${OB3.GD}" opacity=".85">✦</text>
    <text x="${cx}" y="${cy+6}" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system" font-size="8" font-weight="700" fill="${OB3.MU}" opacity=".8">${prayers.length}/5</text>
  </svg>`;
}

// ── Pages ─────────────────────────────────────────────────────

function ob3P1() {
  const feats=[{e:'🌙',l:'Prières du jour et de la nuit'},{e:'📿',l:'Invocations du matin et du soir'},{e:'📖',l:'Lecture du Coran'},{e:'🌱',l:'Constance — sans pression'}];
  return ob3Shell(0, `
    ${ob3Ec('🕌')}
    <div class="ob3-center">
      ${ob3Gl('Bismillah')}
      <h2 class="ob3-h2">Bienvenue dans Dawam</h2>
      ${ob3Qb("L'enjeu n'est pas d'agir — mais d'accomplir l'action au moment opportun.")}
    </div>
    ${feats.map(f=>`<div class="ob3-feat"><span class="ob3-feat-e">${f.e}</span><span class="ob3-feat-l">${f.l}</span></div>`).join('')}
  `);
}

function ob3P2() {
  const escaped = ob3.name.replace(/"/g,'&quot;');
  return ob3Shell(1, `
    ${ob3Ec('🤲')}
    <div class="ob3-center">
      ${ob3Gl('Fais connaissance')}
      <h2 class="ob3-h2">Comment t'appelles-tu ?</h2>
      ${ob3Qb('Pour personnaliser ton expérience, dis-nous ton prénom.')}
    </div>
    <input id="ob3-name" class="ob3-input${ob3.name?' ob3-input-ok':''}" type="text" value="${escaped}" placeholder="Ton prénom" oninput="ob3SetName(this.value)" autocomplete="off"/>
    ${ob3.name?`<p class="ob3-name-echo">Ahlan, ${ob3.name} — ton programme t'attend.</p>`:''}
  `);
}

function ob3P3() {
  const opts=[
    {id:'few', e:'🌱',l:'Peu ou pas encore',s:'Je commence mon chemin'},
    {id:'some',e:'🌿',l:'2 à 4 prières',   s:'Pas encore les 5 régulièrement'},
    {id:'all', e:'🌳',l:'Les 5 prières',    s:'Régulièrement, alhamdulillah'}
  ];
  const fb=ob3.prayer==='all'?"Alhamdulillah — on consolide ensemble.":ob3.prayer==='some'?"C'est une belle base. On travaille depuis là.":ob3.prayer==='few'?"Chaque grand voyage commence par un pas.":'';
  return ob3Shell(2, `
    ${ob3Ec('🕌')}
    <div class="ob3-center">
      ${ob3Gl('Question 1 sur 5')}
      <h2 class="ob3-h2">La prière</h2>
      ${ob3Qb("Sois honnête avec toi-même — c'est la première étape.")}
    </div>
    ${opts.map(o=>ob3Rc({emoji:o.e,label:o.l,sub:o.s,val:o.id,field:'prayer'})).join('')}
    ${fb?`<p class="ob3-feedback">${fb}</p>`:''}
  `, 'Suivant →', !ob3.prayer);
}

function ob3P4() {
  const opts=[
    {id:'never',    e:'🌱',l:'Pas encore régulier',s:'Je lis peu en ce moment'},
    {id:'sometimes',e:'🌿',l:'Parfois',             s:'Pas encore quotidiennement'},
    {id:'daily',    e:'🌳',l:'Wird quotidien',      s:"J'ai un wird régulier"}
  ];
  return ob3Shell(3, `
    ${ob3Ec('📖')}
    <div class="ob3-center">
      ${ob3Gl('Question 2 sur 5')}
      <h2 class="ob3-h2">Le Coran</h2>
      ${ob3Qb("La lecture quotidienne du Coran est un pilier du programme.")}
    </div>
    ${opts.map(o=>ob3Rc({emoji:o.e,label:o.l,sub:o.s,val:o.id,field:'coran'})).join('')}
  `, 'Suivant →', !ob3.coran);
}

function ob3P5() {
  const opts=[
    {id:'never',    e:'🌱',l:'Pas encore',    s:"Je n'ai pas encore cette habitude"},
    {id:'sometimes',e:'🌿',l:'Parfois',        s:'De temps en temps'},
    {id:'regular',  e:'🌳',l:'Régulièrement', s:'Prière de nuit + programme nocturne'}
  ];
  return ob3Shell(4, `
    ${ob3Ec('🌙')}
    <div class="ob3-center">
      ${ob3Gl('Question 3 sur 5')}
      <h2 class="ob3-h2">La prière de nuit</h2>
      ${ob3Qb("Le pilier fondamental du programme spirituel quotidien.")}
    </div>
    ${opts.map(o=>ob3Rc({emoji:o.e,label:o.l,sub:o.s,val:o.id,field:'night'})).join('')}
  `, 'Suivant →', !ob3.night);
}

function ob3P6() {
  const opts=[
    {id:'active', e:'💼',l:'Actif / Travailleur',s:'Journées chargées, sessions courtes'},
    {id:'student',e:'📚',l:'Étudiant',           s:"Temps d'étude à intégrer au programme"},
    {id:'family', e:'🏠',l:'En famille',         s:'Actes relationnels inclus dans le parcours'}
  ];
  return ob3Shell(5, `
    ${ob3Ec('🧭')}
    <div class="ob3-center">
      ${ob3Gl('Question 4 sur 5')}
      <h2 class="ob3-h2">Ta situation de vie</h2>
      ${ob3Qb("Pour adapter ton parcours à ton rythme de vie.")}
    </div>
    ${opts.map(o=>ob3Rc({emoji:o.e,label:o.l,sub:o.s,val:o.id,field:'situation'})).join('')}
  `, 'Suivant →', !ob3.situation);
}

// P7 : intentions + obstacles fusionnés (était P7 + P8)
function ob3P7() {
  const intentOpts=[
    {id:'rapprochement',e:'💚',l:"Me rapprocher d'Allah", s:'Renforcer mon lien et ma dévotion'},
    {id:'habitudes',    e:'🌱',l:'Bâtir des habitudes',   s:'Être constant dans mes adorations'},
    {id:'serenite',     e:'🕊️',l:'Trouver la sérénité',  s:'Paix du cœur et équilibre intérieur'},
    {id:'apprendre',    e:'📚',l:'Apprendre ma religion', s:"Mieux comprendre et pratiquer l'Islam"}
  ];
  const obstOpts=[
    {id:'temps',       e:'⏰',l:'Manque de temps',s:'Les journées sont trop chargées'},
    {id:'regularite',  e:'🔄',l:'Régularité',     s:"J'oublie ou je procrastine"},
    {id:'connaissance',e:'📚',l:'Connaissance',   s:"Je ne sais pas comment pratiquer"},
    {id:'motivation',  e:'💤',l:'Motivation',     s:"Je manque d'élan au quotidien"}
  ];
  return ob3Shell(6, `
    ${ob3Ec('🎯')}
    <div class="ob3-center">
      ${ob3Gl('Question 5 sur 5')}
      <h2 class="ob3-h2">Tes intentions</h2>
      ${ob3Qb("Choisis une ou plusieurs — elles guideront ton message quotidien.")}
    </div>
    ${intentOpts.map(o=>ob3Cc({emoji:o.e,label:o.l,sub:o.s,val:o.id,field:'intentions'})).join('')}
    ${ob3Gl("Qu'est-ce qui te freine ?")}
    ${obstOpts.map(o=>ob3Cc({emoji:o.e,label:o.l,sub:o.s,val:o.id,field:'obstacles'})).join('')}
  `, 'Suivant →', ob3.intentions.length===0);
}

const OB3_THEMES=[
  {id:'sable',    n:'Sable doré',  e:'✦', bg:'#EDE8DA',a1:'#BA7517',a2:'#3B6D11'},
  {id:'foret',    n:'Forêt',       e:'🌿',bg:'#E2EDD8',a1:'#3B6D11',a2:'#6B8A4E'},
  {id:'ocean',    n:'Océan',       e:'🌊',bg:'#D8E8ED',a1:'#1B5E8A',a2:'#4A9B8E'},
  {id:'turquoise',n:'Turquoise',   e:'💎',bg:'#D8EDEB',a1:'#0F7170',a2:'#3B6D11'},
  {id:'lavande',  n:'Lavande',     e:'💜',bg:'#EAE0ED',a1:'#6B4C8A',a2:'#BA7517'},
  {id:'grenat',   n:'Grenat',      e:'❤️',bg:'#EDE0E0',a1:'#8A1C1C',a2:'#3B6D11'},
  {id:'ardoise',  n:'Ardoise',     e:'🩶',bg:'#E0E3E8',a1:'#3A4A5E',a2:'#BA7517'},
  {id:'rose',     n:'Rose désert', e:'🌸',bg:'#EDE0E5',a1:'#8A3A5E',a2:'#BA7517'},
  {id:'nuit',     n:'Nuit étoilée',e:'🌙',bg:'#1B2038',a1:'#C4A855',a2:'#4A7CB0'},
];

// P8 : thème (était P9)
function ob3P8() {
  const grid=OB3_THEMES.map(t=>{
    const sel=ob3.theme===t.id;
    return `<button class="ob3-tcard${sel?' ob3-tcard-sel':''}" data-theme="${t.id}" onclick="ob3SetTheme('${t.id}')">
      ${sel?`<div class="ob3-tcard-chk"><svg width="9" height="7" viewBox="0 0 9 7"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`:''}
      <div class="ob3-tcard-bg" style="background:${t.bg};border-color:${t.a1}44">${t.e}</div>
      <div class="ob3-tcard-dots"><div style="background:${t.a1}"></div><div style="background:${t.a2}"></div></div>
      <span class="ob3-tcard-name">${t.n}</span>
    </button>`;
  }).join('');
  return ob3Shell(7, `
    ${ob3Ec('🎨')}
    <div class="ob3-center">
      ${ob3Gl('Personnalise')}
      <h2 class="ob3-h2">Choisis ton thème</h2>
      ${ob3Qb("Tu pourras le changer à tout moment depuis ton profil.")}
    </div>
    <div class="ob3-tgrid">${grid}</div>
  `, 'Suivant →', !ob3.theme);
}

// P9 : résumé profil animé (était P10)
function ob3P9() {
  const t = OB3_THEMES.find(x => x.id === ob3.theme) || OB3_THEMES[0];

  const prayerLevel = ob3.prayer === 'all' ? '🌳' : ob3.prayer === 'some' ? '🌿' : '🌱';
  const levelLabel  = ob3.prayer === 'all' ? 'Engagé' : ob3.prayer === 'some' ? 'En chemin' : 'Au commencement';
  const prayerMsg   = ob3.prayer === 'all'
    ? "Tu pries les 5 — consolidons avec la constance."
    : ob3.prayer === 'some'
      ? "Tu as un rythme — ancrons-le durablement."
      : "Tu commences le chemin — c'est le pas le plus courageux.";

  const intentionLabels = { rapprochement:"Se rapprocher d'Allah", habitudes:"Bâtir des habitudes", serenite:"Trouver la sérénité", apprendre:"Apprendre l'Islam" };
  const situationEmoji  = { active:'💼', student:'📚', family:'🏠' };
  const situationLabel  = { active:'Vie active', student:'Étudiant·e', family:'En famille' };
  const obstacleLabels  = { temps:'manque de temps', regularite:'régularité', connaissance:'connaissance', motivation:'motivation' };

  const tags = [
    { e:prayerLevel, l: ob3.prayer==='all'?'5 prières':ob3.prayer==='some'?'2–4 prières':'Début du chemin' },
    ...(ob3.coran && ob3.coran!=='never' ? [{ e:'📖', l: ob3.coran==='daily'?'Wird quotidien':'Coran parfois' }] : []),
    ...(ob3.night && ob3.night!=='never' ? [{ e:'✨', l: ob3.night==='regular'?'Prière de nuit':'Qiyam parfois' }] : []),
    ...(ob3.situation ? [{ e: situationEmoji[ob3.situation]||'🧭', l: situationLabel[ob3.situation]||'' }] : []),
    ...ob3.intentions.slice(0,2).map(id => ({ e:'🎯', l: intentionLabels[id]||id })),
  ];
  const obstacleText = ob3.obstacles.length
    ? `On va t'aider avec ton ${ob3.obstacles.slice(0,2).map(o=>obstacleLabels[o]).join(' et ton ')}.`
    : '';

  const isDark = ob3.theme === 'nuit';
  const tx = isDark ? '#e8d5a3' : '#2C1A0E';
  const mu = isDark ? 'rgba(232,213,163,0.65)' : '#7A5C3E';

  const html = `<style>
.p9{height:100%;display:flex;flex-direction:column;background:${t.bg};position:relative;overflow:hidden}
.p9-blob1{position:absolute;top:-100px;right:-80px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle at 35% 35%,${t.a1}20 0%,transparent 65%);pointer-events:none}
.p9-blob2{position:absolute;bottom:-60px;left:-70px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle at 65% 65%,${t.a2}18 0%,transparent 70%);pointer-events:none}
.p9-top{display:flex;align-items:center;padding:18px 20px 0;gap:4px}
.p9-back{background:none;border:none;cursor:pointer;padding:6px;flex-shrink:0}
.p9-top-dots{flex:1;display:flex;justify-content:center}
.p9-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.p9-hero{padding:28px 24px 0;position:relative;z-index:1}
.p9-ey{font-size:10.5px;font-weight:700;letter-spacing:2.5px;color:${t.a1};text-transform:uppercase;margin:0 0 16px}
.p9-badge{display:inline-flex;align-items:center;gap:9px;background:${t.a1}1c;border:1.5px solid ${t.a1}50;border-radius:40px;padding:7px 18px 7px 11px;margin-bottom:20px}
.p9-badge-e{font-size:24px;line-height:1}
.p9-badge-l{font-size:13px;font-weight:700;color:${t.a1}}
.p9-title{font-family:Georgia,'Times New Roman',serif;font-size:27px;font-weight:700;color:${tx};line-height:1.28;margin:0 0 10px}
.p9-title-name{color:${t.a1}}
.p9-sub{font-size:13.5px;color:${mu};line-height:1.65;margin:0 0 22px}
.p9-sep{height:1px;background:linear-gradient(to right,${t.a1}55,${t.a2}25,transparent);margin:4px 24px 22px}
.p9-tl{padding:0 24px}
.p9-tl-lbl{font-size:10.5px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${mu};margin:0 0 12px}
.p9-tags{display:flex;flex-wrap:wrap;gap:8px}
.p9-tag{display:inline-flex;align-items:center;gap:6px;background:${isDark?'rgba(255,255,255,0.07)':t.bg};border:1.5px solid ${t.a1}44;border-radius:20px;padding:7px 14px;font-size:13px;font-weight:500;color:${tx};box-shadow:0 2px 10px ${t.a1}10}
.p9-obst{margin:14px 24px 0;padding:12px 16px;background:${t.a1}0e;border-left:3px solid ${t.a1}80;border-radius:0 10px 10px 0;font-size:13px;color:${mu};line-height:1.6}
.p9-orn{display:flex;justify-content:center;padding:22px 0 6px}
.p9-cta-zone{padding:16px 24px 36px}
.p9-cta{width:100%;padding:17px;background:${t.a1};color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;letter-spacing:.3px;box-shadow:0 6px 24px ${t.a1}44}
</style>
<div class="p9">
  <div class="p9-blob1"></div>
  <div class="p9-blob2"></div>
  <div class="p9-top">
    <button class="p9-back" onclick="ob3Back()">
      <svg width="8" height="13" viewBox="0 0 8 13"><path d="M6 1.5L2 6.5l4 5" stroke="${mu}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="p9-top-dots">${ob3Dots()}</div>
    <div style="width:20px"></div>
  </div>
  <div class="p9-scroll">
    <div class="p9-hero">
      <p class="p9-ey" id="p9ey">✦ Ton profil Dawam</p>
      <div class="p9-badge" id="p9badge">
        <span class="p9-badge-e">${prayerLevel}</span>
        <span class="p9-badge-l">${levelLabel}</span>
      </div>
      <h2 class="p9-title" id="p9title">${ob3.name?`<span class="p9-title-name">${ob3.name}</span>,<br>Dawam est fait pour toi`:'Dawam est<br>fait pour toi'}</h2>
      <p class="p9-sub" id="p9sub">${prayerMsg}</p>
    </div>
    <div class="p9-sep" id="p9sep"></div>
    <div class="p9-tl">
      <p class="p9-tl-lbl" id="p9tlbl">Ton profil</p>
      <div class="p9-tags">
        ${tags.map((tag,i)=>`<div class="p9-tag" id="p9tag${i}"><span>${tag.e}</span><span>${tag.l}</span></div>`).join('')}
      </div>
      ${obstacleText?`<div class="p9-obst" id="p9obst">${obstacleText}</div>`:''}
    </div>
    <div class="p9-orn" id="p9orn">
      <svg id="p9ornsvg" width="80" height="80" viewBox="0 0 80 80" style="transform-origin:50% 50%">
        <circle cx="40" cy="40" r="34" fill="none" stroke="${t.a1}" stroke-width="1" stroke-dasharray="5 8" opacity=".3"/>
        <circle cx="40" cy="40" r="24" fill="none" stroke="${t.a1}" stroke-width=".6" stroke-dasharray="3 5" opacity=".2"/>
        <circle cx="40" cy="40" r="14" fill="${t.a1}18" stroke="${t.a1}" stroke-width=".8" opacity=".35"/>
        <text x="40" y="46" text-anchor="middle" font-family="Georgia,serif" font-size="19" fill="${t.a1}" opacity=".75">✦</text>
        <circle cx="40" cy="6"  r="3" fill="${t.a1}" opacity=".4"/>
        <circle cx="74" cy="40" r="3" fill="${t.a1}" opacity=".4"/>
        <circle cx="40" cy="74" r="3" fill="${t.a1}" opacity=".4"/>
        <circle cx="6"  cy="40" r="3" fill="${t.a1}" opacity=".4"/>
        <circle cx="69" cy="11" r="2" fill="${t.a2}" opacity=".35"/>
        <circle cx="69" cy="69" r="2" fill="${t.a2}" opacity=".35"/>
        <circle cx="11" cy="69" r="2" fill="${t.a2}" opacity=".35"/>
        <circle cx="11" cy="11" r="2" fill="${t.a2}" opacity=".35"/>
      </svg>
    </div>
    <div class="p9-cta-zone" id="p9cta">
      <button class="p9-cta" onclick="ob3Next()">Voir mon programme →</button>
    </div>
  </div>
</div>`;

  requestAnimationFrame(() => {
    if (typeof gsap === 'undefined') return;

    gsap.set(['#p9ey','#p9badge','#p9title','#p9sub','#p9sep','#p9tlbl','#p9orn','#p9cta'], { opacity:0 });
    gsap.set('#p9badge',  { scale:0.82, y:8 });
    gsap.set('#p9title',  { y:14 });
    gsap.set('#p9sub',    { y:8 });
    gsap.set('#p9orn',    { scale:0.6, rotation:-25 });
    gsap.set('#p9cta',    { y:18 });
    gsap.set('[id^=p9tag]', { opacity:0, scale:0.86, y:10 });
    if (document.getElementById('p9obst')) gsap.set('#p9obst', { opacity:0, x:-10 });

    const tl = gsap.timeline({ defaults:{ ease:'power3.out' } });
    tl.to('#p9ey',       { opacity:1, duration:0.5, delay:0.08 })
      .to('#p9badge',    { opacity:1, scale:1, y:0, duration:0.65, ease:'back.out(1.9)' }, '-=0.2')
      .to('#p9title',    { opacity:1, y:0, duration:0.72 }, '-=0.35')
      .to('#p9sub',      { opacity:1, y:0, duration:0.55 }, '-=0.45')
      .to('#p9sep',      { opacity:1, duration:0.65 }, '-=0.3')
      .to('#p9tlbl',     { opacity:1, duration:0.4 }, '-=0.35')
      .to('[id^=p9tag]', { opacity:1, scale:1, y:0, duration:0.42, stagger:0.07, ease:'back.out(1.5)' }, '-=0.25')
      .to('#p9obst',     { opacity:1, x:0, duration:0.5 }, '-=0.15')
      .to('#p9orn',      { opacity:1, scale:1, rotation:0, duration:1.1, ease:'power2.out' }, '-=0.65')
      .to('#p9cta',      { opacity:1, y:0, duration:0.7, ease:'power2.out' }, '-=0.6');

    gsap.to('#p9ornsvg', { rotation:360, duration:28, repeat:-1, ease:'none', transformOrigin:'50% 50%' });
    gsap.to('#p9badge',  { scale:1.035, duration:2.4, repeat:-1, yoyo:true, ease:'sine.inOut', delay:2 });
  });

  return html;
}

// P10 : programme + paywall animé (était P11)
function ob3P10() {
  const t = OB3_THEMES.find(x => x.id === ob3.theme) || OB3_THEMES[0];
  const isDark = ob3.theme === 'nuit';
  const tx = isDark ? '#e8d5a3' : '#2C1A0E';
  const mu = isDark ? 'rgba(232,213,163,0.65)' : '#7A5C3E';

  const prayers = ob3.prayer==='all'?['fajr','dhuhr','asr','maghrib','isha']:ob3.prayer==='some'?['fajr','dhuhr','asr']:[];
  const lv = ob3.prayer==='all'
    ?{e:'🌳',l:'Engagé',          s:'Tes 5 prières sont ta boussole.'}
    :ob3.prayer==='some'
      ?{e:'🌿',l:'En chemin',     s:'Tu as de belles habitudes. Unifions-les.'}
      :{e:'🌱',l:'Au commencement',s:'Chaque grand voyage commence par un pas.'};

  const items=[
    ...(ob3.prayer!=='few'?[{e:'🕌',l:"Séance après l'aube",s:'Après le Fajr'}]:[]),
    {e:'🌿',l:'Invocations du matin',s:'Adhkar du matin'},
    ...(ob3.coran&&ob3.coran!=='never'?[{e:'📖',l:'Lecture du Coran',s:ob3.coran==='daily'?'Wird quotidien':'5 min par jour'}]:[]),
    {e:'🌙',l:'Invocations du soir',s:'Après Maghrib'},
    ...(ob3.night==='regular'||ob3.night==='sometimes'?[{e:'✨',l:'Prière de nuit',s:'Witr + tahajjud'}]:[]),
    {e:'😴',l:'Convenances du sommeil',s:'Avant de dormir'},
  ];

  const stepsHtml = items.map((it,i) => `
    <div class="p10-step" id="p10s${i}">
      <div class="p10-step-track">
        <div class="p10-step-dot">${it.e}</div>
        ${i < items.length-1 ? `<div class="p10-step-line"></div>` : ''}
      </div>
      <div class="p10-step-body">
        <div class="p10-step-l">${it.l}</div>
        <div class="p10-step-s">${it.s}</div>
      </div>
    </div>`).join('');

  const fiHtml = ob3.freeForAllah
    ? `<div class="ob3-fi-granted">
        <span style="font-size:22px">✨</span>
        <div><div class="ob3-fi-granted-t">Accès gratuit accordé</div><div class="ob3-fi-granted-s">Qu'Allah accepte ta sincerité et te facilite la constance.</div></div>
      </div>`
    : ob3.fiOpen
      ? `<div class="ob3-fi-open">
          <div class="ob3-fi-open-hd"><span style="font-size:20px">🤲</span><div class="ob3-fi-open-ttl">Accès fi sabilillah</div></div>
          <p class="ob3-fi-open-bd">Si tu n'as pas les moyens financiers ou si tu t'engages sincèrement à utiliser Dawam pour te rapprocher d'Allah, nous t'offrons l'accès gratuitement.</p>
          <div class="ob3-fi-pledge">"Je m'engage à utiliser Dawam sincèrement, pour l'amour d'Allah, et non par habitude ou par distraction."</div>
          <div class="ob3-fi-btns">
            <button class="ob3-fi-cancel" onclick="ob3CloseFi()">Annuler</button>
            <button class="ob3-fi-accept" onclick="ob3AcceptFi()">J'accepte cet engagement</button>
          </div>
        </div>`
      : `<button class="ob3-fi-btn" onclick="ob3OpenFi()">
          <span style="font-size:17px;flex-shrink:0">🤲</span>
          <div><div class="ob3-fi-btn-t">Accès gratuit fi sabilillah</div><div class="ob3-fi-btn-s">Pour ceux qui s'engagent pour Allah</div></div>
          <svg width="7" height="12" viewBox="0 0 7 12" style="margin-left:auto;flex-shrink:0"><path d="M1 1l5 5-5 5" stroke="${t.a1}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>`;

  const ctaLabel = ob3.committed
    ? (ob3.freeForAllah ? 'Continuer — fi sabilillah ♥' : "Commencer l'essai gratuit →")
    : "Je m'engage pour activer";

  const html = `<style>
.p10{height:100%;display:flex;flex-direction:column;background:${t.bg};position:relative;overflow:hidden}
.p10-bg1{position:absolute;top:-70px;left:-60px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,${t.a1}18 0%,transparent 70%);pointer-events:none}
.p10-bg2{position:absolute;bottom:80px;right:-50px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,${t.a2}14 0%,transparent 70%);pointer-events:none}
.p10-top{display:flex;align-items:center;padding:18px 20px 0;gap:4px}
.p10-back{background:none;border:none;cursor:pointer;padding:6px;flex-shrink:0}
.p10-top-dots{flex:1;display:flex;justify-content:center}
.p10-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:16px}
/* Hero compass */
.p10-hero{display:flex;flex-direction:column;align-items:center;padding:20px 24px 0;position:relative;z-index:1}
.p10-compass-glow{position:absolute;width:210px;height:210px;border-radius:50%;background:radial-gradient(circle,${t.a1}1e 0%,transparent 65%);pointer-events:none;top:12px}
.p10-title{font-family:Georgia,'Times New Roman',serif;font-size:19px;font-weight:700;color:${tx};text-align:center;margin:14px 0 4px;line-height:1.3}
.p10-title span{color:${t.a1}}
.p10-lvbadge{display:inline-flex;align-items:center;gap:9px;background:${t.a1}1c;border:1.5px solid ${t.a1}4a;border-radius:32px;padding:7px 18px 7px 11px;margin-top:10px}
.p10-lvbadge-e{font-size:21px;line-height:1}
.p10-lvbadge-name{font-size:12.5px;font-weight:700;color:${t.a1}}
.p10-lvbadge-sub{font-size:11px;color:${mu};margin-top:1px}
/* Separator */
.p10-sep{height:1px;background:linear-gradient(to right,transparent,${t.a1}44,${t.a2}22,transparent);margin:20px 24px 18px}
/* Steps label */
.p10-slbl{font-size:10.5px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${mu};margin:0 24px 14px}
/* Steps timeline */
.p10-step{display:flex;gap:12px;padding:0 24px;position:relative}
.p10-step-track{display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:32px}
.p10-step-dot{width:32px;height:32px;border-radius:50%;background:${t.a1}18;border:1.5px solid ${t.a1}44;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.p10-step-line{flex:1;width:1.5px;background:linear-gradient(to bottom,${t.a1}44,${t.a1}18);margin:4px 0;min-height:14px}
.p10-step-body{flex:1;padding-bottom:16px;padding-top:4px}
.p10-step-l{font-size:13.5px;font-weight:600;color:${tx};margin-bottom:2px}
.p10-step-s{font-size:12px;color:${mu}}
/* Pricing card */
.p10-price{margin:6px 24px 0;border-radius:16px;background:${isDark?'rgba(196,168,85,0.09)':'rgba(255,255,255,0.72)'};border:1.5px solid ${t.a1}30;padding:18px 18px 16px;position:relative;overflow:hidden;backdrop-filter:blur(6px)}
.p10-price-bg{position:absolute;right:-8px;top:-8px;font-size:58px;opacity:.06;line-height:1;pointer-events:none;user-select:none}
.p10-price-lbl{font-size:10px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:${t.a1};margin-bottom:5px}
.p10-price-ttl{font-size:21px;font-weight:800;color:${tx};line-height:1.25;margin-bottom:5px}
.p10-price-ttl em{font-style:normal;color:${t.a1}}
.p10-price-sub{font-size:11.5px;color:${mu};margin-bottom:13px}
/* Répartition de l'abonnement */
.p10-split{margin-top:10px}
.p10-split-ttl{font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${mu};margin-bottom:9px;opacity:.7}
.p10-split-bar{display:flex;height:7px;border-radius:6px;overflow:hidden;gap:2px;margin-bottom:11px}
.p10-split-seg{border-radius:4px;will-change:transform}
.p10-seg1{flex:15;background:#9ca3af}
.p10-seg2{flex:15;background:${t.a2}}
.p10-seg3{flex:70;background:${t.a1}}
.p10-split-rows{display:flex;flex-direction:column;gap:7px}
.p10-split-row{display:flex;align-items:center;gap:8px}
.p10-split-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.p10-dot1{background:#9ca3af}
.p10-dot2{background:${t.a2}}
.p10-dot3{background:${t.a1}}
.p10-split-info{flex:1;display:flex;align-items:center;gap:5px}
.p10-split-lbl{font-size:11.5px;color:${mu}}
.p10-split-pct{font-size:10px;color:${mu};opacity:.55}
.p10-split-amt{font-size:12px;font-weight:600;color:${tx};flex-shrink:0}
.p10-split-row-hi .p10-split-lbl{color:${tx};font-weight:600}
.p10-split-amt-hi{color:${t.a1};font-size:13px;font-weight:700}
.p10-split-dona{font-size:11.5px;font-style:italic;color:${t.a1};text-align:center;margin:12px 0 0;opacity:.85;line-height:1.5}
/* Fi sabilillah */
.p10-fi{margin:12px 24px 0}
.ob3-fi-btn{display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px;background:${isDark?'rgba(255,255,255,0.05)':t.bg};border:1.5px solid ${t.a1}2a;border-radius:12px;cursor:pointer;text-align:left}
.ob3-fi-btn-t{font-size:13px;font-weight:600;color:${tx}}
.ob3-fi-btn-s{font-size:11.5px;color:${mu};margin-top:1px}
/* Commitment */
.p10-commit{margin:12px 24px 0}
.ob3-commit{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;background:${isDark?'rgba(255,255,255,0.04)':t.bg};border:1.5px solid ${t.a1}2a;border-radius:12px;cursor:pointer;width:100%;text-align:left;transition:background .2s,border-color .2s}
.ob3-commit.ob3-commit-on{background:${t.a1}14;border-color:${t.a1}60}
.ob3-commit-chk{width:22px;height:22px;border-radius:6px;border:2px solid ${t.a1}55;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:1px;transition:background .2s,border-color .2s}
.ob3-commit-chk.ob3-commit-chk-on{background:${t.a1};border-color:${t.a1}}
.ob3-commit-txt{font-size:13px;color:${mu};line-height:1.55;font-style:italic;margin:0}
.ob3-commit-echo{font-size:12px;color:${t.a1};text-align:center;margin:8px 24px 0;font-weight:500}
/* CTA fixe en bas */
.ob3-p10-cta{padding:14px 24px 36px;background:${t.bg};border-top:1px solid ${t.a1}18;position:relative;z-index:2}
.ob3-cta{width:100%;padding:17px;background:${t.a1};color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;letter-spacing:.3px;box-shadow:0 6px 24px ${t.a1}44;transition:opacity .25s,box-shadow .25s}
.ob3-cta.ob3-cta-dim{opacity:.38;box-shadow:none}
</style>
<div class="p10">
  <div class="p10-bg1"></div>
  <div class="p10-bg2"></div>

  <div class="p10-top">
    <button class="p10-back" onclick="ob3Back()">
      <svg width="8" height="13" viewBox="0 0 8 13"><path d="M6 1.5L2 6.5l4 5" stroke="${mu}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="p10-top-dots">${ob3Dots()}</div>
    <div style="width:20px"></div>
  </div>

  <div class="p10-scroll">
    <div class="p10-hero" id="p10hero">
      <div class="p10-compass-glow"></div>
      <div id="p10compass">${ob3Compass(prayers)}</div>
      <h2 class="p10-title" id="p10title">Voici ton programme${ob3.name?`, <span>${ob3.name}</span>`:''}.</h2>
      <div class="p10-lvbadge" id="p10lvbadge">
        <span class="p10-lvbadge-e">${lv.e}</span>
        <div>
          <div class="p10-lvbadge-name">${lv.l}</div>
          <div class="p10-lvbadge-sub">${lv.s}</div>
        </div>
      </div>
    </div>

    <div class="p10-sep" id="p10sep"></div>

    <p class="p10-slbl" id="p10slbl">Programme · ${items.length} étapes</p>
    <div id="p10steps">${stepsHtml}</div>

    <div class="p10-price" id="p10price">
      <div class="p10-price-bg">🕌</div>
      <div class="p10-price-lbl">Essai gratuit</div>
      <div class="p10-price-ttl">7 jours gratuits,<br>puis <em>€2,99</em> / mois</div>
      <div class="p10-price-sub">Annulable à tout moment · sans engagement</div>
      <div class="p10-split">
        <div class="p10-split-ttl">Où va ton abonnement</div>
        <div class="p10-split-bar">
          <div class="p10-split-seg p10-seg1" id="p10seg1"></div>
          <div class="p10-split-seg p10-seg2" id="p10seg2"></div>
          <div class="p10-split-seg p10-seg3" id="p10seg3"></div>
        </div>
        <div class="p10-split-rows">
          <div class="p10-split-row">
            <div class="p10-split-dot p10-dot1"></div>
            <div class="p10-split-info"><span class="p10-split-lbl">Plateforme Apple / Google</span><span class="p10-split-pct">15%</span></div>
            <span class="p10-split-amt">€0,45</span>
          </div>
          <div class="p10-split-row">
            <div class="p10-split-dot p10-dot2"></div>
            <div class="p10-split-info"><span class="p10-split-lbl">Infra & communication</span><span class="p10-split-pct">15%</span></div>
            <span class="p10-split-amt">€0,45</span>
          </div>
          <div class="p10-split-row p10-split-row-hi">
            <div class="p10-split-dot p10-dot3"></div>
            <div class="p10-split-info"><span class="p10-split-lbl">Projets communautaires</span><span class="p10-split-pct">70%</span></div>
            <span class="p10-split-amt p10-split-amt-hi">€2,09</span>
          </div>
        </div>
        <p class="p10-split-dona">Ce n'est pas juste un abonnement — c'est un don pour la communauté.</p>
      </div>
    </div>

    <div class="p10-fi" id="p10fi">${fiHtml}</div>

    <div class="p10-commit" id="p10commit">
      <button class="ob3-commit${ob3.committed?' ob3-commit-on':''}" onclick="ob3ToggleCommit(this)">
        <div class="ob3-commit-chk${ob3.committed?' ob3-commit-chk-on':''}">${ob3.committed?`<svg width="12" height="9" viewBox="0 0 12 9"><path d="M1 4.5L4.5 8L11 1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}</div>
        <p class="ob3-commit-txt">"Je m'engage à consacrer quelques minutes par jour à ma pratique spirituelle."</p>
      </button>
      ${ob3.committed?`<p class="ob3-commit-echo">Qu'Allah facilite ton chemin.</p>`:''}
    </div>

    <div style="height:8px"></div>
  </div>

  <div class="ob3-p10-cta" id="p10cta">
    <button class="ob3-cta${ob3.committed?'':' ob3-cta-dim'}" onclick="${ob3.committed?"ob3Navigate(11,1)":''}">${ctaLabel}</button>
  </div>
</div>`;

  requestAnimationFrame(() => {
    if (typeof gsap === 'undefined') return;

    gsap.set(['#p10hero','#p10title','#p10lvbadge','#p10sep','#p10slbl','#p10price','#p10fi','#p10commit','#p10cta'], { opacity:0 });
    gsap.set('#p10compass', { scale:0.88, y:10 });
    gsap.set('#p10title',   { y:10 });
    gsap.set('#p10lvbadge', { scale:0.85, y:6 });
    gsap.set('#p10price',   { y:14, scale:0.97 });
    gsap.set('#p10fi',      { y:10 });
    gsap.set('#p10commit',  { y:10 });
    gsap.set('#p10cta',     { y:12 });
    gsap.set('[id^=p10s]',  { opacity:0, x:-14 });
    gsap.set(['#p10seg1','#p10seg2','#p10seg3'], { scaleX:0, transformOrigin:'left center' });

    const tl = gsap.timeline({ defaults:{ ease:'power3.out' } });
    tl.to('#p10hero',    { opacity:1, duration:0.4, delay:0.05 })
      .to('#p10compass', { scale:1, y:0, duration:0.85, ease:'power2.out' }, '-=0.3')
      .to('#p10title',   { opacity:1, y:0, duration:0.55 }, '-=0.5')
      .to('#p10lvbadge', { opacity:1, scale:1, y:0, duration:0.6, ease:'back.out(1.7)' }, '-=0.4')
      .to('#p10sep',     { opacity:1, duration:0.5 }, '-=0.2')
      .to('#p10slbl',    { opacity:1, duration:0.35 }, '-=0.35')
      .to('[id^=p10s]',  { opacity:1, x:0, duration:0.38, stagger:0.065 }, '-=0.25')
      .to('#p10price',   { opacity:1, y:0, scale:1, duration:0.6, ease:'power2.out' }, '-=0.15')
      .to(['#p10seg1','#p10seg2','#p10seg3'], { scaleX:1, duration:0.55, stagger:0.13, ease:'power2.out' }, '-=0.1')
      .to('#p10fi',      { opacity:1, y:0, duration:0.4 }, '-=0.2')
      .to('#p10commit',  { opacity:1, y:0, duration:0.4 }, '-=0.3')
      .to('#p10cta',     { opacity:1, y:0, duration:0.5, ease:'power2.out' }, '-=0.25');

    gsap.to('#p10lvbadge', { scale:1.03, duration:2.2, repeat:-1, yoyo:true, ease:'sine.inOut', delay:1.8 });
  });

  return html;
}

// ── Mutations DOM directes (pas de re-render) ─────────────────

function ob3SelectRc(el, field, val) {
  ob3[field] = val;
  document.querySelectorAll(`.ob3-rc[data-field="${field}"]`).forEach(btn => {
    const isSel = btn.dataset.val === val;
    btn.classList.toggle('ob3-sel', isSel);
    const r = btn.querySelector('.ob3-radio');
    if (r) { r.classList.toggle('ob3-radio-on', isSel); r.innerHTML = isSel ? '<div class="ob3-radio-dot"></div>' : ''; }
  });
  if (field === 'prayer') {
    const msgs = { all:"Alhamdulillah — on consolide ensemble.", some:"C'est une belle base. On travaille depuis là.", few:"Chaque grand voyage commence par un pas." };
    let fb = document.querySelector('.ob3-feedback');
    if (!fb) {
      fb = document.createElement('p'); fb.className = 'ob3-feedback';
      document.querySelector('.ob3-body')?.appendChild(fb);
    }
    fb.textContent = msgs[val] || '';
  }
  ob3UpdateNavBtn();
}

function ob3SelectCc(el, field, val) {
  const arr = ob3[field];
  ob3[field] = arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val];
  const isOn = ob3[field].includes(val);
  el.classList.toggle('ob3-sel', isOn);
  const chk = el.querySelector('.ob3-chk');
  if (chk) {
    chk.classList.toggle('ob3-chk-on', isOn);
    chk.innerHTML = isOn ? `<svg width="11" height="8" viewBox="0 0 11 8"><path d="M1 4L4 7L10 1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
  }
  ob3UpdateNavBtn();
}

function ob3UpdateNavBtn() {
  const btn = document.querySelector('.ob3-nav-nx');
  if (!btn) return;
  const can = ob3CanAdvance();
  btn.classList.toggle('ob3-nav-dim', !can);
  btn.style.pointerEvents = can ? '' : 'none';
}

function ob3SetTheme(id) {
  ob3.theme = id;
  document.querySelectorAll('.ob3-tcard').forEach(card => {
    const isSel = card.dataset.theme === id;
    card.classList.toggle('ob3-tcard-sel', isSel);
    let chk = card.querySelector('.ob3-tcard-chk');
    if (isSel && !chk) {
      const d = document.createElement('div'); d.className = 'ob3-tcard-chk';
      d.innerHTML = `<svg width="9" height="7" viewBox="0 0 9 7"><path d="M1 3.5L3.5 6L8 1" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      card.prepend(d);
    } else if (!isSel && chk) { chk.remove(); }
  });
  ob3UpdateNavBtn();
}

function ob3SetName(val) {
  ob3.name = val.trim();
  const input = document.getElementById('ob3-name');
  if (input) input.classList.toggle('ob3-input-ok', !!ob3.name);
  let echo = document.querySelector('.ob3-name-echo');
  if (ob3.name) {
    if (!echo) { echo = document.createElement('p'); echo.className = 'ob3-name-echo'; input?.after(echo); }
    echo.textContent = `Ahlan, ${ob3.name} — ton programme t'attend.`;
  } else if (echo) { echo.remove(); }
}

function ob3ToggleCommit(el) {
  ob3.committed = !ob3.committed;
  el.classList.toggle('ob3-commit-on', ob3.committed);
  const chk = el.querySelector('.ob3-commit-chk');
  if (chk) {
    chk.classList.toggle('ob3-commit-chk-on', ob3.committed);
    chk.innerHTML = ob3.committed ? `<svg width="12" height="9" viewBox="0 0 12 9"><path d="M1 4.5L4.5 8L11 1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
  }
  let echo = document.querySelector('.ob3-commit-echo');
  if (ob3.committed && !echo) {
    echo = document.createElement('p'); echo.className = 'ob3-commit-echo';
    echo.textContent = "Qu'Allah facilite ton chemin."; el.after(echo);
  } else if (!ob3.committed && echo) { echo.remove(); }
  const cta = document.querySelector('.ob3-p10-cta .ob3-cta');
  if (cta) {
    cta.classList.toggle('ob3-cta-dim', !ob3.committed);
    cta.setAttribute('onclick', ob3.committed ? 'ob3Navigate(11,1)' : '');
    cta.textContent = ob3.committed ? (ob3.freeForAllah ? 'Continuer — fi sabilillah ♥' : 'Continuer →') : "Je m'engage pour activer";
  }
}

function ob3OpenFi() {
  ob3.fiOpen = true;
  const btn = document.querySelector('.ob3-fi-btn');
  if (!btn) return;
  const div = document.createElement('div'); div.className = 'ob3-fi-open';
  div.innerHTML = `
    <div class="ob3-fi-open-hd"><span style="font-size:22px">🤲</span><div class="ob3-fi-open-ttl">Accès fi sabilillah</div></div>
    <p class="ob3-fi-open-bd">Si tu n'as pas les moyens financiers ou si tu t'engages sincèrement à utiliser Dawam pour te rapprocher d'Allah, nous t'offrons l'accès gratuitement.</p>
    <div class="ob3-fi-pledge">"Je m'engage à utiliser Dawam sincèrement, pour l'amour d'Allah, et non par habitude ou par distraction."</div>
    <div class="ob3-fi-btns">
      <button class="ob3-fi-cancel" onclick="ob3CloseFi()">Annuler</button>
      <button class="ob3-fi-accept" onclick="ob3AcceptFi()">J'accepte cet engagement</button>
    </div>`;
  btn.replaceWith(div);
}

function ob3CloseFi() {
  ob3.fiOpen = false;
  const open = document.querySelector('.ob3-fi-open');
  if (!open) return;
  const btn = document.createElement('button'); btn.className = 'ob3-fi-btn';
  btn.setAttribute('onclick','ob3OpenFi()');
  btn.innerHTML = `<span style="font-size:18px;flex-shrink:0">🤲</span>
    <div><div class="ob3-fi-btn-t">Obtenir l'accès gratuitement</div><div class="ob3-fi-btn-s">Pour ceux qui s'engagent fi sabilillah</div></div>
    <svg width="7" height="12" viewBox="0 0 7 12" style="margin-left:auto;flex-shrink:0"><path d="M1 1l5 5-5 5" stroke="${OB3.GD}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  open.replaceWith(btn);
}

function ob3AcceptFi() {
  ob3.freeForAllah = true; ob3.committed = true; ob3.fiOpen = false;
  const open = document.querySelector('.ob3-fi-open');
  if (open) {
    const g = document.createElement('div'); g.className = 'ob3-fi-granted';
    g.innerHTML = `<span style="font-size:24px">✨</span>
      <div><div class="ob3-fi-granted-t">Accès gratuit accordé</div><div class="ob3-fi-granted-s">Qu'Allah accepte ta sincerité et te facilite la constance.</div></div>`;
    open.replaceWith(g);
  }
  const commit = document.querySelector('.ob3-commit');
  if (commit && !commit.classList.contains('ob3-commit-on')) {
    commit.classList.add('ob3-commit-on');
    const chk = commit.querySelector('.ob3-commit-chk');
    if (chk) { chk.classList.add('ob3-commit-chk-on'); chk.innerHTML = `<svg width="12" height="9" viewBox="0 0 12 9"><path d="M1 4.5L4.5 8L11 1" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
    let echo = document.querySelector('.ob3-commit-echo');
    if (!echo) { echo = document.createElement('p'); echo.className='ob3-commit-echo'; echo.textContent="Qu'Allah facilite ton chemin."; commit.after(echo); }
  }
  const cta = document.querySelector('.ob3-p10-cta .ob3-cta');
  if (cta) { cta.classList.remove('ob3-cta-dim'); cta.setAttribute('onclick','ob3Navigate(11,1)'); cta.textContent='Continuer — fi sabilillah ♥'; }
}

// ── Navigation ────────────────────────────────────────────────

function ob3CanAdvance() {
  switch (ob3.page) {
    case 3: return !!ob3.prayer;
    case 4: return !!ob3.coran;
    case 5: return !!ob3.night;
    case 6: return !!ob3.situation;
    case 7: return ob3.intentions.length > 0;
    default: return true;
  }
}

function ob3Next() {
  if (ob3.page >= 11) return;
  if (!ob3CanAdvance()) return;
  ob3Navigate(ob3.page + 1, 1);
}

function ob3Back() {
  if (ob3.page <= 1) { showScreen('splash'); return; }
  ob3Navigate(ob3.page - 1, -1);
}

// ── Calcul du palier ──────────────────────────────────────────
function calcPalier(p) {
  const sc   = p.salatCount ?? p.salat ?? 0;
  const witr = p.witrLevel  ?? p.witr  ?? 0;
  const qt   = p.quranType  || 'jamais';
  if (sc<=1) return 1;
  if (sc<=3) return 2;
  if (sc==4) return 3;
  const quranScore = (qt==='quotidien'||qt==='daily')?2:qt==='parfois'?1:0;
  const secondary  = quranScore + Math.min(witr,3);
  if (secondary>=4) return 5;
  if (secondary>=2) return 4;
  return 3;
}

// ── Page notifications (P11, était P12) ──────────────────────
function ob3P11() {
  const escaped = (ob3.city||'').replace(/"/g,'&quot;');
  const cityOk = !!ob3.city;
  return `<div class="ob3-shell">
    <div class="ob3-notif-top">
      <button class="ob3-nav-bk" onclick="ob3Back()">
        <svg width="8" height="13" viewBox="0 0 8 13"><path d="M6 1.5L2 6.5l4 5" stroke="#7A5C3E" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="ob3-body">
      ${ob3Ec('🔔')}
      <div class="ob3-center">
        ${ob3Gl('Dernière étape')}
        <h2 class="ob3-h2">Active tes rappels</h2>
        ${ob3Qb('Dawam t\'envoie un rappel après chaque prière — calé sur tes horaires — pour ne jamais oublier tes actes.')}
      </div>
      <div class="ob3-feat"><span class="ob3-feat-e">🕌</span><span class="ob3-feat-l">Rappels Fajr · Dhuhr · Asr · Maghrib · Isha</span></div>
      <div class="ob3-feat"><span class="ob3-feat-e">📍</span><span class="ob3-feat-l">Calé sur les horaires de ta ville</span></div>
      <div class="ob3-feat"><span class="ob3-feat-e">🔕</span><span class="ob3-feat-l">Un seul rappel par moment — jamais de spam</span></div>
      <div class="ob3-notif-city">
        <p class="ob3-notif-city-lbl">Ta ville (requis pour les horaires de prière)</p>
        <input id="ob3-city" class="ob3-input${cityOk?' ob3-input-ok':''}" type="text" value="${escaped}" placeholder="Ex : Paris, Lyon, Bruxelles…" oninput="ob3SetCity(this.value)" autocomplete="off">
      </div>
    </div>
    <div class="ob3-notif-footer">
      <button id="ob3-notif-btn" class="ob3-cta${cityOk?'':' ob3-cta-dim'}" style="pointer-events:${cityOk?'':'none'}" onclick="ob3NotifActivate()">Activer les rappels 🔔</button>
      <button class="ob3-notif-skip" onclick="ob3SkipNotif()">Passer pour l'instant →</button>
    </div>
  </div>`;
}

function ob3SetCity(val) {
  ob3.city = val.trim();
  const input = document.getElementById('ob3-city');
  if (input) input.classList.toggle('ob3-input-ok', !!ob3.city);
  const btn = document.getElementById('ob3-notif-btn');
  if (btn) {
    btn.classList.toggle('ob3-cta-dim', !ob3.city);
    btn.style.pointerEvents = ob3.city ? '' : 'none';
  }
}

async function ob3NotifActivate() {
  if (!ob3.city) { showToast('Saisis ta ville pour activer les rappels.'); return; }
  const btn = document.getElementById('ob3-notif-btn');
  if (btn) { btn.textContent = 'Activation…'; btn.disabled = true; }

  if (window.isNativeIOSApp) {
    showToast('Active les rappels depuis Profil → Rappels après le lancement.');
    setTimeout(ob3Finish, 800);
    return;
  }

  try {
    if (!('Notification' in window) || !('PushManager' in window)) throw new Error('unsupported');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('denied');
    const sub = await subscribePush();
    const prayers = ob3.prayer==='all'?['fajr','dhuhr','asr','maghrib','isha']:ob3.prayer==='some'?['fajr','dhuhr','asr']:[];
    await fetch(`${PUSH_WORKER}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sub.toJSON(),
        city: ob3.city,
        fajrOffset: ob3.prayer==='all'?30:15,
        palier: 1,
        prayers,
      })
    });
    ob3._notifEndpoint = sub.toJSON().endpoint;
    showToast('Rappels activés ✓');
  } catch(e) {
    if (e.message === 'denied') showToast('Permission refusée — active-la dans Profil → Rappels.');
  }
  ob3Finish();
}

function ob3SkipNotif() { ob3Finish(); }

// ── Fin de l'onboarding ───────────────────────────────────────
function ob3Finish() {
  const sc   = ob3.prayer==='all'?5:ob3.prayer==='some'?3:0;
  const pArr = ob3.prayer==='all'?['fajr','dhuhr','asr','maghrib','isha']:ob3.prayer==='some'?['fajr','dhuhr','asr']:[];
  const qt   = ob3.coran==='daily'?'daily':ob3.coran==='sometimes'?'sometimes':'never';
  const witr = ob3.night==='regular'?2:ob3.night==='sometimes'?1:0;
  const profile = {
    salatCount:sc, prayers:pArr,
    quranType:qt, quranGoal:'versets',
    salat:sc, quran:qt==='daily'?2:qt==='sometimes'?1:0,
    witr, witrLevel:witr, fajrOffset:witr>=2?45:witr===1?30:15,
    situations:[ob3.situation||'active'], type:ob3.situation||'active',
    goal:ob3.intentions.length?ob3.intentions:['rapprochement'],
    obstacles:ob3.obstacles, intentions:ob3.intentions,
    practiceSlot:'morning', city: ob3.city || ''
  };
  const palier = calcPalier(profile);
  localStorage.removeItem(STORAGE_KEY);
  S = { name:ob3.name||'ami', profile, palier, weekNumber:1,
        checklist:{}, totalDays:0, lastDate:null, history:[],
        customSteps:null, notifs: ob3._notifEndpoint ? { pushSub: ob3._notifEndpoint } : null };
  save();
  if (typeof track === 'function') track('onboarding_complete');
  if (_auth.currentUser || window._isPreprod) {
    launchApp();
    if (typeof track === 'function') track('launch');
  } else { location.reload(); }
}

function finishOnboarding() { ob3Finish(); }
