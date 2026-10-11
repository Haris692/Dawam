// Décors illustrés (SVG) des vidéos « Une journée avec Dawam ».
// Les couleurs qui changent avec l'heure portent data-c="c0 c1 c2" (ex. nuit, aube, jour) : paint(list, k) les mélange (k ∈ [0, 1]).
'use strict';
function palette(root) {
  return Array.from(root.querySelectorAll('[data-c]')).map(n => ({ n, c: n.getAttribute('data-c').split(' '), prop: n.getAttribute('data-p') || 'fill', last: '' }));
}
function paint(list, k) {
  for (const it of list) {
    const [a, b, d] = it.c;
    const col = k <= .5 ? mix(a, b, k / .5) : mix(b, d || b, (k - .5) / .5);
    if (col !== it.last) { it.n.setAttribute(it.prop, col); it.last = col; }
  }
}
const C = cols => `data-c="${cols.join(' ')}"`;
const starsMarkup = (seed, n, x0, y0, w, h) => {
  const r = mulberry32(seed); let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${f1(x0 + r() * w)}" cy="${f1(y0 + r() * h)}" r="${f1(1.2 + r() * 2.2)}" fill="#FFF6DD" opacity="${(.4 + r() * .6).toFixed(2)}"/>`;
  return s;
};

// ───────── chambre (lit vu de côté, fenêtre, lampe de chevet) ─────────
// Contour léger des objets, pour aller avec les personnages cartoon.
const OLA = 'stroke="#2A1E2C" stroke-opacity=".5" stroke-width="5" stroke-linejoin="round"';
// bassin du personnage allongé / assis dans le lit, téléphone posé sur le matelas (sous le menton)
const BED = { s: 1.25, lie: [634, 1243], sit: [634, 1300], phone: [430, 1290] };
// pose de base dans le lit : u = 0 allongé sur le côté droit (tête sur l'oreiller), u = 1 assis
function bedBase(u) {
  return { x: lerp(BED.lie[0], BED.sit[0], u), y: lerp(BED.lie[1], BED.sit[1], u), s: BED.s, lean: lerp(-88, -4, u), tilt: lerp(24, 0, u) };
}
// point de la scène → coordonnées de main du personnage (repère du bassin, avant mise à l'échelle)
const toHip = (b, wx, wy) => [(wx - b.x) / b.s, (wy - b.y) / b.s];
// couverture : du « bombé » (k = 1, personnage allongé dessous) au « à plat » (k = 0, personnage assis)
const BLANKET = {
  flat: [488, 1300, 500, 1270, 560, 1260, 650, 1262, 760, 1264, 900, 1264, 962, 1270, 986, 1290, 986, 1440, 956, 1440, 512, 1440, 484, 1440, 482, 1320],
  mound: [484, 1300, 472, 1186, 522, 1118, 634, 1124, 734, 1132, 784, 1232, 962, 1244, 990, 1250, 986, 1440, 956, 1440, 508, 1440, 482, 1440, 478, 1330],
  l1: [[612, 1300, 650, 1360, 628, 1436], [628, 1150, 676, 1300, 640, 1436]],
  l2: [[772, 1290, 800, 1360, 778, 1438], [774, 1238, 806, 1340, 778, 1438]],
};
function blanketD(k) {
  const a = BLANKET.flat.map((v, i) => f1(lerp(v, BLANKET.mound[i], k)));
  return `M${a[0]} ${a[1]}C${a[2]} ${a[3]} ${a[4]} ${a[5]} ${a[6]} ${a[7]}C${a[8]} ${a[9]} ${a[10]} ${a[11]} ${a[12]} ${a[13]}` +
    `C${a[14]} ${a[15]} ${a[16]} ${a[17]} ${a[18]} ${a[19]}L${a[20]} ${a[21]}C${a[22]} ${a[23]} ${a[24]} ${a[25]} ${a[0]} ${a[1]}Z`;
}
const foldD = (L, k) => { const a = L[0].map((v, i) => f1(lerp(v, L[1][i], k))); return `M${a[0]} ${a[1]}Q${a[2]} ${a[3]} ${a[4]} ${a[5]}`; };
// pal : rôles → [c0, c1, c2]
function bedroom(svgNode, pal) {
  svgNode.innerHTML = `
  <defs>
    <linearGradient id="brSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" data-p="stop-color" ${C(pal.skyTop)}/><stop offset="1" data-p="stop-color" ${C(pal.skyBot)}/>
    </linearGradient>
    <radialGradient id="brLampG"><stop offset="0" stop-color="#FFD59A" stop-opacity=".7"/><stop offset=".5" stop-color="#FFC978" stop-opacity=".22"/><stop offset="1" stop-color="#FFC978" stop-opacity="0"/></radialGradient>
    <radialGradient id="brPhoneG"><stop offset="0" stop-color="#FFF1D2" stop-opacity=".85"/><stop offset=".45" stop-color="#FFE2A8" stop-opacity=".25"/><stop offset="1" stop-color="#FFE2A8" stop-opacity="0"/></radialGradient>
    <clipPath id="brGlass"><rect x="618" y="578" width="314" height="444" rx="6"/></clipPath>
    <mask id="brMoonM"><circle cx="868" cy="660" r="32" fill="#fff"/><circle cx="884" cy="648" r="28" fill="#000"/></mask>
  </defs>
  <rect width="1080" height="1500" ${C(pal.wall)}/>
  <rect y="1478" width="1080" height="26" ${C(pal.base)}/>
  <rect y="1500" width="1080" height="420" ${C(pal.floor)}/>
  <path d="M0 1600H1080M0 1720H1080M0 1860H1080" stroke-width="3" fill="none" data-p="stroke" ${C(pal.floorLine)}/>
  <ellipse cx="560" cy="1760" rx="440" ry="96" ${C(pal.rug)}/>
  <ellipse cx="560" cy="1760" rx="380" ry="72" fill="none" stroke-width="6" data-p="stroke" ${C(pal.rugLine)}/>
  <!-- fenêtre -->
  <rect x="600" y="560" width="350" height="480" rx="16" ${C(pal.frame)} ${OLA}/>
  <g clip-path="url(#brGlass)">
    <rect x="618" y="578" width="314" height="444" fill="url(#brSky)"/>
    <g id="brStars">${starsMarkup(4, 26, 620, 580, 310, 300)}</g>
    <circle id="brMoon" cx="868" cy="660" r="32" fill="#F6E7B8" mask="url(#brMoonM)"/>
    <path d="M618 1022V960L660 960L660 930L700 930L700 975L742 975L742 900L770 900L770 960L812 960L812 940L850 940L850 985L890 985L890 950L932 950V1022Z" ${C(pal.city)}/>
  </g>
  <rect x="771" y="578" width="8" height="444" ${C(pal.frame)}/><rect x="618" y="796" width="314" height="8" ${C(pal.frame)}/>
  <rect x="584" y="1032" width="382" height="24" rx="8" ${C(pal.sill)} ${OLA}/>
  <rect x="560" y="526" width="430" height="12" rx="6" ${C(pal.rod)} ${OLA}/>
  <path d="M566 538L646 538Q634 760 614 1000Q604 1080 616 1124L560 1124Q550 820 566 538Z" ${C(pal.curtain)} ${OLA}/>
  <path d="M590 560Q584 820 586 1110M614 560Q606 820 600 1110" fill="none" stroke-width="3" opacity=".5" data-p="stroke" ${C(pal.curtainLine)}/>
  <path d="M984 538L904 538Q916 760 936 1000Q946 1080 934 1124L990 1124Q1000 820 984 538Z" ${C(pal.curtain)} ${OLA}/>
  <path d="M960 560Q966 820 964 1110M936 560Q944 820 950 1110" fill="none" stroke-width="3" opacity=".5" data-p="stroke" ${C(pal.curtainLine)}/>
  <!-- cadre au mur -->
  <rect x="250" y="620" width="200" height="250" rx="10" ${C(pal.artFrame)} ${OLA}/>
  <rect x="266" y="636" width="168" height="218" rx="4" ${C(pal.art)}/>
  <g transform="translate(350 745)" fill="none" stroke-width="3" data-p="stroke" ${C(pal.artLine)}><rect x="-38" y="-38" width="76" height="76"/><rect x="-38" y="-38" width="76" height="76" transform="rotate(45)"/><circle r="16"/></g>
  <!-- chevet + lampe -->
  <rect x="20" y="1252" width="130" height="248" rx="10" ${C(pal.stand)} ${OLA}/>
  <rect x="8" y="1238" width="154" height="20" rx="7" ${C(pal.standTop)} ${OLA}/>
  <path d="M40 1330H130M40 1410H130" stroke-width="4" fill="none" data-p="stroke" ${C(pal.standTop)}/>
  <rect x="71" y="1150" width="8" height="90" ${C(pal.lampStem)}/>
  <path d="M52 1240Q75 1222 98 1240Z" ${C(pal.lampStem)} ${OLA}/>
  <path id="brShade" d="M28 1152L122 1152L106 1078L44 1078Z" ${C(pal.lampShade)} ${OLA}/>
  <circle id="brLampGlow" cx="75" cy="1130" r="430" fill="url(#brLampG)" opacity="0"/>
  <!-- lit -->
  <path d="M150 1484L150 1080Q150 1040 190 1040Q220 1040 220 1080L220 1484Z" ${C(pal.bedWood)} ${OLA}/>
  <rect x="190" y="1400" width="790" height="76" rx="20" ${C(pal.bedWood)} ${OLA}/>
  <rect x="210" y="1470" width="28" height="40" rx="6" ${C(pal.bedWoodDark)} ${OLA}/><rect x="930" y="1470" width="28" height="40" rx="6" ${C(pal.bedWoodDark)} ${OLA}/>
  <rect x="205" y="1298" width="770" height="112" rx="32" ${C(pal.sheet)} ${OLA}/>
  <path d="M224 1262C220 1222 290 1212 350 1214C420 1216 470 1222 468 1262C470 1300 420 1310 350 1308C280 1308 222 1302 224 1262Z" ${C(pal.pillow)} ${OLA}/>
  <path d="M262 1290Q350 1302 440 1288" fill="none" stroke-width="4" opacity=".35" data-p="stroke" ${C(pal.blanketLine)}/>
  <g id="brPerson"></g>
  <g id="brPhoneBed" transform="translate(${BED.phone[0]} ${BED.phone[1]}) rotate(-80)"><rect x="-15" y="-29" width="30" height="58" rx="7" fill="#1d1d1f" stroke="#2A1E2C" stroke-width="4"/><rect id="brPhoneScr" x="-11" y="-25" width="22" height="50" rx="4" fill="#2b2b30"/></g>
  <circle id="brPhoneGlow" cx="0" cy="0" r="240" fill="url(#brPhoneG)" opacity="0"/>
  <path id="brBlanket" d="${blanketD(0)}" ${C(pal.blanket)} ${OLA}/>
  <path id="brFold1" d="${foldD(BLANKET.l1, 0)}" fill="none" stroke-width="5" stroke-linecap="round" opacity=".55" data-p="stroke" ${C(pal.blanketLine)}/>
  <path id="brFold2" d="${foldD(BLANKET.l2, 0)}" fill="none" stroke-width="5" stroke-linecap="round" opacity=".55" data-p="stroke" ${C(pal.blanketLine)}/>
  <circle id="brPhoneGlow2" cx="0" cy="0" r="200" fill="url(#brPhoneG)" opacity="0"/>
  <g id="brFront"></g>`;
  const q = sel => svgNode.querySelector(sel);
  const R = {
    pal: palette(svgNode), person: q('#brPerson'), front: q('#brFront'), stars: q('#brStars'), moon: q('#brMoon'),
    phoneBed: q('#brPhoneBed'), phoneScr: q('#brPhoneScr'), glow: q('#brPhoneGlow'), glow2: q('#brPhoneGlow2'),
    lampGlow: q('#brLampGlow'), shade: q('#brShade'), blanket: q('#brBlanket'), folds: [q('#brFold1'), q('#brFold2')],
  };
  // couverture bombée (k = 1) ou à plat (k = 0)
  R.setBlanket = k => {
    R.blanket.setAttribute('d', blanketD(k));
    R.folds[0].setAttribute('d', foldD(BLANKET.l1, k)); R.folds[1].setAttribute('d', foldD(BLANKET.l2, k));
  };
  // téléphone posé sur le matelas : vibration (px), écran allumé (0–1), visible ou non
  R.setPhone = (buzz, lit, on = true) => {
    R.phoneBed.style.display = on ? '' : 'none';
    R.phoneBed.setAttribute('transform', `translate(${f1(BED.phone[0] + buzz)} ${BED.phone[1]}) rotate(-80)`);
    R.phoneScr.setAttribute('fill', mix('#2b2b30', '#FFF4DC', lit));
  };
  return R;
}

// ───────── pièce à l'aube : grande fenêtre en arc, tapis de prière ─────────
function dawnRoom(svgNode) {
  const p = {
    wall: ['#2B2D52', '#6B5873', '#C7A68E'], frame: ['#3A3B62', '#8A7383', '#EBDCCB'], sill: ['#34365C', '#7D6878', '#E3D2BF'],
    skyTop: ['#11173A', '#3C3F7E', '#9CC9E6'], skyMid: ['#232456', '#B5698A', '#F6D6A8'], skyBot: ['#3A2F5E', '#F2A36C', '#FFE6B0'],
    city: ['#0F1230', '#2E2346', '#7E6A7E'], floor: ['#1E2040', '#5A4552', '#B98F6E'], plank: ['#25284B', '#664F5B', '#A87F60'],
    curtain: ['#3B3D66', '#B49AA0', '#F4E9DC'],
  };
  svgNode.innerHTML = `
  <defs>
    <linearGradient id="dwSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" data-p="stop-color" ${C(p.skyTop)}/><stop offset=".62" data-p="stop-color" ${C(p.skyMid)}/><stop offset="1" data-p="stop-color" ${C(p.skyBot)}/>
    </linearGradient>
    <radialGradient id="dwSunG"><stop offset="0" stop-color="#FFE7A8" stop-opacity=".95"/><stop offset=".35" stop-color="#FFC56E" stop-opacity=".4"/><stop offset="1" stop-color="#FFB45A" stop-opacity="0"/></radialGradient>
    <linearGradient id="dwShaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE0A6" stop-opacity=".55"/><stop offset="1" stop-color="#FFE0A6" stop-opacity="0"/></linearGradient>
    <radialGradient id="dwPhoneG"><stop offset="0" stop-color="#FFF1D2" stop-opacity=".7"/><stop offset="1" stop-color="#FFF1D2" stop-opacity="0"/></radialGradient>
    <clipPath id="dwGlass"><path d="M250 1190L250 700A290 290 0 0 1 830 700L830 1190Z"/></clipPath>
    <mask id="dwMoonM"><circle cx="700" cy="560" r="34" fill="#fff"/><circle cx="716" cy="547" r="30" fill="#000"/></mask>
  </defs>
  <rect width="1080" height="1262" ${C(p.wall)}/>
  <rect y="1250" width="1080" height="670" ${C(p.floor)}/>
  <path d="M540 1250L-200 1920M540 1250L180 1920M540 1250L540 1920M540 1250L900 1920M540 1250L1280 1920M0 1420H1080M0 1640H1080" stroke-width="3" fill="none" data-p="stroke" ${C(p.plank)}/>
  <path d="M228 1206L228 700A312 312 0 0 1 852 700L852 1206Z" ${C(p.frame)} ${OLA}/>
  <g clip-path="url(#dwGlass)">
    <rect x="250" y="400" width="580" height="800" fill="url(#dwSky)"/>
    <g id="dwStars">${starsMarkup(9, 34, 255, 410, 570, 480)}</g>
    <circle id="dwMoon" cx="700" cy="560" r="34" fill="#F6E7B8" mask="url(#dwMoonM)"/>
    <circle id="dwSunGlow" cx="540" cy="1200" r="300" fill="url(#dwSunG)"/>
    <circle id="dwSun" cx="540" cy="1200" r="62" fill="#FFE9B0"/>
    <path d="M250 1190V1110H292V1080H336V1120H372V1050H404V1100H446V1070L476 1070L476 1004Q506 960 536 1004L536 1070H558L558 1030L566 1030L566 940L572 926L578 940L578 1030L586 1030L586 1080H630V1040H668V1100H712V1060H748V1095H790V1068H830V1190Z" ${C(p.city)}/>
    <rect x="536" y="400" width="8" height="800" ${C(p.frame)}/><rect x="250" y="860" width="580" height="8" ${C(p.frame)}/>
  </g>
  <rect x="206" y="1186" width="668" height="28" rx="9" ${C(p.sill)} ${OLA}/>
  <path d="M150 -20L262 -20Q240 700 236 1240L150 1250Q132 700 150 -20Z" opacity=".5" ${C(p.curtain)}/>
  <path d="M930 -20L818 -20Q840 700 844 1240L930 1250Q948 700 930 -20Z" opacity=".5" ${C(p.curtain)}/>
  <path id="dwShaft" d="M262 1214L818 1214L1010 1920L70 1920Z" fill="url(#dwShaft)" opacity="0"/>
  <!-- tapis de prière (motifs sans direction : le personnage y est assis face à nous) -->
  <path d="M352 1332L728 1332L912 1884L168 1884Z" fill="#2E5E58" ${OLA}/>
  <path d="M368 1346L712 1346L884 1866L196 1866Z" fill="none" stroke="#D9A94E" stroke-width="10"/>
  <path d="M384 1360L696 1360L860 1850L220 1850Z" fill="#24504B"/>
  <path d="M540 1398l34 30l-34 30l-34 -30z M540 1780l46 40l-46 40l-46 -40z" fill="none" stroke="#D9A94E" stroke-width="6"/>
  <path d="M420 1440h240M300 1800h480" stroke="#D9A94E" stroke-width="4" stroke-dasharray="2 14" stroke-linecap="round"/>
  <path d="M168 1884v20M206 1884v20M244 1884v20M282 1884v20M320 1884v20M358 1884v20M396 1884v20M434 1884v20M472 1884v20M510 1884v20M548 1884v20M586 1884v20M624 1884v20M662 1884v20M700 1884v20M738 1884v20M776 1884v20M814 1884v20M852 1884v20M890 1884v20" stroke="#E8D6B0" stroke-width="4"/>
  <path d="M362 1332v-14M392 1332v-14M422 1332v-14M452 1332v-14M482 1332v-14M512 1332v-14M542 1332v-14M572 1332v-14M602 1332v-14M632 1332v-14M662 1332v-14M692 1332v-14M720 1332v-14" stroke="#E8D6B0" stroke-width="3.5"/>
  <ellipse cx="540" cy="1712" rx="196" ry="34" fill="#000" opacity=".2"/>
  <circle id="dwPhoneGlow" cx="540" cy="1430" r="260" fill="url(#dwPhoneG)" opacity="0"/>
  <g id="dwPerson"></g>
  <g id="dwFront"></g>`;
  return {
    pal: palette(svgNode), person: svgNode.querySelector('#dwPerson'), front: svgNode.querySelector('#dwFront'), stars: svgNode.querySelector('#dwStars'), moon: svgNode.querySelector('#dwMoon'),
    sun: svgNode.querySelector('#dwSun'), sunGlow: svgNode.querySelector('#dwSunGlow'), shaft: svgNode.querySelector('#dwShaft'), glow: svgNode.querySelector('#dwPhoneGlow'),
  };
}

// ───────── rame de métro (vue sur la banquette d'en face) ─────────
function metro(svgNode) {
  const r = mulberry32(17);
  let streaks = '';
  for (let i = 0; i < 16; i++) {
    const y = 600 + r() * 380, w = 120 + r() * 420, h = 3 + r() * 5;
    streaks += `<rect class="mtStreak" data-x="${f1(r() * 1400)}" data-v="${(.7 + r() * .6).toFixed(2)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="3" fill="#F6D9A0" opacity="${(.25 + r() * .5).toFixed(2)}"/>`;
  }
  let lamps = '';
  for (let i = 0; i < 3; i++) lamps += `<g class="mtLamp" data-x="${i * 520}"><ellipse cx="0" cy="640" rx="70" ry="20" fill="#FFE7B0" opacity=".9"/><ellipse cx="0" cy="640" rx="160" ry="60" fill="#FFD27A" opacity=".18"/></g>`;
  let straps = '';
  for (const x of [120, 330, 540, 750, 960]) straps += `<g class="mtStrap" data-x="${x}"><path d="M${x} 256L${x} 330" stroke="#B8B2A6" stroke-width="8"/><path d="M${x - 24} 330L${x + 24} 330L${x + 16} 372Q${x} 384 ${x - 16} 372Z" fill="none" stroke="#5B6A70" stroke-width="9" stroke-linejoin="round"/></g>`;
  let tiles = '';
  for (let x = 0; x < 1100; x += 60) for (let y = 560; y < 900; y += 40) tiles += `<rect x="${x + 2}" y="${y + 2}" width="56" height="36" rx="4" fill="#F1EADB"/>`;
  svgNode.innerHTML = `
  <defs>
    <clipPath id="mtWin"><rect x="60" y="560" width="440" height="440" rx="40"/><rect x="580" y="560" width="440" height="440" rx="40"/></clipPath>
    <linearGradient id="mtTunnel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151827"/><stop offset=".5" stop-color="#262A3D"/><stop offset="1" stop-color="#14161F"/></linearGradient>
    <linearGradient id="mtGlare" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".09"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="mtPole" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B8862F"/><stop offset=".45" stop-color="#F2CD7E"/><stop offset="1" stop-color="#A9781F"/></linearGradient>
  </defs>
  <rect width="1080" height="190" fill="#EEEAE2"/>
  <rect x="40" y="70" width="1000" height="34" rx="17" fill="#FFF9EC"/>
  <rect y="190" width="1080" height="830" fill="#E6E0D4"/>
  <rect y="1000" width="1080" height="140" fill="#D5CDBF"/>
  <!-- affiches -->
  <rect x="60" y="400" width="250" height="120" rx="14" fill="#CFC7B8"/><rect x="76" y="416" width="218" height="88" rx="8" fill="#9DB6C4"/><circle cx="124" cy="460" r="26" fill="#F2D49B"/><rect x="164" y="440" width="110" height="12" rx="6" fill="#F8F4EC"/><rect x="164" y="464" width="80" height="10" rx="5" fill="#F8F4EC" opacity=".7"/>
  <rect x="770" y="400" width="250" height="120" rx="14" fill="#CFC7B8"/><rect x="786" y="416" width="218" height="88" rx="8" fill="#E2B28A"/><rect x="806" y="436" width="120" height="14" rx="7" fill="#FFF6EA"/><rect x="806" y="462" width="160" height="10" rx="5" fill="#FFF6EA" opacity=".7"/>
  <rect x="380" y="380" width="320" height="150" rx="16" fill="#CFC7B8"/>
  <rect x="396" y="396" width="288" height="118" rx="10" fill="#C8871F"/>
  <image href="../assets/img/emblem.png" x="414" y="410" width="90" height="90"/>
  <text x="522" y="456" font-family="Plus Jakarta Sans" font-weight="800" font-size="40" fill="#FFF8E8" letter-spacing="-1">Dawam</text>
  <text x="523" y="488" font-family="Lora" font-style="italic" font-size="20" fill="#FFF3D6">Petit, mais constant.</text>
  <!-- fenêtres : tunnel puis quai -->
  <rect x="48" y="548" width="464" height="464" rx="50" fill="#9A958C"/><rect x="568" y="548" width="464" height="464" rx="50" fill="#9A958C"/>
  <g clip-path="url(#mtWin)">
    <rect x="0" y="540" width="1080" height="480" fill="url(#mtTunnel)"/>
    <g id="mtStreaks">${streaks}</g>
    <g id="mtLamps">${lamps}</g>
    <g id="mtPlatform">
      <rect x="0" y="540" width="1500" height="480" fill="#E4DCCB"/>${tiles}
      <rect x="0" y="700" width="1500" height="54" fill="#2C3E63"/>
      <rect x="560" y="610" width="300" height="70" rx="12" fill="#22324F"/><text x="600" y="657" font-family="Plus Jakarta Sans" font-weight="800" font-size="32" fill="#fff">Sortie  →</text>
      <rect x="0" y="900" width="1500" height="120" fill="#8E8A82"/><rect x="0" y="900" width="1500" height="14" fill="#E8C64A"/>
      <rect x="1060" y="820" width="220" height="24" rx="8" fill="#6B7B88"/><rect x="1080" y="844" width="16" height="56" fill="#56636E"/><rect x="1244" y="844" width="16" height="56" fill="#56636E"/>
    </g>
    <rect x="0" y="540" width="1080" height="480" fill="url(#mtGlare)"/>
  </g>
  <!-- barre et poignées -->
  <rect x="-20" y="244" width="1120" height="16" rx="8" fill="url(#mtPole)"/>
  <g id="mtStraps">${straps}</g>
  <!-- banquette -->
  <rect x="0" y="1060" width="1080" height="200" rx="30" fill="#2F6B66"/>
  <path d="M180 1078V1250M360 1078V1250M540 1078V1250M720 1078V1250M900 1078V1250" stroke="#285C58" stroke-width="5"/>
  <rect x="-10" y="1246" width="1100" height="86" rx="26" fill="#255A55"/>
  <rect y="1326" width="1080" height="118" fill="#3B4048"/>
  <path d="M60 1360H1020M60 1390H1020M60 1420H1020" stroke="#4A5058" stroke-width="5"/>
  <rect y="1440" width="1080" height="480" fill="#A39D92"/>
  <path d="M0 1500H1080" stroke="#8F897F" stroke-width="6"/>
  <g id="mtPersons"></g>
  <g id="mtFront"></g>
  <!-- barres verticales devant -->
  <rect x="140" y="250" width="22" height="1700" rx="11" fill="url(#mtPole)"/>
  <rect x="918" y="250" width="22" height="1700" rx="11" fill="url(#mtPole)"/>`;
  const q = sel => Array.from(svgNode.querySelectorAll(sel));
  return {
    persons: svgNode.querySelector('#mtPersons'), front: svgNode.querySelector('#mtFront'),
    streaks: q('.mtStreak').map(n => ({ n, x: +n.dataset.x, v: +n.dataset.v, w: +n.getAttribute('width') })),
    lamps: q('.mtLamp').map(n => ({ n, x: +n.dataset.x })), straps: q('.mtStrap').map(n => ({ n, x: +n.dataset.x })),
    platform: svgNode.querySelector('#mtPlatform'),
  };
}

// ───────── petits décors (panneaux 1000×330) pour la vidéo « En famille » ─────────
const steam = (x, y) => `<path class="steam" data-x="${x}" data-y="${y}" d="" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity=".7"/>`;
function drawSteam(svgNode, t) {
  svgNode.querySelectorAll('.steam').forEach((p, i) => {
    const x = +p.dataset.x, y = +p.dataset.y, ph = t * 2.2 + i * 1.7;
    let d = `M${x} ${y}`;
    for (let k = 1; k <= 4; k++) d += `Q${f1(x + Math.sin(ph + k) * 12)} ${y - k * 16 + 8} ${f1(x + Math.sin(ph + k + .8) * 8)} ${y - k * 16}`;
    p.setAttribute('d', d);
    p.setAttribute('opacity', (.35 + .3 * Math.sin(ph * .7)).toFixed(2));
  });
}
function kitchenPanel(svgNode) {
  let tiles = '';
  for (let x = 0; x < 1000; x += 46) for (let y = 120; y < 236; y += 38) tiles += `<rect x="${x + 2}" y="${y + 2}" width="42" height="34" rx="5" fill="#F4ECDD"/>`;
  svgNode.innerHTML = `<rect width="1000" height="330" fill="#EAD6B8"/><rect y="118" width="1000" height="118" fill="#E2D2B8"/>${tiles}
    <rect x="30" y="0" width="330" height="92" rx="10" fill="#C9A57A"/><path d="M195 0V92" stroke="#B48F63" stroke-width="5"/><rect x="160" y="62" width="26" height="8" rx="4" fill="#8C6A4E"/><rect x="204" y="62" width="26" height="8" rx="4" fill="#8C6A4E"/>
    <rect x="640" y="22" width="250" height="186" rx="12" fill="#FBF7F0"/><rect x="654" y="36" width="222" height="158" rx="6" fill="#CFE5EF"/><path d="M765 36V194M654 114H876" stroke="#FBF7F0" stroke-width="7"/>
    <circle cx="700" cy="90" r="26" fill="#FFF4D8" opacity=".9"/>
    <rect x="740" y="176" width="44" height="34" rx="6" fill="#C46E4A"/><path d="M762 176Q742 140 752 120M762 176Q780 136 796 128M762 176Q762 140 766 112" stroke="#5E9C76" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="596" cy="62" r="34" fill="#FBF7F0"/><circle cx="596" cy="62" r="34" fill="none" stroke="#B48F63" stroke-width="5"/><path class="clock" d="M596 62V40M596 62L612 70" stroke="#5B4A3A" stroke-width="4" stroke-linecap="round"/>
    <g class="person"></g>
    <rect y="262" width="1000" height="22" fill="#A98260"/><rect y="282" width="1000" height="48" fill="#8C6A4E"/>
    <path d="M250 288V330M500 288V330M750 288V330" stroke="#7A5A42" stroke-width="4"/>
    <ellipse cx="200" cy="262" rx="86" ry="10" fill="#3D3B3A"/><rect x="128" y="202" width="144" height="62" rx="14" fill="#4E5A66"/><rect x="118" y="196" width="164" height="16" rx="8" fill="#5D6A77"/>
    ${steam(170, 186)}${steam(205, 182)}${steam(238, 188)}`;
  return { person: svgNode.querySelector('.person'), clock: svgNode.querySelector('.clock') };
}
function officePanel(svgNode) {
  const r = mulberry32(31); let city = '';
  for (let x = 610; x < 960; x += 30 + r() * 20) { const h = 50 + r() * 120; city += `<rect x="${f1(x)}" y="${f1(230 - h)}" width="${f1(26 + r() * 14)}" height="${f1(h)}" fill="${['#9FB6C8', '#B7C8D6', '#8EA6BA'][Math.floor(r() * 3)]}"/>`; }
  svgNode.innerHTML = `<rect width="1000" height="330" fill="#E1E7EB"/>
    <rect x="600" y="16" width="370" height="222" rx="10" fill="#F5F8FA"/><rect x="612" y="28" width="346" height="200" rx="4" fill="#D9ECF6"/>${city}
    <path d="M612 52H958M612 78H958M612 104H958" stroke="#F5F8FA" stroke-width="4" opacity=".7"/>
    <rect x="60" y="70" width="270" height="12" rx="6" fill="#B79C80"/>
    <rect x="80" y="20" width="26" height="50" rx="4" fill="#5E7C9A"/><rect x="110" y="26" width="26" height="44" rx="4" fill="#C8871F"/><rect x="140" y="16" width="26" height="54" rx="4" fill="#8E6FB0"/><rect x="176" y="30" width="60" height="40" rx="6" fill="#D9C7A8"/>
    <g class="person"></g>
    <rect y="240" width="1000" height="20" fill="#C79A6B"/><rect y="258" width="1000" height="72" fill="#A97C52"/>
    <path d="M110 238L104 166Q104 158 112 158L262 158Q270 158 270 166L264 238Z" fill="#4A4F57"/><circle cx="187" cy="198" r="8" fill="#6A707A"/><rect x="88" y="234" width="196" height="10" rx="5" fill="#3A3F46"/>
    <rect x="352" y="196" width="40" height="44" rx="8" fill="#F3EFE7"/><path d="M392 206Q408 206 408 218Q408 230 392 230" fill="none" stroke="#F3EFE7" stroke-width="6"/>
    ${steam(364, 188)}${steam(380, 184)}
    <rect x="724" y="196" width="50" height="44" rx="8" fill="#C46E4A"/><path d="M749 196Q726 150 736 124M749 196Q770 152 788 140M749 196Q750 150 756 116M749 196Q732 170 716 162" stroke="#5E9C76" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  return { person: svgNode.querySelector('.person') };
}
function libraryPanel(svgNode) {
  const r = mulberry32(41), cols = ['#8E3B46', '#2F6B66', '#C8871F', '#3E5A86', '#7A5C99', '#B5674A', '#D9A94E', '#4E7D5B'];
  let books = '';
  for (const y of [8, 92, 176]) {
    let x = 0;
    while (x < 1000) { const w = 18 + r() * 22, h = 54 + r() * 22; books += `<rect x="${f1(x)}" y="${f1(y + 78 - h)}" width="${f1(w)}" height="${f1(h)}" rx="3" fill="${cols[Math.floor(r() * cols.length)]}"/>`; x += w + 3 + (r() < .1 ? 30 : 0); }
    books += `<rect x="0" y="${y + 78}" width="1000" height="10" fill="#7A5638"/>`;
  }
  svgNode.innerHTML = `<rect width="1000" height="330" fill="#9C7552"/>${books}<rect width="1000" height="330" fill="#F3E3C6" opacity=".42"/>
    <g class="person"></g>
    <rect y="250" width="1000" height="18" fill="#B68858"/><rect y="266" width="1000" height="64" fill="#94683F"/>
    <path d="M140 250Q200 230 262 246Q322 230 384 250Z" fill="#FBF8F1"/><path d="M262 246V250" stroke="#D9D2C2" stroke-width="3"/>
    <path d="M160 240Q200 228 250 238M160 232Q200 220 250 230M276 238Q324 226 368 240M276 230Q324 218 368 232" stroke="#CFC6B4" stroke-width="3" fill="none"/>
    <rect x="690" y="226" width="150" height="24" rx="4" fill="#3E5A86"/><rect x="700" y="204" width="132" height="22" rx="4" fill="#8E3B46"/><rect x="694" y="184" width="140" height="20" rx="4" fill="#D9A94E"/>
    <rect x="890" y="236" width="70" height="14" rx="6" fill="#6B5A3A"/><rect x="920" y="160" width="10" height="78" fill="#6B5A3A"/><path d="M872 170Q925 110 978 170Z" fill="#2F6B66"/><ellipse cx="925" cy="172" rx="50" ry="8" fill="#FFE7A8" opacity=".8"/>`;
  return { person: svgNode.querySelector('.person') };
}
