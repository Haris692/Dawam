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
  <rect x="600" y="560" width="350" height="480" rx="16" ${C(pal.frame)}/>
  <g clip-path="url(#brGlass)">
    <rect x="618" y="578" width="314" height="444" fill="url(#brSky)"/>
    <g id="brStars">${starsMarkup(4, 26, 620, 580, 310, 300)}</g>
    <circle id="brMoon" cx="868" cy="660" r="32" fill="#F6E7B8" mask="url(#brMoonM)"/>
    <path d="M618 1022V960L660 960L660 930L700 930L700 975L742 975L742 900L770 900L770 960L812 960L812 940L850 940L850 985L890 985L890 950L932 950V1022Z" ${C(pal.city)}/>
  </g>
  <rect x="771" y="578" width="8" height="444" ${C(pal.frame)}/><rect x="618" y="796" width="314" height="8" ${C(pal.frame)}/>
  <rect x="584" y="1032" width="382" height="24" rx="8" ${C(pal.sill)}/>
  <rect x="560" y="526" width="430" height="12" rx="6" ${C(pal.rod)}/>
  <path d="M566 538L646 538Q634 760 614 1000Q604 1080 616 1124L560 1124Q550 820 566 538Z" ${C(pal.curtain)}/>
  <path d="M590 560Q584 820 586 1110M614 560Q606 820 600 1110" fill="none" stroke-width="3" opacity=".5" data-p="stroke" ${C(pal.curtainLine)}/>
  <path d="M984 538L904 538Q916 760 936 1000Q946 1080 934 1124L990 1124Q1000 820 984 538Z" ${C(pal.curtain)}/>
  <path d="M960 560Q966 820 964 1110M936 560Q944 820 950 1110" fill="none" stroke-width="3" opacity=".5" data-p="stroke" ${C(pal.curtainLine)}/>
  <!-- cadre au mur -->
  <rect x="250" y="620" width="200" height="250" rx="10" ${C(pal.artFrame)}/>
  <rect x="266" y="636" width="168" height="218" rx="4" ${C(pal.art)}/>
  <g transform="translate(350 745)" fill="none" stroke-width="3" data-p="stroke" ${C(pal.artLine)}><rect x="-38" y="-38" width="76" height="76"/><rect x="-38" y="-38" width="76" height="76" transform="rotate(45)"/><circle r="16"/></g>
  <!-- chevet + lampe -->
  <rect x="20" y="1252" width="130" height="248" rx="10" ${C(pal.stand)}/>
  <rect x="8" y="1238" width="154" height="20" rx="7" ${C(pal.standTop)}/>
  <path d="M40 1330H130M40 1410H130" stroke-width="4" fill="none" data-p="stroke" ${C(pal.standTop)}/>
  <rect x="71" y="1150" width="8" height="90" ${C(pal.lampStem)}/>
  <path d="M52 1240Q75 1222 98 1240Z" ${C(pal.lampStem)}/>
  <path id="brShade" d="M28 1152L122 1152L106 1078L44 1078Z" ${C(pal.lampShade)}/>
  <circle id="brLampGlow" cx="75" cy="1130" r="430" fill="url(#brLampG)" opacity="0"/>
  <!-- lit -->
  <path d="M150 1484L150 1080Q150 1040 190 1040Q220 1040 220 1080L220 1484Z" ${C(pal.bedWood)}/>
  <rect x="190" y="1400" width="790" height="76" rx="20" ${C(pal.bedWood)}/>
  <rect x="210" y="1470" width="28" height="40" rx="6" ${C(pal.bedWoodDark)}/><rect x="930" y="1470" width="28" height="40" rx="6" ${C(pal.bedWoodDark)}/>
  <rect x="205" y="1298" width="770" height="112" rx="32" ${C(pal.sheet)}/>
  <path d="M228 1272Q228 1238 300 1236L400 1236Q452 1238 452 1272Q452 1304 400 1306L300 1306Q228 1304 228 1272Z" ${C(pal.pillow)}/>
  <g id="brPhoneBed" transform="translate(258 1286) rotate(-78)"><rect x="-14" y="-28" width="28" height="56" rx="6" fill="#1d1d1f"/><rect id="brPhoneScr" x="-11" y="-25" width="22" height="50" rx="4" fill="#2b2b30"/></g>
  <circle id="brPhoneGlow" cx="0" cy="0" r="240" fill="url(#brPhoneG)" opacity="0"/>
  <g id="brPerson"></g>
  <path d="M500 1288Q560 1258 650 1262L950 1266Q982 1270 982 1300L982 1416Q978 1440 950 1440L520 1440Q488 1436 486 1400L486 1330Q486 1296 500 1288Z" ${C(pal.blanket)}/>
  <path d="M610 1300Q650 1360 628 1436M770 1290Q800 1360 778 1438" fill="none" stroke-width="5" stroke-linecap="round" opacity=".55" data-p="stroke" ${C(pal.blanketLine)}/>
  <circle id="brPhoneGlow2" cx="0" cy="0" r="200" fill="url(#brPhoneG)" opacity="0"/>`;
  return {
    pal: palette(svgNode), person: svgNode.querySelector('#brPerson'), stars: svgNode.querySelector('#brStars'), moon: svgNode.querySelector('#brMoon'),
    phoneBed: svgNode.querySelector('#brPhoneBed'), phoneScr: svgNode.querySelector('#brPhoneScr'),
    glow: svgNode.querySelector('#brPhoneGlow'), glow2: svgNode.querySelector('#brPhoneGlow2'),
    lampGlow: svgNode.querySelector('#brLampGlow'), shade: svgNode.querySelector('#brShade'),
  };
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
  <path d="M228 1206L228 700A312 312 0 0 1 852 700L852 1206Z" ${C(p.frame)}/>
  <g clip-path="url(#dwGlass)">
    <rect x="250" y="400" width="580" height="800" fill="url(#dwSky)"/>
    <g id="dwStars">${starsMarkup(9, 34, 255, 410, 570, 480)}</g>
    <circle id="dwMoon" cx="700" cy="560" r="34" fill="#F6E7B8" mask="url(#dwMoonM)"/>
    <circle id="dwSunGlow" cx="540" cy="1200" r="300" fill="url(#dwSunG)"/>
    <circle id="dwSun" cx="540" cy="1200" r="62" fill="#FFE9B0"/>
    <path d="M250 1190V1110H292V1080H336V1120H372V1050H404V1100H446V1070L476 1070L476 1004Q506 960 536 1004L536 1070H558L558 1030L566 1030L566 940L572 926L578 940L578 1030L586 1030L586 1080H630V1040H668V1100H712V1060H748V1095H790V1068H830V1190Z" ${C(p.city)}/>
    <rect x="536" y="400" width="8" height="800" ${C(p.frame)}/><rect x="250" y="860" width="580" height="8" ${C(p.frame)}/>
  </g>
  <rect x="206" y="1186" width="668" height="28" rx="9" ${C(p.sill)}/>
  <path d="M150 -20L262 -20Q240 700 236 1240L150 1250Q132 700 150 -20Z" opacity=".5" ${C(p.curtain)}/>
  <path d="M930 -20L818 -20Q840 700 844 1240L930 1250Q948 700 930 -20Z" opacity=".5" ${C(p.curtain)}/>
  <path id="dwShaft" d="M262 1214L818 1214L1010 1920L70 1920Z" fill="url(#dwShaft)" opacity="0"/>
  <!-- tapis de prière -->
  <path d="M352 1332L728 1332L912 1884L168 1884Z" fill="#2E5E58"/>
  <path d="M368 1346L712 1346L884 1866L196 1866Z" fill="none" stroke="#D9A94E" stroke-width="10"/>
  <path d="M384 1360L696 1360L860 1850L220 1850Z" fill="#24504B"/>
  <path d="M470 1470L470 1420Q540 1352 610 1420L610 1470" fill="none" stroke="#D9A94E" stroke-width="6"/>
  <path d="M540 1650l26 26l-26 26l-26 -26z" fill="none" stroke="#D9A94E" stroke-width="5"/>
  <path d="M168 1884v20M206 1884v20M244 1884v20M282 1884v20M320 1884v20M358 1884v20M396 1884v20M434 1884v20M472 1884v20M510 1884v20M548 1884v20M586 1884v20M624 1884v20M662 1884v20M700 1884v20M738 1884v20M776 1884v20M814 1884v20M852 1884v20M890 1884v20" stroke="#E8D6B0" stroke-width="4"/>
  <ellipse cx="540" cy="1668" rx="230" ry="46" fill="#000" opacity=".18"/>
  <circle id="dwPhoneGlow" cx="540" cy="1430" r="260" fill="url(#dwPhoneG)" opacity="0"/>
  <g id="dwPerson"></g>`;
  return {
    pal: palette(svgNode), person: svgNode.querySelector('#dwPerson'), stars: svgNode.querySelector('#dwStars'), moon: svgNode.querySelector('#dwMoon'),
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
