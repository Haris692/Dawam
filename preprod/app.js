// ═══ FIREBASE AUTH ═══
const _fbConfig = {
  apiKey: "AIzaSyD1R9sIG79FLny3OxCD8OkLamQDlWoaDXo",
  authDomain: "mydawam-27a70.firebaseapp.com",
  projectId: "mydawam-27a70",
  storageBucket: "mydawam-27a70.firebasestorage.app",
  messagingSenderId: "1095852433935",
  appId: "1:1095852433935:web:efd5cfa6fff3efb4e9b97a"
};
firebase.initializeApp(_fbConfig);
const _auth = firebase.auth();
const _db = firebase.firestore();
// Persist auth across TWA/PWA restarts
_auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

let _authMode = 'login';
const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
// Masquer le bouton Google sur iOS (pas de compte Apple pour l'instant)
if (_isIOS) document.getElementById('auth-google-block').style.display = 'none';

function toggleAuthMode() {
  _authMode = _authMode === 'login' ? 'register' : 'login';
  const isReg = _authMode === 'register';
  document.getElementById('auth-confirm-wrap').style.display = isReg ? 'block' : 'none';
  document.getElementById('auth-submit-btn').textContent = isReg ? 'Créer mon compte' : 'Se connecter';
  document.getElementById('auth-mode-toggle').textContent = isReg ? 'Déjà un compte ? Se connecter' : 'Pas encore de compte ? Créer un compte';
  document.getElementById('auth-title').textContent = isReg ? 'Créer un compte 🌱' : 'Bon retour 🤲';
  document.getElementById('auth-forgot').style.display = isReg ? 'none' : 'block';
  document.getElementById('auth-error').textContent = '';
}

function _setAuthError(msg) { document.getElementById('auth-error').textContent = msg; }

function _setAuthContext(ctx) {
  const title = document.getElementById('auth-title');
  const sub   = document.getElementById('auth-sub');
  if (ctx === 'save') {
    title.textContent = 'Sauvegarde ton parcours 🌱';
    sub.textContent   = 'Crée un compte gratuit pour ne pas perdre ton programme.';
    // Pré-sélectionner le mode inscription
    if (typeof _authMode !== 'undefined' && _authMode !== 'register') toggleAuthMode();
  } else {
    title.textContent = 'Bon retour 🤲';
    sub.textContent   = 'Connecte-toi pour continuer ton chemin spirituel.';
  }
}

async function authApple() {
  _setAuthError('');
  const hasHandler = !!(window.webkit?.messageHandlers?.signInWithApple);
  if (window.isNativeIOSApp) {
    if (!hasHandler) {
      _setAuthError('Build trop ancien — installe la dernière version TestFlight.');
      return;
    }
    try {
      window.webkit.messageHandlers.signInWithApple.postMessage({});
    } catch(e) {
      _setAuthError('Erreur Apple : ' + e.message);
    }
  }
}

window.appleSignInResult = async function(payload) {
  try {
    // payload est un objet JSON passé depuis Swift (encodage fiable, nonce intact)
    const { idToken, nonce, fullName } = (typeof payload === 'string') ? JSON.parse(payload) : payload;
    const provider = new firebase.auth.OAuthProvider('apple.com');
    const credential = provider.credential({ idToken, rawNonce: nonce });
    const result = await _auth.signInWithCredential(credential);
    if (fullName && result.user && !result.user.displayName) {
      await result.user.updateProfile({ displayName: fullName });
    }
  } catch(e) {
    _setAuthError('Erreur Sign in with Apple : ' + (e.message || e.code));
  }
};

window.appleSignInError = function(msg) {
  if (msg && !msg.toLowerCase().includes('cancel')) {
    _setAuthError('Connexion Apple impossible.');
  }
};

async function authGoogle() {
  _setAuthError('');
  const provider = new firebase.auth.GoogleAuthProvider();
  // signInWithPopup partout — signInWithRedirect échoue dans TWA
  // (sessionStorage non partagée entre TWA WebView et Chrome Custom Tabs)
  try {
    await _auth.signInWithPopup(provider);
  } catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request') {
      // Fallback redirect si popup bloquée (navigateur strict)
      try { await _auth.signInWithRedirect(provider); } catch(e2) { _setAuthError('Connexion Google impossible.'); }
    } else if (e.code !== 'auth/popup-closed-by-user') {
      _setAuthError('Erreur Google : ' + (e.message || e.code));
    }
  }
}

let _pendingVerifyEmail = null; // Email en attente de vérification

function _showVerifyBlock(email) {
  _pendingVerifyEmail = email;
  document.getElementById('auth-verify-addr').textContent = email;
  // Masque le formulaire, affiche le bloc vérification
  ['auth-title','auth-sub','auth-apple-block','auth-google-block',
   'auth-email','auth-password','auth-forgot','auth-confirm-wrap',
   'auth-submit-btn','auth-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelector('.auth-toggle').style.display = 'none';
  document.getElementById('auth-verify-block').style.display = 'block';
}

function _hideVerifyBlock() {
  _pendingVerifyEmail = null;
  document.getElementById('auth-verify-block').style.display = 'none';
  document.getElementById('auth-verify-error').textContent = '';
  // Restaure le formulaire
  ['auth-title','auth-sub','auth-email','auth-password',
   'auth-forgot','auth-submit-btn','auth-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  document.querySelector('.auth-toggle').style.display = '';
  // Rétablit la visibilité des blocs Apple/Google selon la plateforme
  if (!_isIOS) document.getElementById('auth-google-block').style.display = '';
  if (window.isNativeIOSApp) document.getElementById('auth-apple-block').style.display = '';
}

async function checkEmailVerified() {
  const btn = document.querySelector('#auth-verify-block .btn-primary');
  btn.disabled = true; btn.textContent = '...';
  document.getElementById('auth-verify-error').textContent = '';
  // L'utilisateur a été déconnecté après inscription.
  // On lui montre à nouveau le formulaire de connexion pour qu'il se reconnecte —
  // onAuthStateChanged détectera alors que emailVerified = true et lancera l'app.
  _hideVerifyBlock();
  if (_authMode !== 'login') toggleAuthMode();
  document.getElementById('auth-email').value = _pendingVerifyEmail || '';
  _pendingVerifyEmail = null;
  document.getElementById('auth-password').focus();
  showToast('Entre ton mot de passe pour te connecter ✓');
  btn.disabled = false; btn.textContent = 'J\'ai cliqué sur le lien ✓';
}

async function resendVerificationEmail() {
  const btn = document.querySelector('.auth-verify-resend');
  btn.disabled = true;
  document.getElementById('auth-verify-error').textContent = '';
  try {
    if (_auth.currentUser) {
      await _auth.currentUser.sendEmailVerification();
    }
    showToast('Email renvoyé ✓');
  } catch(e) {
    document.getElementById('auth-verify-error').textContent = 'Impossible de renvoyer l\'email.';
  }
  setTimeout(() => { btn.disabled = false; }, 30000); // anti-spam 30s
}

async function authEmail() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  if (!email || !password) { _setAuthError('Remplis tous les champs.'); return; }
  const btn = document.getElementById('auth-submit-btn');
  btn.disabled = true; btn.textContent = '...';
  _setAuthError('');
  try {
    if (_authMode === 'register') {
      const confirm = document.getElementById('auth-confirm').value;
      if (password !== confirm) { _setAuthError('Les mots de passe ne correspondent pas.'); btn.disabled=false;btn.textContent='Créer mon compte'; return; }
      if (password.length < 6) { _setAuthError('Mot de passe trop court (6 min).'); btn.disabled=false;btn.textContent='Créer mon compte'; return; }
      const cred = await _auth.createUserWithEmailAndPassword(email, password);
      await cred.user.sendEmailVerification();
      _showVerifyBlock(email);
      // Déconnecte l'utilisateur — il doit d'abord vérifier son email
      await _auth.signOut();
      return;
    } else {
      const cred = await _auth.signInWithEmailAndPassword(email, password);
      if (!cred.user.emailVerified) {
        // Compte non vérifié : renvoie un email et déconnecte
        await cred.user.sendEmailVerification();
        _showVerifyBlock(email);
        await _auth.signOut();
        return;
      }
      // Vérifié → onAuthStateChanged gère la suite
    }
  } catch (e) {
    const msgs = {
      'auth/invalid-email':'Email invalide.',
      'auth/user-not-found':'Aucun compte avec cet email.',
      'auth/wrong-password':'Mot de passe incorrect.',
      'auth/invalid-credential':'Email ou mot de passe incorrect.',
      'auth/email-already-in-use':'Cet email est déjà utilisé.',
      'auth/too-many-requests':'Trop de tentatives, réessaie plus tard.',
      'auth/weak-password':'Mot de passe trop faible.',
    };
    _setAuthError(msgs[e.code] || 'Erreur : ' + e.message);
    btn.disabled = false;
    btn.textContent = _authMode === 'register' ? 'Créer mon compte' : 'Se connecter';
  }
}

async function authForgotPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { _setAuthError('Entre ton email d\'abord.'); return; }
  try {
    await _auth.sendPasswordResetEmail(email);
    _setAuthError('');
    showToast('Email de réinitialisation envoyé ✓');
  } catch (e) {
    _setAuthError('Email introuvable ou invalide.');
  }
}

function signOutUser() {
  if (!confirm('Se déconnecter de Dawam ?')) return;
  _auth.signOut().catch(() => showToast('Erreur lors de la déconnexion.'));
  // Navigation handled by onAuthStateChanged
}

// ═══ DATA ═══
const PROGRAM = [
  {id:1,  titleFr:"Prière de nuit",                emoji:"🌙", time:"Avant le Fajr",    xp:25, cat:"qiyam",   paliers:[5],       why:"Le Prophète ﷺ ne l'abandonnait jamais — ni en voyage ni à la maison."},
  {id:2,  titleFr:"Séance après l'aube",           emoji:"🌄", time:"Après le Fajr",     xp:20, cat:"aube",    paliers:[1,2,3,4,5], why:"Récompense d'un pèlerinage et d'une ʿumra complète. Complète."},
  {id:5,  titleFr:"Lecture du Coran",               emoji:"📖", time:"Dans la journée",   xp:15, cat:"journee", paliers:[2,3,4,5], why:"Récite le Coran régulièrement — même quelques versets par jour valent mieux qu'une lecture irrégulière."},
  {id:4,  titleFr:"Prières complémentaires",       emoji:"🤲", time:"Dans la journée",   xp:15, cat:"journee", paliers:[4,5],     why:"Une maison au Paradis pour chaque jour où tu les accomplis."},
  {id:7,  titleFr:"Témoignage d'unicité — 3×15min",emoji:"💫", time:"Dans la journée",   xp:20, cat:"journee", paliers:[4,5],     why:"« Renouvelez votre foi en répétant Lâ ilâha illâ Llâh. » — Ahmad"},
  {id:8,  titleFr:"Bénédictions sur le Prophète ﷺ",emoji:"💚", time:"Toute la journée",  xp:20, cat:"journee", paliers:[2,3,4,5], why:"Chaque bénédiction t'en vaut 10 d'Allah et efface 10 péchés."},
  {id:10, titleFr:"Obligations de l'étudiant",     emoji:"📚", time:"Dans la journée",   xp:15, cat:"journee", paliers:[5],       why:"La recherche du savoir est une obligation pour tout musulman."},
  {id:11, titleFr:"Cercle de foi",                 emoji:"🤝", time:"Dans la journée",   xp:20, cat:"journee", paliers:[5],       why:"Les cercles d'évocation sont les jardins du Paradis sur Terre."},
  {id:12, titleFr:"Acquisition du savoir",         emoji:"📗", time:"Dans la journée",   xp:15, cat:"journee", paliers:[5],       why:"Allah facilite le chemin vers le Paradis à celui qui cherche le savoir."},
  {id:13, titleFr:"Garde du temps",                emoji:"⏰", time:"Dans la journée",   xp:10, cat:"journee", paliers:[5],       why:"« Tu n'es qu'un ensemble de jours — chaque jour qui passe t'emporte. »"},
  {id:15, titleFr:"Invocations du soir",            emoji:"🌆", time:"Ce soir",           xp:15, cat:"soir",    paliers:[1,2,3,4,5], why:"Les invocations du soir sont ton bouclier de la nuit — elles protègent jusqu'au matin."},
  {id:16, titleFr:"Séance du soir",                emoji:"🌙", time:"Après Isha",         xp:20, cat:"nuit",    paliers:[2,3,4,5],   why:"Clore la journée dans l'évocation de Dieu — c'est le sceau du croyant."},
  {id:9,  titleFr:"Convenances du sommeil",        emoji:"🛌", time:"Avant de dormir",   xp:15, cat:"nuit",    paliers:[1,2,3,4,5], why:"L'ange prie pour toi toute la nuit si tu dors en état de pureté."},
];
const PALIER = {
  1:{name:"L'Éveillé",   nameAr:"النَّاشِئ",    emoji:"🌑", desc:"Le premier pas est le plus courageux."},
  2:{name:"Le Marcheur", nameAr:"السَّالِك",    emoji:"🌒", desc:"Tu as un rythme. Construisons dessus."},
  3:{name:"Le Constant", nameAr:"المُدَاوِم",   emoji:"🌓", desc:"La fondation est solide. Approfondissons."},
  4:{name:"Le Déterminé",nameAr:"المُتَزَوِّد", emoji:"🌔", desc:"La structure est en place. Allons plus loin."},
  5:{name:"Le Vaillant", nameAr:"المُجَاهِد",   emoji:"🌕", desc:"Programme complet — la constance est ta bataille."},
};
const SECTIONS = {
  qiyam:   {label:"Dernier tiers de la nuit", emoji:"🌙"},
  aube:    {label:"À l'aube",                 emoji:"🌄"},
  journee: {label:"Dans la journée",          emoji:"☀️"},
  soir:    {label:"Ce soir",                  emoji:"🌇"},
  nuit:    {label:"Avant de dormir",          emoji:"🌙"},
};
const WEEK_THEMES = [
  {
    title: "La constance dans les adorations",
    goal: "Accomplir chaque étape sans exception, même petitement",
    encouragement: "« L'acte le plus aimé d'Allah est celui accompli régulièrement, même s'il est petit. » — Bukhari",
  },
  {
    title: "L'intention sincère",
    goal: "Renouveler l'intention à chaque action : tout pour Allah",
    encouragement: "« Les actes ne valent que par leurs intentions, et chacun n'a que ce qu'il a eu l'intention de faire. » — Bukhari & Muslim",
  },
  {
    title: "La présence du cœur",
    goal: "Ralentir — lire le Coran lentement, faire le dhikr avec conscience",
    encouragement: "« Allah n'exauce pas l'invocation d'un cœur distrait et inattentif. » — Tirmidhi",
  },
  {
    title: "La patience et la gratitude",
    goal: "Remercier Allah à chaque étape accomplie, même la plus petite",
    encouragement: "« Étrange est l'affaire du croyant... si un bien l'atteint, il rend grâces, si une épreuve l'atteint, il est patient. » — Muslim",
  },
];
const MOTIVS = [
  '"L\'acte le plus aimé d\'Allah est celui accompli régulièrement, même s\'il est petit."',
  '"Chaque jour qui passe est une partie de toi qui s\'en va."',
  '"Sache qu\'il est des œuvres propres au jour que Dieu n\'accepte pas la nuit."',
  "Reprends là où tu t'es arrêté — la porte est toujours ouverte.",
  "Continue, barakAllahu fik — la constance est plus aimée que l'abondance.",
  '"Petit, mais constant." — c\'est ton chemin.',
];

// ═══ INVOCATIONS DATA ═══
const _ADHKAR_COMMUN = [
  { arabic:"أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ", phonetic:"Astaghfiru llaha lladhi la ilaha illa Huwa l-Hayyu l-Qayyumu wa atubu ilayh", french:"Je demande pardon à Allah, Celui en dehors duquel il n'y a pas de divinité, le Vivant, le Subsistant, et je me repens à Lui.", repeat:3, source:"Abu Dawud & Tirmidhi" },
  { arabic:"حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", phonetic:"Hasbiyallahu la ilaha illa Huwa, 'alayhi tawakkaltu, wa Huwa Rabbu l-'arshi l-'azim", french:"Allah me suffit. Nul dieu qu'Lui. En Lui je place ma confiance. Il est le Seigneur du Trône immense.", repeat:7, source:"Abu Dawud" },
  { arabic:"اللَّهُمَّ أَجِرْنِي مِنَ النَّارِ", phonetic:"Allahumma ajirni mina n-nar", french:"Ô Allah, préserve-moi du Feu.", repeat:7, source:"Abu Dawud & Nasa'i" },
  { arabic:"لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ", phonetic:"La hawla wa la quwwata illa billahi l-'aliyyi l-'azim", french:"Il n'y a de force ni de puissance qu'en Allah, le Très-Haut, l'Immense.", repeat:10, source:"Bukhari & Muslim" },
  { arabic:"لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَيُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", phonetic:"La ilaha illallah wahdahu la sharika lah, lahul mulku walahul hamd, wa yuhyi wa yumitu, wa Huwa 'ala kulli shay'in qadir", french:"Nul dieu qu'Allah Seul, sans associé. À Lui la royauté, à Lui la louange. Il donne la vie et donne la mort. Il est Omnipotent.", repeat:10, source:"Tirmidhi" },
  { arabic:"سُورَةُ الْإِخْلَاصِ", phonetic:"Qul Huwa llahu Ahad, Allahu s-Samad, lam yalid wa lam yulad, wa lam yakun lahu kufuwan ahad", french:"Sourate Al-Ikhlas — Dis : Il est Allah, Unique. Allah, le Seul à qui on s'adresse. Il n'engendre pas et n'est pas engendré. Et nul n'est égal à Lui.", repeat:10, source:"Coran 112" },
  { arabic:"سُورَةُ الْفَلَقِ + سُورَةُ النَّاسِ", phonetic:"Qul a'udhu bi Rabbi l-falaq... / Qul a'udhu bi Rabbi n-nas...", french:"Sourate Al-Falaq + Sourate An-Nas — les deux protections.", repeat:3, source:"Coran 113-114" },
  { arabic:"سُبْحَانَ اللَّهِ الْعَظِيمِ وَبِحَمْدِهِ", phonetic:"SubhanAllahi l-'azimi wa bihamdih", french:"Gloire à Allah l'Immense et louange à Lui.", repeat:3, source:"Bukhari & Muslim" },
];
const ADHKAR = {
  matin: [
    ..._ADHKAR_COMMUN,
    { arabic:"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", phonetic:"SubhanAllahi wa bihamdih", french:"Gloire à Allah et louange à Lui.", repeat:100, source:"Muslim", note:"Au lever du soleil" },
    { arabic:"لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", phonetic:"La ilaha illallah wahdahu la sharika lah, lahul mulku walahul hamd, wa Huwa 'ala kulli shay'in qadir", french:"Nul dieu qu'Allah Seul, sans associé. À Lui la royauté, à Lui la louange. Il est Omnipotent.", repeat:100, source:"Bukhari & Muslim", note:"Au lever du soleil" },
  ],
  soir: [..._ADHKAR_COMMUN],
};
const DHIKR_LIST = [
  { title:"La demande de pardon — Istighfar", arabic:"رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ", phonetic:"Rabi ghfir li wa toub 'alayya innaka anta t-tawwabou-r-Rahim", french:"Seigneur pardonne-moi et accepte mon repentir. Tu es Celui qui accepte le repentant et le Très Miséricordieux.", repeat:100, source:"Al-Bukhari" },
  { title:"La prière sur le Prophète ﷺ — Salawat", arabic:"اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ النَّبِيِّ، وَأَزْوَاجِهِ أُمَّهَاتِ الْمُؤْمِنِينَ، وَذُرِّيَّتِهِ وَأَهْلِ بَيْتِهِ، كَمَا صَلَّيْتَ عَلَى سَيِّدِنَا إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ", phonetic:"Allahumma salli 'ala Sayyidina Muhammadin-n-nabi wa azwajihi ummahati-l-mu'minin wa dhurriyyatihi wa ahli baytihi, kama sallayta 'ala Sayyidina Ibrahim, innaka Hamidou-Majid", french:"Ô Allah ! Prie sur notre maître Muhammad le prophète, sur ses femmes les mères des croyants, sur sa descendance et les gens de sa maison, comme Tu as prié sur notre maître Ibrahim. Tu es certes le Digne d'éloge, le Glorieux.", repeat:100, source:"Coran 33:56 & Al-Bukhari" },
  { title:"Le meilleur dhikr — Tahlil", arabic:"لَا إِلَهَ إِلَّا اللَّه", phonetic:"Lâ ilâha illa Llâh", french:"Il n'y a point de divinité à part Dieu.", repeat:100, source:"Ahmad & Mousnab" },
];

// ═══ STATE ═══
const STORAGE_KEY = "dawam_pwa_v1";
let S = {name:"",profile:{salat:0,quran:0,witr:0,type:"worker",goal:[],city:""},palier:1,weekNumber:1,totalDays:0,checklist:{},lastDate:null,history:[],customSteps:null,prayerTimes:null,versetSelection:[],versetLastStep:0,premium:false};
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(S));}
function load(){try{const r=localStorage.getItem(STORAGE_KEY);if(r)S={...S,...JSON.parse(r)};}catch{}}


// ═══ PATH ═══
function getGreet(){const h=new Date().getHours();if(h<6)return"Bonne nuit";if(h<12)return"Bonjour";if(h<17)return"Bon après-midi";if(h<20)return"Bonne soirée";return"Bonsoir";}
function getTimeLabel(){const h=new Date().getHours(),m=String(new Date().getMinutes()).padStart(2,"0");return`${h}h${m}`;}
function inRange(cur,start,end){if(start<=end)return cur>=start&&cur<end;return cur>=start||cur<end;}
function getCurrentCat(){
  const now=new Date();
  const cur=now.getHours()*60+now.getMinutes();
  const pt=S.prayerTimes;
  if(pt&&pt.Fajr&&pt.Sunrise&&pt.Maghrib&&pt.Isha){
    const fajr=parseTime(pt.Fajr),sunrise=parseTime(pt.Sunrise);
    const maghrib=parseTime(pt.Maghrib),isha=parseTime(pt.Isha);
    const midnight=parseTime(pt.Midnight||"00:00");
    if(inRange(cur,fajr,sunrise))return"aube";
    if(inRange(cur,sunrise,maghrib))return"journee";
    if(inRange(cur,maghrib,isha))return"soir";
    if(inRange(cur,isha,midnight))return"nuit";
    return"qiyam";
  }
  const h=now.getHours();
  if(h>=5&&h<8)return"aube";
  if(h>=8&&h<18)return"journee";
  if(h>=18&&h<21)return"soir";
  if(h>=21||h<3)return"nuit";
  return"qiyam";
}
// ═══ PRAYER ITEMS (dynamic, based on S.profile.prayers) ═══
const PRAYER_META = {
  fajr:   {id:100,titleFr:"Fajr",      emoji:"🌅",time:"À l'aube",          xp:20,cat:"aube",    ar:"الفجر"},
  dhuhr:  {id:101,titleFr:"Dhuhr",     emoji:"☀️", time:"À midi",            xp:20,cat:"journee", ar:"الظهر"},
  asr:    {id:102,titleFr:"Asr",       emoji:"🌤️", time:"Dans l'après-midi", xp:20,cat:"journee", ar:"العصر"},
  maghrib:{id:103,titleFr:"Maghrib",   emoji:"🌇",time:"Au coucher du soleil",xp:20,cat:"soir",   ar:"المغرب"},
  isha:   {id:104,titleFr:"Isha",      emoji:"🌙",time:"En soirée",          xp:20,cat:"nuit",    ar:"العشاء"},
};
function getPrayerFlow(id){
  const p=S.palier||1;
  const invocations={emoji:'📿',title:'Invocations après la prière',desc:'Subhanallah ×33, Alhamdulillah ×33, Allahu Akbar ×34.',arabic:'سُبْحَانَ اللَّهِ · الْحَمْدُ لِلَّهِ · اللَّهُ أَكْبَرُ',phonetic:'Subḥānallāh · Alḥamdulillāh · Allāhu Akbar'};
  const ablutions={emoji:'💧',title:'Fais les ablutions',desc:'Prépare-toi intérieurement. Les ablutions sont le début de la prière.'};
  if(id===100){
    const steps=[ablutions];
    if(p>=3)steps.push({emoji:'🌅',title:'Sunna de Fajr — 2 raka\'at',desc:'Ces 2 raka\'at sont plus chères au Prophète ﷺ que le monde entier.',tip:'« Les 2 raka\'at de l\'aube valent mieux que le monde et ce qu\'il contient. » — Muslim'});
    steps.push({emoji:'🤲',title:'Fajr — 2 raka\'at obligatoires',desc:'Avec présence du cœur. Lis lentement, sens chaque verset.'});
    steps.push(invocations);
    return{type:'steps',steps};
  }
  if(id===101){
    const steps=[ablutions];
    if(p>=4)steps.push({emoji:'☀️',title:'Prière volontaire avant — 4 raka\'at',desc:'2+2 raka\'at avant Dhuhr. Le Prophète ﷺ ne les abandonnait presque jamais.',tip:'« Celui qui maintient les 4 raka\'at avant et après Dhuhr, Allah lui interdit le feu. » — At-Tirmidhī'});
    steps.push({emoji:'🤲',title:'Dhuhr — 4 raka\'at obligatoires',desc:'4 raka\'at avec présence et recueillement.'});
    if(p>=3)steps.push({emoji:'🕌',title:'Prière volontaire après — 2 raka\'at',desc:'2 raka\'at après Dhuhr. Complète ta prière.'});
    steps.push(invocations);
    return{type:'steps',steps};
  }
  if(id===102){
    return{type:'steps',steps:[
      ablutions,
      {emoji:'🌤️',title:'Asr — 4 raka\'at obligatoires',desc:'Prends le temps de bien les accomplir. L\'Asr est une prière de haute valeur.',tip:'« Celui qui rate l\'Asr — c\'est comme s\'il avait perdu sa famille et ses biens. » — Al-Bukhāri'},
      invocations,
    ]};
  }
  if(id===103){
    const steps=[ablutions,{emoji:'🌇',title:'Maghrib — 3 raka\'at obligatoires',desc:'Prie dès l\'entrée du temps. Le Prophète ﷺ se hâtait pour Maghrib.',tip:'« Priez Maghrib à l\'entrée de son temps, car c\'est là que les étoiles commencent à apparaître. » — Ahmad'}];
    if(p>=3)steps.push({emoji:'🕌',title:'Prière volontaire après — 2 raka\'at',desc:'2 raka\'at après Maghrib. Ou 6 si tu veux plus.'});
    steps.push(invocations);
    return{type:'steps',steps};
  }
  if(id===104){
    const steps=[ablutions,{emoji:'🌙',title:'Isha — 4 raka\'at obligatoires',desc:'La dernière prière de la journée. Termine-la avec présence.',tip:'« Celui qui prie Isha en groupe, c\'est comme s\'il avait prié la moitié de la nuit. » — Muslim'}];
    if(p>=3)steps.push({emoji:'🕌',title:'Prière volontaire après — 2 raka\'at',desc:'2 raka\'at après Isha. Puis le Witr si tu ne le fais pas plus tard.'});
    steps.push(invocations);
    return{type:'steps',steps};
  }
  return null;
}
function getPrayerItems(){
  const prayers=S.profile?.prayers||[];
  return prayers.map(p=>PRAYER_META[p]).filter(Boolean);
}
function getActiveItems(){
  const prayers=getPrayerItems();
  let base;
  if(S.customSteps&&S.customSteps.length>0)base=PROGRAM.filter(i=>S.customSteps.includes(i.id));
  else base=PROGRAM.filter(i=>i.paliers.includes(S.palier));
  // Inject prayers first (they appear in their natural time slot)
  return [...prayers,...base];
}
function checkNewDay(){
  const today=new Date().toISOString().split("T")[0];
  if(S.lastDate&&S.lastDate!==today){
    const checked=Object.values(S.checklist).filter(Boolean).length;
    S.history.push({date:S.lastDate,checked,total:getActiveItems().length});
    if(S.history.length>30)S.history.shift();
    S.totalDays++;S.checklist={};
  }
  S.lastDate=today;save();
}

function updateProgRing(checked,total,pct,allDone,curCat,items){
  const C=175.9; // 2*π*28
  const arc=document.getElementById('prog-ring-arc');
  if(arc){
    arc.style.strokeDashoffset=(C*(1-(allDone?1:pct/100))).toFixed(1);
    arc.style.stroke=allDone?'var(--green)':'var(--accent)';
  }
  const pctEl=document.getElementById('prog-ring-pct');
  if(pctEl) pctEl.textContent=allDone?'✓':`${pct}%`;

  // Prochaine action
  const catOrder=['qiyam','aube','journee','soir','nuit'];
  const curIdx=catOrder.indexOf(curCat);
  const futCats=catOrder.slice(curIdx+1);
  const nextItem=items.find(i=>!S.checklist[i.id]&&!futCats.includes(i.cat));
  const nextEl=document.getElementById('prog-next-label');
  if(nextEl){
    if(allDone||!nextItem){nextEl.style.display='none';nextEl.textContent='';}
    else{nextEl.style.display='flex';nextEl.textContent=(nextItem.cat===curCat?'Maintenant':'Prochaine étape')+' · '+nextItem.titleFr;}
  }

  // Cards période
  const periodEl=document.getElementById('prog-period-row');
  if(!periodEl)return;
  const activeCats=catOrder.filter(c=>items.some(i=>i.cat===c));
  periodEl.innerHTML=activeCats.map(cat=>{
    const ci=items.filter(i=>i.cat===cat);
    const cd=ci.filter(i=>S.checklist[i.id]).length;
    const cp=ci.length>0?Math.round(cd/ci.length*100):0;
    const catIdx=catOrder.indexOf(cat);
    const statusCls=catIdx<curIdx?(cd===ci.length?'done':'missed'):cat===curCat?'active':'';
    const sec=SECTIONS[cat];
    return `<div class="pcard ${statusCls}" onclick="scrollToSection('${cat}')"><div class="pcard-emoji">${sec.emoji}</div><div class="pcard-frac">${cd}/${ci.length}</div><div class="pcard-bar"><div class="pcard-fill" style="width:${cp}%"></div></div></div>`;
  }).join('');
}
function renderPath(){
  checkNewDay();
  const items=getActiveItems();
  const checked=Object.values(S.checklist).filter(Boolean).length;
  const total=items.length;
  const pct=total>0?Math.round(checked/total*100):0;
  const allDone=checked===total&&total>0;
  const pi=PALIER[S.palier];
  const curCat=getCurrentCat();

  const moonHtml=[1,2,3,4,5].map(k=>`<span style="opacity:${k<=S.palier?1:.22};font-size:${k===S.palier?'15px':'11px'};transition:opacity .3s">${PALIER[k].emoji}</span>`).join('');
  document.getElementById("hero-chip").innerHTML=`<span class="palier-moons">${moonHtml}</span>&nbsp;${pi.name}`;
  document.getElementById("hero-name").textContent=(S.name?`Bonjour, ${S.name}`:"Bonjour");
  document.getElementById("hero-motiv").textContent=MOTIVS[Math.floor(Math.random()*MOTIVS.length)];
  document.getElementById("prog-label").textContent=allDone?"Journée complète !": `${checked} / ${total} objectifs`;
  document.getElementById("prog-right").textContent=allDone?"Ma sha Allah 🌟":`${pct}% accompli`;
  document.getElementById("pill-constance").textContent=`Semaine ${S.weekNumber} · ${pi.name}`;
  updateProgRing(checked,total,pct,allDone,curCat,items);

  const body=document.getElementById("path-body");
  body.innerHTML="";

  // Bandeau discret si notifs pas activées, prompt déjà vu, et bandeau pas fermé définitivement
  if(S.notifAsked && !S.notifs?.pushSub && !S.notifBannerDismissed){
    body.innerHTML+=`<div class="notif-banner fade-up">
      <span style="font-size:20px">🔔</span>
      <span class="notif-banner-text">Active les rappels pour rester constant.</span>
      <button class="notif-banner-btn" onclick="activateNotifsFromPrompt()">Activer</button>
      <button class="notif-banner-close" onclick="this.closest('.notif-banner').remove();S.notifBannerDismissed=true;save()">✕</button>
    </div>`;
  }

  // Carte feedback après 3 jours d'utilisation
  if(S.totalDays>=3 && !S.feedbackDone && !S.feedbackNudgeDismissed){
    body.innerHTML+=`<div class="notif-banner fade-up" style="border-left-color:var(--green)">
      <span style="font-size:20px">💬</span>
      <span class="notif-banner-text">3 jours avec Dawam — ton avis nous aide à améliorer l'app.</span>
      <button class="notif-banner-btn" style="background:rgba(59,109,17,.1);color:var(--green)" onclick="S.feedbackNudgeDismissed=true;save();showFeedbackModal()">Donner mon avis</button>
      <button class="notif-banner-close" onclick="this.closest('.notif-banner').remove();S.feedbackNudgeDismissed=true;save()">✕</button>
    </div>`;
  }

  // Ordre temporel et détection des sections futures (verrouillées)
  const catOrder=["qiyam","aube","soir","nuit"];
  const curIdx=catOrder.indexOf(curCat);
  const futureCats=catOrder.slice(curIdx+1);

  // Next action — uniquement dans les sections accessibles maintenant ou passées
  if(!allDone){
    const next=items.find(i=>!S.checklist[i.id]&&!futureCats.includes(i.cat));
    if(next){
      const secLabel=SECTIONS[next.cat]?.label||next.time;
      const isCur=next.cat===curCat;
      body.innerHTML+=`<div class="next-action-card fade-up">
        <div class="next-action-label">${isCur?"● Maintenant":"● Prochaine étape"} · ${secLabel}</div>
        <div class="next-action-row">
          <div class="next-action-icon">${next.emoji}</div>
          <div style="flex:1"><div class="next-action-title">${next.titleFr}</div><div class="next-action-sub">${next.time}</div></div>
        </div>
        <button class="btn-primary" onclick="openGuided(${next.id})">Voir l'action →</button>
      </div>`;
    }
  } else {
    body.innerHTML+=`<div class="all-done-card fade-up"><div class="all-done-emoji">🌟</div><div class="all-done-text">Journée complète — Ma sha Allah !</div></div>`;
  }

  // Programme de la semaine
  const wt=WEEK_THEMES[(S.weekNumber-1)%WEEK_THEMES.length];
  body.innerHTML+=`<div class="prog-week-card fade-up" style="animation-delay:.05s">
    <div class="prog-week-header">
      <span class="prog-week-badge">Semaine ${S.weekNumber}</span>
      <span class="prog-week-palier">${pi.emoji} ${pi.name}</span>
    </div>
    <div class="prog-week-title">${wt.title}</div>
    <div class="prog-week-goal">🎯 ${wt.goal}</div>
    <div class="prog-week-divider"></div>
    <div class="prog-week-encouragement">${wt.encouragement}</div>
    <div class="prog-week-progress">
      <div class="prog-week-bar"><div class="prog-week-fill" style="width:${pct}%"></div></div>
      <span class="prog-week-count">${checked} / ${total} étapes accomplies · ${pct}%</span>
    </div>
  </div>`;

  // Helper : génère le HTML d'une section selon son statut
  const renderSection = (cat, si, status) => {
    const catItems = items.filter(i => i.cat === cat);
    if (!catItems.length) return '';
    const sec = SECTIONS[cat];
    const secChecked = catItems.filter(i => S.checklist[i.id]).length;
    const isFut = status === 'future';
    const isPast = status === 'past';
    const isCur = status === 'current';
    const allSecDone = secChecked === catItems.length;

    const lockSvg = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--text-light)" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="5.5" width="7" height="5.5" rx="1.2"/><path d="M4.5 5.5V4a1.5 1.5 0 0 1 3 0v1.5"/></svg>`;

    const itemsHtml = catItems.map(item => {
      const done = !!S.checklist[item.id];
      if (isFut || isPast) return `<div class="item-row" onclick="openItemPreview(${item.id})" style="cursor:pointer">
        <div class="item-text"><div class="item-title" style="opacity:.7">${item.emoji} ${item.titleFr}</div>${item.why?`<div class="item-why">${item.why}</div>`:''}</div>
        ${isPast && done ? `<span style="font-size:16px">✓</span>` : isPast ? `<span class="missed-badge">Manqué</span>` : `<span style="font-size:13px;color:var(--text-light);flex-shrink:0">›</span>`}
      </div>`;
      return `<div class="item-row${done ? ' checked' : ''}" onclick="openItemPreview(${item.id})" style="cursor:pointer">
        <div class="item-row-main">
          <div class="item-check"><svg class="item-check-icon" width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <div class="item-text"><div class="item-title">${item.emoji} ${item.titleFr}</div><div class="item-sub">${item.time}</div></div>
        </div>
        ${item.why?`<div class="item-why"><span class="item-why-icon">ⓘ</span>${item.why}</div>`:''}
      </div>`;
    }).join('');

    const collapsed = isPast;
    const badgeRight = isFut
      ? `<span class="section-header-badge" style="color:var(--text-light)">🔒</span>`
      : isCur ? `<span class="section-current-badge">● Maintenant</span>` : '';
    const doneBadge = allSecDone ? `<span class="section-header-badge" style="color:var(--green)">✓ ${secChecked}/${catItems.length}</span>` : `<span class="section-header-badge">${secChecked}/${catItems.length}</span>`;

    return `<div id="section-${cat}" class="section-block${isPast ? ' past-block' : ''} fade-up" style="animation-delay:${.1+si*.03}s">
      <div class="section-header" onclick="toggleSection(this)">
        <div class="section-header-left"><span class="section-header-emoji">${sec.emoji}</span><span class="section-header-label">${sec.label}</span></div>
        <div style="display:flex;align-items:center;gap:6px">${badgeRight}${doneBadge}</div>
      </div>
      <div class="section-items"${collapsed ? ' style="display:none"' : ''}>${itemsHtml}</div>
    </div>`;
  };

  const hasCur = items.some(i => i.cat === curCat);
  if (hasCur) {
    body.innerHTML += renderSection(curCat, 0, 'current');
  }
}

function toggleSection(h){const items=h.nextElementSibling;const hidden=items.style.display==="none";items.style.display=hidden?"flex":"none";if(hidden)items.style.flexDirection="column";}
function scrollToSection(cat){
  const el=document.getElementById('section-'+cat);
  if(!el)return;
  // Si la section est repliée (passé), on la déplie d'abord
  const itemsDiv=el.querySelector('.section-items');
  if(itemsDiv&&itemsDiv.style.display==='none'){itemsDiv.style.display='flex';itemsDiv.style.flexDirection='column';}
  const screen=document.getElementById('path');
  if(!screen)return;
  const offset=el.getBoundingClientRect().top - screen.getBoundingClientRect().top + screen.scrollTop - 12;
  screen.scrollTo({top:offset,behavior:'smooth'});
}

function patchAfterToggle(id) {
  // Met à jour le row en place sans toucher au DOM global
  document.querySelectorAll('.item-check').forEach(check => {
    if (check.getAttribute('onclick')?.includes(`toggleItem(${id})`)) {
      const row = check.closest('.item-row');
      if (!row) return;
      const done = !!S.checklist[id];
      row.classList.toggle('checked', done);
      const icon = check.querySelector('.item-check-icon');
      if (icon) icon.style.display = done ? 'block' : 'none';
      const title = row.querySelector('.item-title');
      if (title) title.style.textDecoration = done ? 'line-through' : '';
    }
  });

  // Met à jour la barre de progression sans re-render
  const items = getActiveItems();
  const checked = Object.values(S.checklist).filter(Boolean).length;
  const total = items.length;
  const pct = total > 0 ? Math.round(checked / total * 100) : 0;
  const allDone = checked === total && total > 0;
  document.getElementById('prog-label').textContent = allDone ? 'Journée complète !' : `${checked} / ${total} objectifs`;
  document.getElementById('prog-right').textContent = allDone ? 'Ma sha Allah 🌟' : `${pct}% accompli`;
  updateProgRing(checked, total, pct, allDone, getCurrentCat(), items);
}

function renderPathSmooth() {
  const body = document.getElementById('path-body');
  body.style.opacity = '0';
  setTimeout(() => { renderPath(); body.style.opacity = '1'; }, 180);
}

function toggleItem(id) {
  S.checklist[id] = !S.checklist[id];
  save();

  if (S.checklist[id]) {
    // Notif prompt après le 1er check si pas encore demandé et pas encore abonné
    if(!S.notifAsked&&!(S.notifs?.pushSub)){
      S.notifAsked=true;save();
      setTimeout(()=>document.getElementById('notif-prompt')?.classList.add('show'),1800);
    }
    patchAfterToggle(id);
    animateItemComplete(id);

    const items = getActiveItems();
    const allDone = items.every(i => S.checklist[i.id]);
    if (allDone) {
      setTimeout(() => { renderPathSmooth(); fireCompletionOverlay(); }, 750);
    } else {
      const TOASTS = [
        "✓ barakAllahu fik",
        "✓ Ma sha Allah — continue !",
        "✓ Petit mais constant ✦",
        "✓ Accompli — la constance, c'est ça",
      ];
      const done = items.filter(i => S.checklist[i.id]).length;
      showToast(TOASTS[(done - 1) % TOASTS.length]);
      setTimeout(() => renderPathSmooth(), 750);
    }
  } else {
    renderPathSmooth();
  }

  if (document.getElementById('profil').classList.contains('active')) renderProfil();
}

// ═══ INVOCATIONS ═══
let _invocTab = 'matin';
function switchInvocTab(tab, el) {
  _invocTab = tab;
  document.querySelectorAll('.invoc-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderInvocContent();
}
function renderInvocContent() {
  const el = document.getElementById('invoc-content');
  if (!el) return;
  if (_invocTab === 'dhikr') {
    el.innerHTML = `<div class="seance-launch-btn" onclick="openSeanceDhikr()">
      <span style="font-size:24px">📿</span>
      <div class="seance-launch-info">
        <div class="seance-launch-title">Lancer une séance guidée</div>
        <div class="seance-launch-sub">Définis ta durée par invocation</div>
      </div>
      <span style="color:var(--accent);font-size:20px;font-weight:300">›</span>
    </div>` + DHIKR_LIST.map(d => `
      <div class="invoc-card">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-family:var(--font-display);font-size:15px;font-weight:600;color:var(--text)">${d.title}</span>
          ${d.repeat ? `<span class="invoc-repeat">× ${d.repeat}</span>` : ''}
        </div>
        <div class="invoc-arabic">${d.arabic}</div>
        <div class="invoc-phonetic">${d.phonetic}</div>
        <div class="invoc-french">${d.french}</div>
        ${d.note ? `<div style="background:var(--green-light);border-radius:8px;padding:8px 10px;margin-top:8px;margin-bottom:6px;font-size:12px;color:var(--green);line-height:1.5">${d.note}</div>` : ''}
        <div class="invoc-source">${d.source}</div>
      </div>`).join('');
  } else {
    const items = ADHKAR[_invocTab] || [];
    el.innerHTML = items.map((a, i) => `
      <div class="invoc-card" style="animation:fadeUp .3s ease ${i * 0.04}s both">
        ${a.note ? `<div style="font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">${a.note}</div>` : ''}
        <span class="invoc-repeat">× ${a.repeat}</span>
        <div class="invoc-arabic">${a.arabic}</div>
        <div class="invoc-phonetic">${a.phonetic}</div>
        <div class="invoc-french">${a.french}</div>
        <div class="invoc-source">${a.source}</div>
      </div>`).join('');
  }
}
function renderInvocations() {
  // Sync tabs visuals with current state
  document.querySelectorAll('.invoc-tab').forEach((t, i) => {
    const tabs = ['matin','soir','dhikr'];
    t.classList.toggle('active', tabs[i] === _invocTab);
  });
  renderInvocContent();
}

// ═══ PROFIL ═══
function animateItemComplete(itemId) {
  let targetRow = null;
  document.querySelectorAll('.item-check').forEach(check => {
    if (check.getAttribute('onclick')?.includes(`toggleItem(${itemId})`)) {
      targetRow = check.closest('.item-row');
    }
  });
  if (!targetRow) return;

  const check = targetRow.querySelector('.item-check');
  if (check) {
    check.style.background = '#3B6D11';
    check.style.borderColor = '#3B6D11';
    const svg = check.querySelector('svg');
    if (svg) { svg.style.opacity='1'; svg.style.transform='scale(1)'; svg.style.animation='checkPop .35s cubic-bezier(.34,1.56,.64,1) both'; }
    let ring = check.querySelector('.item-check-ring');
    if (!ring) { ring = document.createElement('div'); ring.className='item-check-ring'; check.appendChild(ring); }
    ring.className = 'item-check-ring';
    setTimeout(() => ring.classList.add('fire'), 10);
  }

  let starWrap = targetRow.querySelector('.item-star-wrap');
  if (!starWrap) {
    starWrap = document.createElement('div');
    starWrap.className = 'item-star-wrap';
    starWrap.innerHTML = '<span class="item-star">✦</span><span class="item-star">✦</span><span class="item-star">✦</span>';
    targetRow.appendChild(starWrap);
  }
  setTimeout(() => {
    starWrap.querySelectorAll('.item-star').forEach((s, i) => {
      setTimeout(() => s.classList.add('fire'), i * 75);
    });
  }, 80);


  setTimeout(() => { targetRow.style.background = 'rgba(59,109,17,.04)'; }, 150);
}

function fireCompletionOverlay() {
  const overlay = document.getElementById('dawam-completion-overlay');
  const star = document.getElementById('dawam-center-star');
  const msg = document.getElementById('dawam-completion-msg');
  if (!overlay) return;

  overlay.classList.add('show');
  star.classList.add('fire');
  msg.classList.add('fire');

  const classes = ['fire-a','fire-b','fire-c','fire-d','fire-e','fire-f'];
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById('dcp' + i);
    if (el) el.classList.add(classes[i - 1]);
  }

  setTimeout(() => {
    overlay.classList.add('hide');
    setTimeout(() => {
      overlay.classList.remove('show', 'hide');
      star.classList.remove('fire');
      msg.classList.remove('fire');
      const classes2 = ['fire-a','fire-b','fire-c','fire-d','fire-e','fire-f'];
      for (let i = 1; i <= 6; i++) {
        const el = document.getElementById('dcp' + i);
        if (el) el.classList.remove(classes2[i - 1]);
      }
    }, 400);
  }, 3200);
}

function calcStreak(){
  const todayDone=Object.values(S.checklist).filter(Boolean).length>0;
  let streak=todayDone?1:0;
  const recentHist=[...S.history].reverse();
  for(const entry of recentHist){
    if(entry.checked>0)streak++;
    else break;
  }
  return streak;
}
function calcWeekPct(){
  const items=getActiveItems();
  const today=new Date();
  const checked=Object.values(S.checklist).filter(Boolean).length;
  let totalDone=0,totalPossible=0;
  for(let i=6;i>=0;i--){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const key=d.toISOString().split('T')[0];
    if(i===0){totalDone+=checked;totalPossible+=items.length;}
    else{const entry=S.history.find(h=>h.date===key);if(entry&&entry.total>0){totalDone+=entry.checked;totalPossible+=entry.total;}}
  }
  return totalPossible>0?Math.round(totalDone/totalPossible*100):0;
}
function renderProfil(){
  const pi=PALIER[S.palier];
  const items=getActiveItems();
  const checked=Object.values(S.checklist).filter(Boolean).length;
  const streak=calcStreak();
  const weekPct=calcWeekPct();

  document.getElementById("profil-avatar").textContent=S.name?S.name[0].toUpperCase():"?";
  document.getElementById("profil-name").textContent=S.name||"—";
  document.getElementById("profil-palier").textContent=pi.emoji+" "+pi.name+" · Semaine "+S.weekNumber;

  // Streak
  document.getElementById("profil-streak").textContent=streak;
  document.getElementById("profil-streak-label").textContent=streak<=1?"jour de suite":"jours de suite";
  const streakMsgs=["Commence ta série aujourd'hui !","Tu tiens le rythme — continue !","Tu tiens le rythme — continue !","Belle série — ne la brise pas !","Belle série — ne la brise pas !","Belle série — ne la brise pas !","Belle série — ne la brise pas !"];
  const streakMsg=streak===0?"Commence ta série aujourd'hui !":streak<3?"Bon début — reviens demain !":streak<7?"Tu tiens le rythme — continue !":streak<14?"Belle série — ne la brise pas !":streak<30?"Mashā'Allāh — une constance rare !":"Exceptionnel — garde le cap !";
  document.getElementById("profil-streak-sub").textContent=streakMsg;
  document.getElementById("profil-streak-emoji").textContent=streak===0?"⭐":streak<3?"🔥":streak<7?"🔥":streak<14?"🔥":"🔥";

  // Stats
  document.getElementById("stat-total").textContent=S.totalDays+1;
  document.getElementById("stat-actions").textContent=checked+"/"+items.length;
  document.getElementById("stat-week-pct").textContent=weekPct+"%";

  // Toggles
  const toggle=document.getElementById('dark-toggle');
  if(toggle)toggle.classList.toggle('on',isDarkMode());
  renderNotifToggle();

  // Streak dots (7 jours)
  const DOT_DAYS=['Di','Lu','Ma','Me','Je','Ve','Sa'];
  const dotsEl=document.getElementById("streak-dots");
  let dotsHtml='';
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const key=d.toISOString().split('T')[0];
    const isToday=i===0;
    let pct=0,hasEntry=isToday;
    if(isToday){pct=items.length>0?Math.round(checked/items.length*100):0;}
    else{const entry=S.history.find(h=>h.date===key);if(entry){pct=entry.total>0?Math.round(entry.checked/entry.total*100):0;hasEntry=true;}}
    let dotClass,symbol;
    if(isToday){dotClass='today'+(pct>=90?' done':pct>0?' partial':'');symbol=pct>=90?'✓':pct>0?'◐':'·';}
    else if(!hasEntry){dotClass='blank';symbol='';}
    else if(pct>=90){dotClass='done';symbol='✓';}
    else if(pct>0){dotClass='partial';symbol='◐';}
    else{dotClass='missed';symbol='✕';}
    dotsHtml+=`<div class="streak-dot-item">
      <div class="streak-dot ${dotClass}">${symbol}</div>
      <div class="streak-dot-day${isToday?' today-lbl':''}">${DOT_DAYS[d.getDay()]}</div>
    </div>`;
  }
  dotsEl.innerHTML=dotsHtml;

  // Timeline 7 jours
  const DAY_NAMES=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const tl=document.getElementById("days-timeline");
  tl.className='days-timeline';
  let tlHtml='';
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const key=d.toISOString().split("T")[0];
    const isToday=i===0;
    let done=0,total=items.length,hasData=isToday;
    if(isToday){done=checked;}
    else{const entry=S.history.find(h=>h.date===key);if(entry){done=entry.checked;total=Math.max(entry.total||total,1);hasData=true;}else{total=0;}}
    const pct=total>0?Math.round(done/total*100):0;
    const level=!hasData?0:pct===0?0:pct<35?1:pct<65?2:pct<90?3:4;
    const fillColors=['','var(--accent)','var(--accent)','var(--accent)','var(--green)'];
    const fillOpacity=['','0.3','0.6','1','1'];
    const fillStyle=level===0?'width:0%':`width:${pct}%;background:${fillColors[level]};opacity:${fillOpacity[level]}`;
    const label=isToday?"Aujourd'hui":`${DAY_NAMES[d.getDay()]} · ${d.getDate()}`;
    const countText=!hasData?'—':`${done}/${total}`;
    tlHtml+=`<div class="day-row${isToday?' is-today':''}${!hasData?' no-data':''}">
      <div class="day-row-label">${label}</div>
      <div class="day-row-bar"><div class="day-row-fill" style="${fillStyle}"></div></div>
      <div class="day-row-count">${countText}</div>
    </div>`;
  }
  tl.innerHTML=tlHtml;
}
function openProfilEdit(){
  document.getElementById('edit-name-input').value=S.name||'';
  document.getElementById('edit-city-input').value=S.profile?.city||'';
  document.getElementById('edit-profil-modal').classList.add('show');
}
function closeProfilEdit(){document.getElementById('edit-profil-modal').classList.remove('show');}
function saveProfilEdit(){
  const name=document.getElementById('edit-name-input').value.trim();
  const city=document.getElementById('edit-city-input').value.trim();
  if(name)S.name=name;
  if(S.profile)S.profile.city=city;
  save();closeProfilEdit();renderProfil();
  showToast('Profil mis à jour ✓');
}
document.getElementById('edit-profil-modal').addEventListener('click',function(e){if(e.target===this)closeProfilEdit();});

// ═══ NAV ═══
function showScreen(id){document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));document.getElementById(id).classList.add("active");const nav=document.getElementById("bottom-nav");nav.classList.toggle("visible",["path","invocations","groupes","profil"].includes(id));try{if(window.isNativeIOSApp)window.webkit.messageHandlers.tabChanged.postMessage(id);}catch(e){}}
function showTab(id,el){showScreen(id);document.querySelectorAll(".nav-tab").forEach(t=>t.classList.remove("active"));el.classList.add("active");const _tabIds=['tab-path','tab-invocations','tab-groupes','tab-profil'];const _idx=_tabIds.indexOf(el.id);const _ind=document.getElementById('nav-indicator');if(_ind&&_idx>=0){const _nav=document.getElementById('bottom-nav');_ind.style.transform='translateX('+(_idx*(_nav.offsetWidth/4))+'px)';}document.getElementById('bottom-nav').classList.remove('scrolled');if(id==="path")renderPath();if(id==="profil")renderProfil();if(id==="invocations")renderInvocations();if(id==="groupes")renderGroupes();}
function showToast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400);}
window.showNativeTab=function(id){const el=document.getElementById('tab-'+id);if(el&&typeof showTab==='function')showTab(id,el);else if(['path','invocations','groupes','profil'].includes(id)&&typeof showScreen==='function')showScreen(id);};
(function(){const _nav=document.getElementById('bottom-nav');document.querySelectorAll('.screen').forEach(function(s){s.addEventListener('scroll',function(){if(_nav.classList.contains('visible'))_nav.classList.toggle('scrolled',s.scrollTop>12);},{passive:true});});})();

// ═══ GROUPES ═══
const GRP_DHIKR = {
  subhan:    { ar:'سُبْحَانَ ٱللَّٰهِ',    label:'Sous-han Allah' },
  alhamd:    { ar:'ٱلْحَمْدُ لِلَّٰهِ',    label:'Alhamdulillah' },
  allahu:    { ar:'ٱللَّٰهُ أَكْبَرُ',     label:'Allahu Akbar' },
  astaghfir: { ar:'أَسْتَغْفِرُ ٱللَّٰهَ', label:'Astaghfirullah' },
  salawat:   { ar:'صَلَّىٰ ٱللَّٰهُ عَلَيْهِ', label:'Salawat sur le Prophète ﷺ' },
};
let _groupState  = undefined; // undefined=chargement | null=sans groupe | objet=groupe actif
let _groupId     = null;
let _groupUnsub  = null;
let _grpSelectedDhikr = 'subhan';
let _grpTargetVal = 1000;
let _grpGroupType = 'dhikr';
let _grpQiyamWeekTarget = 0;

function _fmtN(n){ return n.toLocaleString('fr-FR'); }

function _genGroupCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

function _subscribeGroup(groupId){
  if(_groupUnsub){_groupUnsub();_groupUnsub=null;}
  _groupId=groupId;
  _groupUnsub=_db.collection('groups').doc(groupId).onSnapshot(snap=>{
    if(!snap.exists){
      _groupState=null;_groupId=null;
      localStorage.removeItem('dawam_groupId');
      renderGroupes();return;
    }
    const prev=_groupState;
    _groupState={id:groupId,...snap.data()};
    if(prev&&!prev.completedAt&&_groupState.completedAt) _triggerGroupCompletion();
    renderGroupes();
  },err=>{
    console.error('[Groupes]',err);
    showToast('Erreur de connexion au groupe.');
  });
}

async function initGroupes(){
  const savedId=localStorage.getItem('dawam_groupId');
  if(savedId){
    try{
      const snap=await _db.collection('groups').doc(savedId).get();
      const uid=_auth.currentUser?.uid;
      if(snap.exists&&uid&&snap.data().members.includes(uid)){
        _subscribeGroup(savedId);return;
      }
    }catch(_){}
    localStorage.removeItem('dawam_groupId');
  }
  _groupState=null;
  renderGroupes();
}

function renderGroupes(){
  const body=document.getElementById('grp-body');
  if(!body)return;
  if(_groupState===undefined){
    body.innerHTML=`<div class="grp-skeleton" style="height:200px;border-radius:var(--radius)"></div><div class="grp-skeleton" style="height:80px;border-radius:var(--radius);margin-top:4px"></div>`;
    return;
  }
  if(!_auth.currentUser){
    body.innerHTML=`<div class="grp-empty-hero"><span class="grp-empty-icon">🤝</span><div class="grp-empty-title">Connexion requise</div><div class="grp-empty-desc">Connecte-toi pour créer ou rejoindre un groupe.</div><button class="btn-primary" onclick="showScreen('auth')">Se connecter</button></div>`;
    return;
  }
  if(_groupState===null){
    body.innerHTML=`
      <div class="grp-empty-hero">
        <span class="grp-empty-icon">🤝</span>
        <div class="grp-empty-title">Action collective</div>
        <div class="grp-empty-desc">Crée un groupe de dhikr partagé ou de Qiyam al-Layl avec ta famille ou tes frères.</div>
      </div>
      <button class="btn-primary" onclick="openGrpCreate()">Créer un groupe</button>
      <div style="display:flex;align-items:center;gap:10px;margin:4px 0">
        <div style="flex:1;height:1px;background:var(--border)"></div>
        <span style="font-size:12px;color:var(--text-light);font-weight:500">ou rejoindre</span>
        <div style="flex:1;height:1px;background:var(--border)"></div>
      </div>
      <div class="grp-join-code-wrap">
        <input class="grp-join-input" id="grp-code-input" type="text" maxlength="6" placeholder="Code (ex : A3F7Z2)"
               oninput="this.value=this.value.toUpperCase()" onkeydown="if(event.key==='Enter')joinGroupByCode()">
        <button class="grp-join-btn" onclick="joinGroupByCode()">Rejoindre</button>
      </div>`;
    return;
  }
  const g=_groupState;
  const uid=_auth.currentUser?.uid;
  const isAdmin=g.adminUid===uid;
  const isCompleted=!!g.completedAt;
  const pct=Math.min(100,Math.round(g.count/g.target*100));
  const dhikr=GRP_DHIKR[g.dhikrType]||{ar:'',label:g.dhikrLabel||''};
  const today=_grpToday();
  const membersHTML=Object.entries(g.memberNames||{}).map(([muid,mname])=>{
    const initials=mname.trim().slice(0,2).toUpperCase();
    const isMe=muid===uid;
    const isAdm=muid===g.adminUid;
    return `<div class="grp-member-row"><div class="grp-member-avatar" style="${isMe?'background:var(--green)':''}">${initials}</div><span class="grp-member-name">${mname}${isMe?' (toi)':''}</span>${isAdm?'<span class="grp-member-badge">admin</span>':''}</div>`;
  }).join('');
  const qiyamHTML=g.groupType==='qiyam'?_renderQiyamSection(g,uid,today):'';
  if(isCompleted){
    body.innerHTML=`
      <div class="grp-card">
        <div class="grp-completed-hero">
          <span class="grp-completed-emoji">🌟</span>
          <div class="grp-completed-title">Ma sha Allah !</div>
          <div class="grp-completed-sub">Objectif atteint — ${_fmtN(g.target)} ${dhikr.label}.</div>
        </div>
        <div style="font-size:22px;text-align:center;direction:rtl;color:var(--accent);margin:8px 0 14px">${dhikr.ar}</div>
        <div class="grp-progress-bar"><div class="grp-progress-fill" style="width:100%;background:var(--green)"></div></div>
        <div class="grp-progress-pct" style="color:var(--green)">100% — ${_fmtN(g.count)} récitations</div>
      </div>
      <div class="grp-card">
        <div class="grp-members-title">Participants</div>
        <div class="grp-members-list">${membersHTML}</div>
      </div>
      <button class="btn-secondary" onclick="${isAdmin?'deleteGroup()':'leaveGroup()'}" style="color:${isAdmin?'#b02020':'var(--text-light)'}">
        ${isAdmin?'Supprimer le groupe':'Quitter le groupe'}
      </button>`;
    return;
  }
  const isDhikrGroup=g.groupType!=='qiyam';
  const mainCard=isDhikrGroup?`
    <div class="grp-card">
      <div class="grp-card-top">
        <div>
          <div class="grp-dhikr-label">${dhikr.label}</div>
          <div class="grp-dhikr-ar">${dhikr.ar}</div>
        </div>
        <div class="grp-code-badge" onclick="copyGroupCode('${g.code}')" title="Copier le code">📋 ${g.code}</div>
      </div>
      <div class="grp-counter-wrap">
        <div class="grp-counter-val" id="grp-counter-val">${_fmtN(g.count)}</div>
        <div class="grp-counter-target">sur ${_fmtN(g.target)}</div>
      </div>
      <div class="grp-progress-bar"><div class="grp-progress-fill" style="width:${pct}%"></div></div>
      <div class="grp-progress-pct">${pct}%</div>
      <button class="grp-tap-btn" id="grp-tap-btn" onclick="tapDhikr()">📿 +1 — Taper</button>
    </div>`:`
    <div class="grp-card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <div style="font-family:var(--font-display);font-size:16px;font-weight:600;color:var(--text)">🌙 Qiyam al-Layl</div>
        <div class="grp-code-badge" onclick="copyGroupCode('${g.code}')" title="Copier le code">📋 ${g.code}</div>
      </div>
      <div style="font-size:13px;color:var(--text-secondary)">Prière de la nuit — qui est debout ?</div>
    </div>`;
  body.innerHTML=mainCard+`
    <div class="grp-card">
      <div class="grp-members-title">${g.members.length} participant${g.members.length>1?'s':''}</div>
      <div class="grp-members-list">${membersHTML}</div>
    </div>
    ${qiyamHTML?'<div class="grp-card">'+qiyamHTML+'</div>':''}
    `+(isAdmin?'<button class="btn-primary" onclick="shareGroup(\''+g.code+'\')">Inviter des frères / sœurs</button>':'')+`
    <button class="btn-secondary" onclick="${isAdmin?'deleteGroup()':'leaveGroup()'}" style="color:var(--text-light)">
      ${isAdmin?'Supprimer le groupe':'Quitter le groupe'}
    </button>`;
}

// ── Qiyam al-Layl ────────────────────────────────────────────────────────────

function _grpToday(){
  return new Date().toISOString().slice(0,10); // "2026-04-11"
}

function _grpWeekStart(){
  const d=new Date();
  const day=d.getDay(); // 0=dim
  const diff=(day===0?-6:1-day);
  const mon=new Date(d);mon.setDate(d.getDate()+diff);
  return mon.toISOString().slice(0,10); // "2026-04-07" (lundi)
}

function _renderQiyamSection(g, uid, today){
  const weekStart=_grpWeekStart();
  const qiyam=g.qiyam||{};
  const myQ=qiyam[uid]||{};
  const doneToday=myQ.lastDate===today;

  // Liste des membres avec statut qiyam
  const rows=Object.entries(g.memberNames||{}).map(([muid,mname])=>{
    const q=qiyam[muid]||{};
    const done=q.lastDate===today;
    const initials=mname.trim().slice(0,2).toUpperCase();
    const weekCount=(q.weekDates||[]).filter(d=>d>=weekStart).length;
    const streak=q.streak||0;
    return `<div class="grp-qiyam-row">
      <div class="grp-qiyam-avatar${done?' done':''}">${done?'🌙':initials}</div>
      <span class="grp-qiyam-name${done?' done':''}">${mname}${muid===uid?' (toi)':''}</span>
      <div class="grp-qiyam-meta">
        ${done&&q.checkedAt?`<span class="grp-qiyam-time">${q.checkedAt}</span>`:''}
        ${streak>1?`<span class="grp-qiyam-streak">🔥${streak}j</span>`:''}
        ${weekCount>0&&!done?`<span class="grp-qiyam-streak" style="background:var(--bg);color:var(--text-light)">${weekCount}/sem</span>`:''}
      </div>
    </div>`;
  }).join('');

  // Bouton ou message pour l'utilisateur courant
  const myAction=doneToday
    ?`<div class="grp-qiyam-done-msg">✓ Fait à ${myQ.checkedAt} — barakAllahu fik</div>`
    :`<button class="grp-qiyam-btn" onclick="checkQiyam()">🌙 J'ai fait le Qiyam cette nuit</button>`;

  // Défi semaine
  let weekChallenge='';
  if(g.qiyamWeekTarget){
    const totalWeek=Object.values(qiyam).reduce((sum,q)=>{
      return sum+(q.weekDates||[]).filter(d=>d>=weekStart).length;
    },0);
    const maxTotal=g.members.length*(g.qiyamWeekTarget||0);
    const pct=Math.min(100,Math.round(totalWeek/maxTotal*100));
    weekChallenge=`<div style="margin-top:12px;padding-top:12px;border-top:.5px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;font-weight:600;color:var(--text-light);text-transform:uppercase;letter-spacing:.5px">Défi semaine — ${g.qiyamWeekTarget} Qiyam chacun</span>
        ${g.adminUid===uid?`<button class="grp-week-target-btn" onclick="openQiyamTargetEdit()">modifier</button>`:''}
      </div>
      <div class="grp-week-bar"><div class="grp-week-fill" style="width:${pct}%"></div></div>
      <div class="grp-week-legend"><span>${totalWeek} / ${maxTotal} Qiyam collectifs</span><span>${pct}%</span></div>
    </div>`;
  } else if(g.adminUid===uid){
    weekChallenge=`<div style="margin-top:10px;text-align:center">
      <button class="grp-week-target-btn" onclick="openQiyamTargetEdit()">+ Créer un défi Qiyam cette semaine</button>
    </div>`;
  }

  return `<div style="padding-top:14px;border-top:.5px solid var(--border);margin-top:10px">
    <div class="grp-qiyam-title">🌙 Qiyam al-Layl — cette nuit</div>
    <div class="grp-qiyam-list">${rows}</div>
    ${myAction}
    ${weekChallenge}
  </div>`;
}

async function checkQiyam(){
  const uid=_auth.currentUser?.uid;
  if(!uid||!_groupId||!_groupState)return;
  const today=_grpToday();
  const existing=(_groupState.qiyam||{})[uid]||{};
  if(existing.lastDate===today){showToast('Déjà coché pour cette nuit !');return;}
  const now=new Date();
  const timeStr=`${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`;
  // Calcul streak
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const yStr=yesterday.toISOString().slice(0,10);
  const prevStreak=existing.streak||0;
  const newStreak=(existing.lastDate===yStr)?prevStreak+1:1;
  // Calcul semaine
  const weekStart=_grpWeekStart();
  const prevWeekDates=(existing.weekDates||[]).filter(d=>d>=weekStart);
  const weekDates=[...prevWeekDates,today];
  try{
    await _db.collection('groups').doc(_groupId).update({
      [`qiyam.${uid}`]:{lastDate:today,checkedAt:timeStr,streak:newStreak,weekDates},
    });
    showToast(`🌙 Qiyam enregistré — ${timeStr}`);
  }catch(e){showToast('Erreur lors de l\'enregistrement.');console.error('[checkQiyam]',e);}
}

function openQiyamTargetEdit(){
  const current=_groupState?.qiyamWeekTarget||5;
  const val=prompt(`Objectif Qiyam par membre cette semaine (1-7) :`,current);
  if(val===null)return;
  const n=parseInt(val,10);
  if(isNaN(n)||n<1||n>7){showToast('Valeur invalide (1-7).');return;}
  _db.collection('groups').doc(_groupId).update({qiyamWeekTarget:n})
    .then(()=>showToast(`Défi mis à jour : ${n} Qiyam cette semaine`))
    .catch(()=>showToast('Erreur lors de la mise à jour.'));
}

async function tapDhikr(){
  if(!_groupId||!_groupState||_groupState.completedAt)return;
  const btn=document.getElementById('grp-tap-btn');
  if(btn){btn.disabled=true;setTimeout(()=>btn&&(btn.disabled=false),500);}
  const valEl=document.getElementById('grp-counter-val');
  if(valEl){valEl.classList.remove('tick');void valEl.offsetWidth;valEl.classList.add('tick');setTimeout(()=>valEl?.classList.remove('tick'),300);}
  const newCount=_groupState.count+1;
  const isGoal=newCount>=_groupState.target;
  try{
    const update={count:firebase.firestore.FieldValue.increment(1)};
    if(isGoal)update.completedAt=firebase.firestore.FieldValue.serverTimestamp();
    await _db.collection('groups').doc(_groupId).update(update);
  }catch(e){showToast('Erreur — réessaie.');console.error('[tapDhikr]',e);}
}

function copyGroupCode(code){
  navigator.clipboard?.writeText(code).then(()=>showToast(`Code "${code}" copié !`)).catch(()=>showToast(`Code : ${code}`));
}

function shareGroup(code){
  const text=`Rejoins notre groupe de dhikr collectif sur Dawam !\nCode d'invitation : ${code}`;
  if(navigator.share){navigator.share({title:'Dawam — Groupe dhikr',text}).catch(()=>{});}
  else{navigator.clipboard?.writeText(text).then(()=>showToast('Code copié !')).catch(()=>showToast(`Code : ${code}`));}
}

async function joinGroupByCode(){
  const input=document.getElementById('grp-code-input');
  const code=(input?.value||'').trim().toUpperCase();
  if(code.length!==6){showToast('Code à 6 caractères requis.');return;}
  await _promptJoinByCode(code);
}

async function _promptJoinByCode(code){
  if(_groupState&&_groupState!==null){showToast("Tu es déjà dans un groupe. Quitte-le d'abord.");return;}
  const uid=_auth.currentUser?.uid;
  if(!uid){showToast('Connecte-toi d\'abord.');return;}
  showToast('Recherche du groupe…');
  try{
    const codeSnap=await _db.collection('groupCodes').doc(code).get();
    if(!codeSnap.exists){showToast('Code invalide ou expiré.');return;}
    const groupId=codeSnap.data().groupId;
    const groupSnap=await _db.collection('groups').doc(groupId).get();
    if(!groupSnap.exists){showToast("Ce groupe n'existe plus.");return;}
    const g=groupSnap.data();
    if(g.completedAt){showToast('Cet objectif est déjà atteint !');return;}
    if(g.members.length>=20){showToast('Ce groupe est complet (20 membres max).');return;}
    if(g.members.includes(uid)){
      localStorage.setItem('dawam_groupId',groupId);
      _subscribeGroup(groupId);return;
    }
    const myName=S.name||'Anonyme';
    await _db.collection('groups').doc(groupId).update({
      members:firebase.firestore.FieldValue.arrayUnion(uid),
      [`memberNames.${uid}`]:myName,
    });
    localStorage.setItem('dawam_groupId',groupId);
    _subscribeGroup(groupId);
    showToast('Tu as rejoint le groupe !');
  }catch(e){showToast('Erreur lors de la connexion au groupe.');console.error('[joinGroup]',e);}
}

function openGrpCreate(){
  if(_groupState&&_groupState!==null){showToast('Tu es déjà dans un groupe.');return;}
  // Reset
  _grpGroupType='dhikr';
  document.getElementById('grp-type-dhikr').classList.add('selected');
  document.getElementById('grp-type-qiyam').classList.remove('selected');
  document.getElementById('grp-dhikr-create-section').style.display='';
  document.getElementById('grp-qiyam-create-section').style.display='none';
  document.getElementById('grp-create-modal').classList.add('show');
}
function closeGrpCreate(){document.getElementById('grp-create-modal').classList.remove('show');}
function selectGrpGroupType(type){
  _grpGroupType=type;
  document.getElementById('grp-type-dhikr').classList.toggle('selected',type==='dhikr');
  document.getElementById('grp-type-qiyam').classList.toggle('selected',type==='qiyam');
  document.getElementById('grp-dhikr-create-section').style.display=type==='dhikr'?'':'none';
  document.getElementById('grp-qiyam-create-section').style.display=type==='qiyam'?'':'none';
}
function selectGrpDhikr(el){
  document.querySelectorAll('.grp-dhikr-opt').forEach(o=>o.classList.remove('selected'));
  el.classList.add('selected');
  _grpSelectedDhikr=el.dataset.key;
}
function updateGrpTarget(val){
  _grpTargetVal=Math.round(val*100);
  document.getElementById('grp-target-display').textContent=_fmtN(_grpTargetVal);
}
function updateGrpQiyamTarget(val){
  _grpQiyamWeekTarget=parseInt(val,10);
  document.getElementById('grp-qiyam-target-display').textContent=_grpQiyamWeekTarget>0?_grpQiyamWeekTarget+'j':'—';
}

async function submitCreateGroup(){
  const uid=_auth.currentUser?.uid;
  if(!uid){showToast('Connecte-toi d\'abord.');return;}
  if(_groupState&&_groupState!==null){showToast('Tu es déjà dans un groupe.');return;}
  const btn=document.getElementById('grp-create-btn');
  btn.disabled=true;btn.textContent='Création…';
  const code=_genGroupCode();
  const myName=S.name||'Anonyme';
  try{
    const codeSnap=await _db.collection('groupCodes').doc(code).get();
    if(codeSnap.exists){btn.disabled=false;btn.textContent='Créer le groupe';return submitCreateGroup();}
    const groupRef=_db.collection('groups').doc();
    const groupId=groupRef.id;
    const batch=_db.batch();
    const baseData={
      code,adminUid:uid,adminName:myName,
      members:[uid],memberNames:{[uid]:myName},
      groupType:_grpGroupType,
      createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    };
    if(_grpGroupType==='dhikr'){
      const dhikr=GRP_DHIKR[_grpSelectedDhikr];
      Object.assign(baseData,{dhikrType:_grpSelectedDhikr,dhikrLabel:dhikr.label,dhikrAr:dhikr.ar,target:_grpTargetVal,count:0,completedAt:null});
    } else {
      Object.assign(baseData,{qiyamWeekTarget:_grpQiyamWeekTarget>0?_grpQiyamWeekTarget:null,qiyam:{}});
    }
    batch.set(groupRef,baseData);
    batch.set(_db.collection('groupCodes').doc(code),{groupId});
    await batch.commit();
    localStorage.setItem('dawam_groupId',groupId);
    closeGrpCreate();
    _subscribeGroup(groupId);
    showToast('Groupe créé ! Code : '+code);
  }catch(e){showToast('Erreur lors de la création.');console.error('[createGroup]',e);btn.disabled=false;btn.textContent='Créer le groupe';}
}

async function leaveGroup(){
  if(!confirm('Quitter ce groupe ?'))return;
  const uid=_auth.currentUser?.uid;
  if(!uid||!_groupId)return;
  try{
    await _db.collection('groups').doc(_groupId).update({
      members:firebase.firestore.FieldValue.arrayRemove(uid),
      [`memberNames.${uid}`]:firebase.firestore.FieldValue.delete(),
    });
    if(_groupUnsub){_groupUnsub();_groupUnsub=null;}
    _groupState=null;_groupId=null;
    localStorage.removeItem('dawam_groupId');
    renderGroupes();showToast('Tu as quitté le groupe.');
  }catch(e){showToast('Erreur lors de la sortie du groupe.');}
}

async function deleteGroup(){
  if(!confirm('Supprimer le groupe définitivement ?\nTous les membres seront exclus.'))return;
  const uid=_auth.currentUser?.uid;
  if(!uid||!_groupId||!_groupState)return;
  if(_groupState.adminUid!==uid){showToast("Seul l'admin peut supprimer.");return;}
  try{
    const batch=_db.batch();
    batch.delete(_db.collection('groups').doc(_groupId));
    batch.delete(_db.collection('groupCodes').doc(_groupState.code));
    await batch.commit();
    if(_groupUnsub){_groupUnsub();_groupUnsub=null;}
    _groupState=null;_groupId=null;
    localStorage.removeItem('dawam_groupId');
    renderGroupes();showToast('Groupe supprimé.');
  }catch(e){showToast('Erreur lors de la suppression.');}
}

function _triggerGroupCompletion(){
  const overlay=document.getElementById('dawam-completion-overlay');
  if(!overlay)return;
  const msg=document.getElementById('dawam-completion-msg');
  if(msg){
    msg.querySelector('h2').textContent='Ma sha Allah !';
    msg.querySelector('p').textContent='Objectif collectif atteint — barakAllahu fikum.';
  }
  const star=document.getElementById('dawam-center-star');
  overlay.classList.add('show');
  if(star)star.classList.add('fire');
  if(msg)msg.classList.add('fire');
  ['dcp1','dcp2','dcp3','dcp4','dcp5','dcp6'].forEach((id,i)=>{
    const el=document.getElementById(id);
    if(el){el.classList.remove('fire-a','fire-b','fire-c','fire-d','fire-e','fire-f');void el.offsetWidth;el.classList.add(['fire-a','fire-b','fire-c','fire-d','fire-e','fire-f'][i]);}
  });
  setTimeout(()=>{
    overlay.classList.remove('show');
    if(star)star.classList.remove('fire');
    if(msg)msg.classList.remove('fire');
  },3200);
}

function showLockedHint(cat){const msgs={qiyam:"Disponible la nuit (dernier tiers)",aube:"Disponible après le Fajr",journee:"Disponible dans la journée",soir:"Disponible ce soir",nuit:"Disponible avant de dormir"};showToast((msgs[cat]||"Disponible plus tard")+" 🔒");}
async function resetApp() {
  const confirmed = await nativeConfirm('Recommencer depuis le début ?\n\nCela effacera toutes tes données.');
  if (!confirmed) return;
  const user = _auth.currentUser;
  if (user) {
    try {
      await user.delete();
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        // Session trop ancienne : ré-auth Google si possible, sinon juste déco
        const isGoogle = user.providerData.some(p => p.providerId === 'google.com');
        if (isGoogle) {
          try {
            await user.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
            await _auth.currentUser.delete();
          } catch (_) {
            // Popup annulée ou autre erreur → déconnexion simple
            await _auth.signOut().catch(() => {});
          }
        } else {
          await _auth.signOut().catch(() => {});
        }
      } else {
        await _auth.signOut().catch(() => {});
      }
    }
  }
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ═══ ITEM DETAILS ═══
const ITEM_DETAILS = {
  1:{
    why:"Le Prophète ﷺ ne l'abandonnait jamais, même en voyage. C'est le pilier de la nuit.",
    hadith:{text:"Notre Seigneur s'émerveille de deux hommes : l'un d'eux se lève de sa couche et de son drap, quittant l'amour de sa compagne pour aller prier. Dieu dit à Ses anges : \"Regardez Mon serviteur, il s'est levé par désir de ce que Je détiens et par crainte de ce que Je réserve…\"",source:"Ibn Ḥibbān, Ṣaḥīḥ"},
    steps:["Se lever environ 1h avant l'aube (ou un court moment si c'est difficile)","Faire les ablutions","Prier 2 raka'at par 2 raka'at — objectif 11 au total : 2+2+2+2 puis Chaf' (2) puis Witr (1)","Pour commencer : juste 2 raka'at + Witr suffit, puis augmenter progressivement semaine après semaine","Après le Witr : rester assis et demander pardon (istighfar)"],
    note:"L'enjeu n'est pas de tout faire du premier coup. Commence par 2 raka'at + Witr. La constance compte plus que la quantité."
  },
  2:{
    why:"Rester assis après Fajr jusqu'au lever du soleil est l'un des moments les plus bénis de la journée.",
    hadith:{text:"Celui qui accomplit la prière de l'aube en groupe, puis reste assis à évoquer Dieu jusqu'au lever du soleil, aura la récompense d'un pèlerinage et d'une ʿumra complète, complète, complète.",source:"At-Tirmidhī, jugé hasan"},
    steps:["Rester à sa place après la prière du Fajr","Commencer par les invocations du matin (adhkar al-sabah)","Réciter les versets et sourates méritoires","Lire ou mémoriser du Coran","Faire l'invocation du lien spirituel (duʿâʾ ar-râbiṭa)","Se lever environ 15–20 min après le lever du soleil pour la prière du Chourouk"],
    note:"Ce moment est une parenthèse bénie. Garde ton téléphone de côté."
  },
  3:{
    why:"La prière de l'aube en congrégation vaut mieux que le monde entier et ce qu'il contient.",
    hadith:{text:"Les deux raka'at de l'aube valent mieux que le monde entier et ce qu'il contient.",source:"Muslim"},
    steps:["Faire les 2 raka'at sunna avant le Fajr","Aller à la mosquée si possible — sinon prier avec sa famille","Prier les 2 fard (obligatoires) avec khushū'"],
    note:"Les 2 sunna du Fajr ne s'abandonnent jamais, même si on a manqué d'autres prières."
  },
  4:{
    why:"Les prières surérogatoires comblent les lacunes des prières obligatoires et rapprochent d'Allah.",
    hadith:{text:"Ô fils d'Adam, accomplis pour Moi quatre unités de prière au début de la journée, et Je te suffirai pour la suite.",source:"Ahmad, bonne chaîne"},
    steps:["2 raka'at sunna avant le Fajr (avant la prière obligatoire)","2 raka'at après les ablutions (sunna de Bilāl)","4 raka'at avant le Dhuhr + 2 après","2 raka'at avant le ʿAsr","2 raka'at avant le Maghrib + 6 après (Awwābīn)","2 raka'at avant le ʿIshāʾ + 4 après","Prière du Chourouk : 2 à 8 raka'at, 10–15 min après le lever du soleil"],
    note:"Ne cherche pas à tout faire d'un coup. Commence par les rawatib du Dhuhr et du Fajr."
  },
  5:{
    why:"La récitation quotidienne du Coran est une nourriture pour le cœur. Un wird régulier, même court, vaut mieux qu'une lecture irrégulière.",
    hadith:{text:"Récitez le Coran, car il viendra en intercession pour ses compagnons au Jour de la Résurrection.",source:"Muslim"},
    steps:["Fixer une portion quotidienne (wird) selon ton niveau","Débutant : 3 à 5 minutes le matin, quelques versets","Intermédiaire : 1 hizb par jour (environ 25 min)","Lire de préférence après Fajr pendant la séance de l'aube","Chercher la présence du cœur plutôt que la vitesse"],
    note:"Même une sourate courte lue avec présence vaut mieux qu'un hizb récité distraitement."
  },
  6:{
    why:"Ces versets et sourates ont des mérites spécifiques rapportés dans la Sunna. Les réciter chaque matin est un bouclier et une lumière.",
    hadith:{text:"Ô Dieu, accorde Ta bénédiction à ma communauté dans ses débuts de journée.",source:"Ahmad, Abū Dāwūd"},
    steps:["Al-Fātiḥa [1:1–7]","Al-Baqara [2:1–5] puis Āyat al-Kursī [2:255–257] puis [2:285–286]","Āl ʿImrān [3:1–9], [3:18–19], [3:26–27], [3:190–200]","Fin de at-Tawba [9:128–129] — 7 fois","Al-Kahf [18:107–110] · Yāsīn [36] · Al-Wāqiʿa [56] · Al-Mulk [67]","Les Musabbiḥāt : Al-Ḥadīd [57], Al-Ḥashr [59], aṣ-Ṣaff [61], Al-Jumuʿa [62], At-Taghābun [64]","Les courtes : Al-Aʿlā [87] · aḍ-Ḍuḥā [93] · ash-Sharḥ [94] · Al-Qadr [97]","Az-Zalzala [99] ×4 · At-Takāthur [102] · Al-ʿAṣr [103] ×2 · Al-Māʿūn [107]","Al-Kawthar [108] ×3 · Al-Kāfirūn [109] ×4 · An-Naṣr [110] ×4 · Al-Ikhlāṣ [112] ×3","Al-Falaq [113] + An-Nās [114] — Clôturer par Al-Fātiḥa + Al-Baqara [2:1–5]"],
    note:"Ne cherche pas à tout réciter d'un coup. Commence par Āyat al-Kursī + les 3 dernières sourates chaque matin, puis augmente progressivement."
  },
  7:{
    why:"Par ce dhikr, la foi se renouvelle et le cœur se vivifie. C'est le sommet des affluents de la foi.",
    hadith:{text:"Renouvelez votre foi ! On demanda : comment ? Il répondit : Répétez inlassablement Lā ilāha illa Llāh. Évoquez Dieu jusqu'à ce que les gens disent de vous : C'est un fou !",source:"Ahmad — Ibn Ḥibbān, Ṣaḥīḥ"},
    steps:["Prévoir 3 moments dans la journée d'au moins 15 minutes chacun","Être seul, dans le calme, cœur présent","Répéter lentement : Lā ilāha illa Llāh","Essayer le matin (après séance aube), le milieu de journée, et avant le sommeil"],
    note:"La présence du cœur est essentielle. 15 minutes de qualité valent mieux qu'une heure mécanique."
  },
  8:{
    why:"Les bénédictions sur le Prophète ﷺ illuminent le cœur, effacent les péchés et rapprochent de lui au Jour de la Résurrection.",
    hadith:{text:"Les plus proches de moi le Jour de la Résurrection sont ceux qui auront le plus prié sur moi.",source:"At-Tirmidhī — Ibn Ḥibbān"},
    steps:["Objectif : au moins 300 fois par jour","Formule complète : Allāhumma ṣalli ʿalā Muḥammadin an-nabiyy, wa-ʾazwājihī ummahāti al-muʾminīn, wa-dhurriyyatihī wa-ʾahli baytih, kamā ṣallayta ʿalā Āli Ibrāhīm, ʾinnaka ḥamīdun majīd","Insister particulièrement le jeudi soir et le vendredi toute la journée","Répartir sur plusieurs moments dans la journée"],
    note:"Tu peux les répartir : 100 après Fajr, 100 en milieu de journée, 100 le soir."
  },
  9:{
    why:"Le croyant qui se couche en état de pureté, dans l'évocation de Dieu, a son ange qui intercède pour lui toute la nuit.",
    hadith:{text:"Le croyant pieux se tient des comptes plus sévèrement que ne le ferait un roi tyrannique ou un associé avare.",source:"Maymūn ibn Mihrān, tabiʿī"},
    steps:["Faire le bilan de sa journée : qu'est-ce que j'ai accompli ? qu'est-ce que j'ai manqué ?","Renouveler sa tawba (repentir) sincèrement","Faire les ablutions avant de dormir","Réciter les invocations du sommeil (adhkar al-nawm)","Endormi en état de pureté, en évocation de Dieu","Faire en sorte que ta dernière pensée consciente soit une confidence adressée à ton Seigneur"],
    note:"Ne te laisse pas entraîner dans des veillées prolongées qui te feraient manquer les devoirs du lendemain. Car celui dont le lendemain n'est pas meilleur que la veille est perdant."
  },
  10:{
    why:"Pour l'étudiant, ses études sont son jihad. C'est le combat propre à sa phase de vie.",
    hadith:{text:"Dis-moi ce que tu lis, je te dirai qui tu es.",source:"Un sage"},
    steps:["Après la prière, le Coran et l'évocation de Dieu — consacre-toi à tes études","Révise tes cours avec sérieux et méthode","Ton premier devoir religieux : acquérir un minimum de science islamique","Choisis avec discernement tes lectures : qu'elles nourrissent ta vie présente ET ta vie dernière"],
    note:"L'étude n'est pas opposée à la spiritualité — elle en fait partie."
  },
  11:{
    why:"La bonne compagnie est l'un des plus grands leviers de la foi. On est influencé par ceux qu'on fréquente.",
    hadith:{text:"L'homme est sur la religion de son ami intime. Que chacun regarde donc qui il prend pour ami intime.",source:"Abū Dāwūd, At-Tirmidhī"},
    steps:["Entretenir des liens avec des frères/sœurs pieux","Participer à des cercles de rappel ou d'apprentissage","Fuir les assemblées de la futilité et de la distraction","Appeler les autres au bien par l'exemple avant tout"],
    note:"Même un coup de téléphone à un frère pieux compte comme un cercle de foi."
  },
  12:{
    why:"Chercher la science est une obligation pour tout musulman. Elle élève les rangs et guide les actes.",
    hadith:{text:"Celui à qui Dieu veut du bien, Il lui donne la compréhension de la religion.",source:"Al-Bukhārī, Muslim"},
    steps:["Consacrer un temps quotidien à la lecture d'un livre de science islamique","Commencer par les fondamentaux : croyance, adoration, éthique","Avancer lentement mais régulièrement, avec la compréhension","Ne pas sauter d'un livre à l'autre sans finir"],
    note:"Un chapitre par jour, compris et retenu, vaut mieux que des heures de lecture superficielle."
  },
  13:{
    why:"Ton temps est ton capital. Chaque heure qui passe sans adoration ni bien est une perte.",
    hadith:{text:"Deux bienfaits dont beaucoup de gens sont floués : la santé et le temps libre.",source:"Al-Bukhārī"},
    steps:["Planifier sa journée la veille ou au réveil","Identifier les moments de gaspillage (réseaux, distractions)","Chaque transition entre deux activités : une occasion de dhikr","Se poser la question avant chaque acte : est-ce que cela me rapproche ou m'éloigne ?"],
    note:"Al-Hassan al-Basri disait : J'ai vu des gens qui étaient plus avares de leur temps que de leur or."
  },
  14:{
    why:"L'invocation du lien spirituel (duʿâʾ ar-râbiṭa) est un acte qui relie les cœurs croyants dans l'amour d'Allah.",
    hadith:{text:"Nul ne peut aimer son frère pour Allah sans que cela ne l'élève en rang et ne lui ouvre les portes de Sa miséricorde.",source:"Rapporté des maîtres"},
    steps:["La faire de préférence après la séance de l'aube","Invoquer pour ses frères et sœurs en Islam par leur nom si possible","Demander à Allah de réunir les cœurs sur l'amour de Lui","Terminer par les invocations de clôture"],
    note:"Cette invocation se fait en silence, intérieurement. Elle n'a pas besoin d'être longue — la sincérité prime."
  }
};

const INVOC_LINK={
  2:{title:"Invocations du matin",tab:'matin'},
  7:{title:"Le meilleur dhikr — Tahlil",tab:'dhikr',idx:2},
  8:{title:"La prière sur le Prophète ﷺ",tab:'dhikr',idx:1},
  9:{title:"Invocations du soir",tab:'soir'},
  15:{title:"Invocations du soir",tab:'soir'},
};
let _invocPopupItemId=null, _invocStep=0, _invocItems=[], _invocMode='step';
function openInvocFromDetail(itemId){
  const link=INVOC_LINK[itemId];
  if(!link)return;
  _invocPopupItemId=itemId;
  _invocStep=0;
  document.getElementById('invoc-popup-title').textContent=link.title;
  if(link.tab==='dhikr'&&link.idx!=null){
    _invocMode='single';
    _invocItems=[DHIKR_LIST[link.idx]];
  } else {
    _invocMode='step';
    _invocItems=ADHKAR[link.tab]||[];
  }
  document.getElementById('invoc-progress-track').style.display=_invocMode==='step'?'block':'none';
  _renderInvocPopup();
  document.getElementById('invoc-popup').classList.add('show');
}
function _renderInvocPopup(){
  const body=document.getElementById('invoc-popup-body');
  const footer=document.getElementById('invoc-popup-footer');
  const counter=document.getElementById('invoc-popup-counter');
  const fill=document.getElementById('invoc-progress-fill');
  if(_invocMode==='single'){
    const d=_invocItems[0];
    counter.textContent='';
    body.innerHTML=`<div class="invoc-popup-single">
      <span class="invoc-repeat">× ${d.repeat}</span>
      <div class="invoc-arabic">${d.arabic}</div>
      <div class="invoc-phonetic">${d.phonetic}</div>
      <div class="invoc-french">${d.french}</div>
      <div class="invoc-source" style="margin-top:10px">${d.source}</div>
    </div>`;
    footer.innerHTML=_doneBtn();
  } else {
    const total=_invocItems.length;
    const a=_invocItems[_invocStep];
    const isLast=_invocStep===total-1;
    counter.textContent=`${_invocStep+1} / ${total}`;
    fill.style.width=`${((_invocStep+1)/total)*100}%`;
    body.innerHTML=`<div class="invoc-step-card">
      <span class="invoc-step-repeat">× ${a.repeat}</span>
      <div class="invoc-step-arabic">${a.arabic}</div>
      <div class="invoc-step-phonetic">${a.phonetic}</div>
      <div class="invoc-step-french">${a.french}</div>
      <div class="invoc-step-source">${a.source}</div>
    </div>`;
    body.scrollTop=0;
    if(isLast){
      footer.innerHTML=_doneBtn();
    } else {
      footer.innerHTML=`<div class="invoc-nav-row">
        <button class="btn-invoc-prev" onclick="_invocPrev()" ${_invocStep===0?'style="visibility:hidden"':''}>←</button>
        <button class="btn-invoc-next" onclick="_invocNext()">Suivant →</button>
      </div>`;
    }
  }
}
function _doneBtn(){
  const done=!!S.checklist[_invocPopupItemId];
  return `<button class="btn-invoc-done${done?' done':''}" id="invoc-done-btn" onclick="completeInvocItem()">
    <span class="done-label">Terminé — barakAllahu fik ✓</span>
    <span class="done-check">✦ Ma sha Allah ✦</span>
  </button>`;
}
function _invocNext(){
  if(_invocStep<_invocItems.length-1){_invocStep++;_renderInvocPopup();}
}
function _invocPrev(){
  if(_invocStep>0){_invocStep--;_renderInvocPopup();}
}
function closeInvocPopup(){document.getElementById('invoc-popup').classList.remove('show');_invocPopupItemId=null;}
function completeInvocItem(){
  const btn=document.getElementById('invoc-done-btn');
  if(!btn)return;
  if(btn.classList.contains('done')){closeInvocPopup();return;}
  const colors=['#BA7517','#3B6D11','#f0c040','#c9930a'];
  for(let i=0;i<10;i++){
    const s=document.createElement('div');
    s.className='popup-spark';
    const angle=Math.random()*Math.PI*2, dist=40+Math.random()*60, size=4+Math.random()*5;
    s.style.cssText=`width:${size}px;height:${size}px;background:${colors[i%colors.length]};left:50%;top:50%;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist-20}px;`;
    btn.appendChild(s);
    setTimeout(()=>s.remove(),700);
  }
  btn.classList.add('done');
  if(_invocPopupItemId!==null&&!S.checklist[_invocPopupItemId]){
    S.checklist[_invocPopupItemId]=true;
    save();
    const items=getActiveItems();
    const allDone=items.every(i=>S.checklist[i.id]);
    setTimeout(()=>{renderPathSmooth();if(allDone)fireCompletionOverlay();},600);
  }
  setTimeout(()=>closeInvocPopup(),1600);
}
function openDetail(id){
  if(id===2&&getCurrentCat()==="aube"){openSeanceGuidee();return;}
  if(id===15){openInvocFromDetail(15);return;}
  const item=PROGRAM.find(i=>i.id===id);
  const det=ITEM_DETAILS[id];
  if(!item||!det)return;
  const done=!!S.checklist[id];
  const c=document.getElementById("detail-content");
  const stepsHtml=det.steps?det.steps.map((s,i)=>`
    <div class="detail-step-row fade-up" style="animation-delay:${.3+i*.06}s">
      <div class="detail-step-left">
        <div class="detail-step-num">${i+1}</div>
        <div class="detail-step-line"></div>
      </div>
      <div class="detail-step-text">${s}</div>
    </div>`).join(""):"";
  c.innerHTML=`
    <div class="detail-hero">
      <span class="detail-hero-emoji">${item.emoji}</span>
      <div class="detail-hero-title">${item.titleFr}</div>
      <div><div class="detail-hero-pill"><span>⏱ ${item.time}</span></div></div>
    </div>
    <div class="detail-body">
      ${det.why?`<p class="fade-up" style="font-size:14px;color:var(--text-secondary);line-height:1.75;text-align:center;padding:0 4px;animation-delay:.2s">${det.why}</p>`:""}
      ${det.hadith?`
      <div class="detail-quote">
        <span class="detail-quote-marks">❝</span>
        <div class="detail-quote-text">${det.hadith.text}</div>
        <div class="detail-quote-source">— ${det.hadith.source}</div>
      </div>
      <div class="detail-divider"></div>`:""}
      ${det.steps?`
      <div class="detail-section-label fade-up" style="animation-delay:.28s">Comment procéder</div>
      <div class="detail-timeline">${stepsHtml}</div>`:""}
      ${det.note?`
      <div class="detail-tip fade-up" style="animation-delay:${.3+det.steps.length*.06}s">
        <span class="detail-tip-icon">💡</span>
        <div class="detail-tip-text">${det.note}</div>
      </div>`:""}
      <div class="detail-cta fade-up" style="animation-delay:.5s">
        <button class="btn-done${done?" undone":""}" onclick="toggleItem(${id});closeDetail()">
          ${done?"↩ Annuler l'action":"✓ Accompli — barakAllahu fik"}
        </button>
        <button class="btn-secondary" onclick="closeDetail()">Fermer</button>
      </div>
    </div>`;
  document.getElementById("detail-modal").classList.add("show");
}
function closeDetail(){document.getElementById("detail-modal").classList.remove("show");}
function showItemInfo(id){
  const item=getActiveItems().find(i=>i.id===id);
  if(!item)return;
  const det=ITEM_DETAILS[id];
  const desc=(det&&det.why)||item.why||'';
  document.getElementById('detail-content').innerHTML=`
    <div style="text-align:center;padding:8px 0 20px">
      <div style="font-size:52px;margin-bottom:12px">${item.emoji}</div>
      <div style="font-family:var(--font-display);font-size:19px;font-weight:600;color:var(--text);margin-bottom:14px;line-height:1.3">${item.titleFr}</div>
      ${desc?`<p style="font-size:14px;color:var(--text-secondary);line-height:1.75;padding:0 4px">${desc}</p>`:''}
    </div>
    <button class="btn-secondary" onclick="closeDetail()" style="margin-top:4px">Fermer</button>
  `;
  document.getElementById('detail-modal').classList.add('show');
}
document.getElementById("detail-modal").addEventListener("click",function(e){if(e.target===this)closeDetail();});
function openItemPreview(id){
  const item=PROGRAM.find(i=>i.id===id)||getPrayerItems().find(i=>i.id===id);
  if(!item)return;
  const det=ITEM_DETAILS[id];
  const why=(det&&det.why)||item.why||'';
  const stepsHtml=det&&det.steps?det.steps.map((s,i)=>`
    <div class="detail-step-row fade-up" style="animation-delay:${.3+i*.06}s">
      <div class="detail-step-left"><div class="detail-step-num">${i+1}</div><div class="detail-step-line"></div></div>
      <div class="detail-step-text">${s}</div>
    </div>`).join(''):'';
  document.getElementById('detail-content').innerHTML=`
    <div class="detail-hero">
      <span class="detail-hero-emoji">${item.emoji}</span>
      <div class="detail-hero-title">${item.titleFr}</div>
      <div><div class="detail-hero-pill"><span>⏱ ${item.time}</span></div></div>
    </div>
    <div class="detail-body">
      ${why?`<p class="fade-up" style="font-size:14px;color:var(--text-secondary);line-height:1.75;text-align:center;padding:0 4px;animation-delay:.2s">${why}</p>`:''}
      ${det&&det.hadith?`<div class="detail-quote"><span class="detail-quote-marks">❝</span><div class="detail-quote-text">${det.hadith.text}</div><div class="detail-quote-source">— ${det.hadith.source}</div></div><div class="detail-divider"></div>`:''}
      ${det&&det.steps?`<div class="detail-section-label fade-up" style="animation-delay:.28s">Comment procéder</div><div class="detail-timeline">${stepsHtml}</div>`:''}
      ${det&&det.note?`<div class="detail-tip fade-up"><span class="detail-tip-icon">💡</span><div class="detail-tip-text">${det.note}</div></div>`:''}
      <div class="detail-cta fade-up" style="animation-delay:.4s">
        <button class="btn-secondary" onclick="closeDetail()">Fermer</button>
      </div>
    </div>`;
  document.getElementById('detail-modal').classList.add('show');
}

// ═══ THEMES ═══ (5 personas — palette + font stack, layout piloté en CSS via data-theme)
const THEMES = {
  zen:       {name:"Zen",       tag:"Minimaliste",   emoji:"🌿", bg:"#faf8f3", bgCard:"#ffffff", accent:"#9c8563", accentDk:"#76613f", accentLt:"#ede5d4", text:"#2a2824", textSec:"#857f73", textLt:"#b8b2a4", green:"#6b7f55", greenLt:"#e4ead6", br:"156,133,99", sh:"42,40,36", fontDisplay:"'Cormorant Garamond','EB Garamond',Georgia,serif", fontBody:"'Inter',system-ui,sans-serif"},
  quest:     {name:"Quest",     tag:"Gamer",         emoji:"🎮", bg:"#0a0e1a", bgCard:"#141c2e", accent:"#00ff88", accentDk:"#00cc6a", accentLt:"#1a2438", text:"#e8ecf4", textSec:"#8b95a8", textLt:"#5a6478", green:"#00ff88", greenLt:"#0f2a1f", br:"0,255,136",  sh:"0,0,0",   dark:true, fontDisplay:"'Space Grotesk',system-ui,sans-serif", fontBody:"'Inter',system-ui,sans-serif"},
  athlete:   {name:"Athlete",   tag:"Performance",   emoji:"🏋", bg:"#f5f5f7", bgCard:"#ffffff", accent:"#ff3b30", accentDk:"#cc2f26", accentLt:"#ffe1df", text:"#0a0a0a", textSec:"#5a5a5a", textLt:"#9a9a9a", green:"#30d158", greenLt:"#d4f5de", br:"255,59,48",  sh:"10,10,10", fontDisplay:"'Archivo Black','Inter',system-ui,sans-serif", fontBody:"'Inter',system-ui,sans-serif"},
  classique: {name:"Classique", tag:"Traditionnel",  emoji:"📜", bg:"#f8f4ec", bgCard:"#fdfaf3", accent:"#6d4c2e", accentDk:"#4a3218", accentLt:"#ebe0cc", text:"#1a1814", textSec:"#5c564c", textLt:"#9a9286", green:"#3d6b3d", greenLt:"#d8e6d4", br:"109,76,46",  sh:"26,24,20", fontDisplay:"'EB Garamond',Georgia,serif", fontBody:"'Inter',system-ui,sans-serif"},
  pro:       {name:"Pro",       tag:"Dashboard",     emoji:"📊", bg:"#fafbfc", bgCard:"#ffffff", accent:"#5e6ad2", accentDk:"#4951a8", accentLt:"#e4e6f5", text:"#0e0f10", textSec:"#6b7280", textLt:"#9ca3af", green:"#00875a", greenLt:"#d5f0e2", br:"94,106,210", sh:"14,15,16", fontDisplay:"'Inter',system-ui,sans-serif", fontBody:"'Inter',system-ui,sans-serif"},
};
function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`${r},${g},${b}`;}
function applyTheme(key){
  if(!(key in THEMES))key='zen';
  const t=THEMES[key];
  document.documentElement.setAttribute('data-theme',key);
  const r=document.documentElement.style;
  if(t.fontDisplay)r.setProperty('--font-display',t.fontDisplay);
  if(t.fontBody)r.setProperty('--font-body',t.fontBody);
  r.setProperty('--bg',t.bg);
  r.setProperty('--bg-card',t.bgCard);
  r.setProperty('--bg-glass',`rgba(${hexToRgb(t.bg)},0.85)`);
  r.setProperty('--accent',t.accent);
  r.setProperty('--accent-dark',t.accentDk);
  r.setProperty('--accent-light',t.accentLt);
  r.setProperty('--text',t.text);
  r.setProperty('--text-secondary',t.textSec);
  r.setProperty('--text-light',t.textLt);
  r.setProperty('--green',t.green);
  r.setProperty('--green-light',t.greenLt);
  r.setProperty('--border',`rgba(${t.br},0.2)`);
  r.setProperty('--border-light',`rgba(${t.br},0.1)`);
  r.setProperty('--shadow',`0 12px 32px rgba(${t.sh},${t.dark?'0.4':'0.06'})`);
  r.setProperty('--overlay',t.dark?'rgba(0,0,0,0.65)':'rgba(61,42,10,0.45)');
  const _rgb=hexToRgb(t.bg);
  r.setProperty('--bg-scrolled',`rgba(${_rgb},0.62)`);
  r.setProperty('--bg-fade-0',`rgba(${_rgb},0)`);
  r.setProperty('--bg-fade-92',`rgba(${_rgb},0.92)`);
  if(t.dark){
    r.setProperty('--glass-bg',`linear-gradient(145deg,rgba(255,255,255,.09) 0%,rgba(${t.br},.20) 50%,rgba(${t.br},.13) 100%)`);
    r.setProperty('--glass-shadow',`0 1.5px 0 rgba(255,255,255,.12) inset,0 -1px 0 rgba(${t.br},.35) inset,1.5px 0 0 rgba(255,255,255,.06) inset,-1.5px 0 0 rgba(255,255,255,.06) inset,0 8px 24px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.3),0 0 0 .75px rgba(${t.br},.4)`);
    r.setProperty('--glass-border',`rgba(${t.br},.3)`);
    r.setProperty('--glass-shine',`linear-gradient(to bottom,rgba(255,255,255,.08),rgba(255,255,255,0))`);
    r.setProperty('--glass-glow',`radial-gradient(ellipse,rgba(${t.br},.18),rgba(${t.br},0))`);
  }else{
    r.setProperty('--glass-bg','linear-gradient(145deg,rgba(255,255,255,.75) 0%,rgba(255,248,232,.42) 45%,rgba(255,240,215,.55) 100%)');
    r.setProperty('--glass-shadow',`0 2.5px 0 rgba(255,255,255,.98) inset,0 -1px 0 rgba(${t.br},.18) inset,1.5px 0 0 rgba(255,255,255,.68) inset,-1.5px 0 0 rgba(255,255,255,.68) inset,0 10px 32px rgba(${t.br},.22),0 3px 8px rgba(${t.br},.14),0 0 0 .75px rgba(255,255,255,.55)`);
    r.setProperty('--glass-border','rgba(255,255,255,.65)');
    r.setProperty('--glass-shine','linear-gradient(to bottom,rgba(255,255,255,.88),rgba(255,255,255,0))');
    r.setProperty('--glass-glow',`radial-gradient(ellipse,rgba(${t.br},.35),rgba(${t.br},0))`);
  }
  localStorage.setItem('dawam_theme',key);
}
function loadTheme(){applyTheme(localStorage.getItem('dawam_theme')||'zen');}
function renderThemeGrid(){
  const current=localStorage.getItem('dawam_theme')||'zen';
  document.getElementById('theme-grid').innerHTML=Object.entries(THEMES).map(([key,t])=>`
    <div class="theme-card${key===current?' active':''}" onclick="selectTheme('${key}')">
      <div class="theme-card-emoji">${t.emoji}</div>
      <div class="theme-card-swatches">
        <div class="theme-swatch" style="background:${t.bg}"></div>
        <div class="theme-swatch" style="background:${t.accent}"></div>
        <div class="theme-swatch" style="background:${t.green}"></div>
      </div>
      <div class="theme-card-name">${t.name}</div>
      ${t.tag?`<div style="font-size:9.5px;color:var(--text-light);text-transform:uppercase;letter-spacing:0.08em;margin-top:2px">${t.tag}</div>`:''}
    </div>`).join('');
}
function selectTheme(key){applyTheme(key);renderThemeGrid();}
function showThemeModal(){renderThemeGrid();document.getElementById('theme-modal').classList.add('show');}
function closeThemeModal(){document.getElementById('theme-modal').classList.remove('show');}
document.getElementById('theme-modal').addEventListener('click',function(e){if(e.target===this)closeThemeModal();});

// ═══ NOTIFICATIONS (Web Push) ═══
// ⚠️  Remplace cette URL après avoir déployé le Worker Cloudflare
const PUSH_WORKER = "https://dawam-push.mydawam.workers.dev";

function urlB64ToUint8(str) {
  const p = str.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(p + '='.repeat((4 - p.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function getVapidKey() {
  const res = await fetch(`${PUSH_WORKER}/public-key`);
  const { key } = await res.json();
  return key;
}

async function subscribePush() {
  const reg = await navigator.serviceWorker.ready;
  const vapidKey = await getVapidKey();
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8(vapidKey),
  });
}

async function toggleNotifs() {
  if (window.isNativeIOSApp) {
    const isOn = !!(S.notifs?.pushSub);
    if (isOn) {
      S.notifs = { pushSub: null };
      save();
      renderNotifToggle();
      showToast("Rappels désactivés");
      return;
    }
    window.webkit.messageHandlers.requestNotifPermission.postMessage({});
    return;
  }
  if (!('Notification' in window) || !('PushManager' in window)) {
    showToast("Notifications non supportées sur ce navigateur");
    return;
  }

  const isOn = !!(S.notifs?.pushSub);

  if (isOn) {
    // Désactiver
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch(`${PUSH_WORKER}/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
    } catch {}
    S.notifs = { pushSub: null };
    save();
    renderNotifToggle();
    showToast("Rappels désactivés");
    return;
  }

  // Demander la permission
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    showToast("Permission refusée — active-la dans les paramètres");
    return;
  }

  try {
    showToast("Activation en cours…");
    const sub = await subscribePush();
    await fetch(`${PUSH_WORKER}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sub.toJSON(), city: S.profile?.city || '', fajrOffset: S.profile?.fajrOffset ?? 15, palier: S.palier || 1, prayers: S.profile?.prayers || [] }),
    });
    S.notifs = { pushSub: sub.endpoint };
    save();
    renderNotifToggle();
    showToast("Rappels activés ✓ — tu recevras une notif chaque matin");
  } catch (e) {
    showToast("Erreur — vérifie que l'app est installée");
    console.error(e);
  }
}

function renderNotifToggle() {
  const toggle = document.getElementById('notif-toggle');
  if (toggle) toggle.classList.toggle('on', !!(S.notifs?.pushSub));
}

// ═══ DARK MODE ═══
function isDarkMode(){return !!(THEMES[localStorage.getItem('dawam_theme')||'zen']?.dark);}
function toggleDarkMode(){
  const current=localStorage.getItem('dawam_theme')||'zen';
  if(isDarkMode()){
    applyTheme(localStorage.getItem('dawam_last_light')||'zen');
  } else {
    localStorage.setItem('dawam_last_light',current);
    applyTheme('quest');
  }
  const toggle=document.getElementById('dark-toggle');
  if(toggle)toggle.classList.toggle('on',isDarkMode());
}

// ═══ ABOUT ═══
function showAbout(){document.getElementById("about-modal").classList.add("show");}
function closeAbout(){document.getElementById("about-modal").classList.remove("show");}
document.getElementById("about-modal").addEventListener("click",function(e){if(e.target===this)closeAbout();});

// ═══ FEEDBACK ═══
let fbRating = 0;
function showFeedbackModal(){
  fbRating=0;
  document.getElementById('fb-content').innerHTML=`
    <div class="fb-title">Ton avis compte</div>
    <div class="fb-sub">Comment tu trouves Dawam jusqu'ici ? Ton retour aide à améliorer l'app.</div>
    <div class="fb-ratings" id="fb-ratings">
      <div class="fb-rating" data-val="1" onclick="selectRating(1)"><div class="fb-rating-emoji">😕</div><div class="fb-rating-label">Difficile</div></div>
      <div class="fb-rating" data-val="2" onclick="selectRating(2)"><div class="fb-rating-emoji">🙂</div><div class="fb-rating-label">Bien</div></div>
      <div class="fb-rating" data-val="3" onclick="selectRating(3)"><div class="fb-rating-emoji">🌟</div><div class="fb-rating-label">Excellent</div></div>
    </div>
    <textarea class="fb-textarea" id="fb-text" placeholder="Un commentaire, une suggestion… (optionnel)" maxlength="400"></textarea>
    <button class="btn-primary" id="fb-send" onclick="submitFeedback()" disabled>Envoyer</button>
    <button class="btn-secondary" onclick="closeFeedbackModal()">Annuler</button>`;
  document.getElementById('feedback-modal').classList.add('show');
}
function closeFeedbackModal(){document.getElementById('feedback-modal').classList.remove('show');}
document.getElementById('feedback-modal').addEventListener('click',function(e){if(e.target===this)closeFeedbackModal();});
function selectRating(val){
  fbRating=val;
  document.querySelectorAll('.fb-rating').forEach(el=>el.classList.toggle('selected',Number(el.dataset.val)===val));
  document.getElementById('fb-send').disabled=false;
}
async function submitFeedback(){
  const comment=document.getElementById('fb-text').value.trim();
  if(!fbRating)return;
  const btn=document.getElementById('fb-send');
  btn.disabled=true;btn.textContent='Envoi…';
  try{
    await fetch(`${PUSH_WORKER}/feedback`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({rating:fbRating,comment,palier:S.palier,name:S.name||''}),
    });
    const emojis={1:'🤲',2:'💚',3:'🌟'};
    const msgs={1:'Merci pour ton honnêteté — chaque retour aide à améliorer Dawam.',2:'Jazak Allah khayran !',3:'Alhamdulillah ! Que Allah te bénisse dans ta constance.'};
    S.feedbackDone=true;save();
    document.getElementById('fb-content').innerHTML=`<div class="fb-sent"><div class="fb-sent-emoji">${emojis[fbRating]}</div><div class="fb-sent-msg">${msgs[fbRating]}</div></div><button class="btn-primary" style="margin-top:16px" onclick="closeFeedbackModal()">Fermer</button>`;
  }catch(e){
    btn.disabled=false;btn.textContent='Envoyer';
    showToast('Erreur — réessaie plus tard');
  }
}

// ═══ PWA INSTALL ═══
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;});

// iOS natif — efface le badge au premier plan (ouverture app)
// Le natif Swift gère aussi l'appel APNs via applicationDidBecomeActive (plus fiable)
(function() {
  function clearIOSBadge() {
    if (!window.isNativeIOSApp) return;
    const sub = S.notifs?.pushSub;
    if (!sub?.startsWith('apns:')) return;
    const token = sub.replace('apns:', '');
    if (!token || token === 'simulator-token') return;
    const url  = PUSH_WORKER + '/clear-badge-apns';
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceToken: token }) }).catch(() => {});
  }

  // Foreground (retour au premier plan) — efface immédiatement
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) return;
    clearIOSBadge();
  });
})();

function isIOS(){return/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;}
function isInStandaloneMode(){return window.isNativeIOSApp||window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone;}
function showInstallBanner(){
  if(isInStandaloneMode())return;
  if(localStorage.getItem("install_dismissed"))return;
  document.getElementById("install-banner").classList.add("show");
}
function closeBanner(){document.getElementById("install-banner").classList.remove("show");localStorage.setItem("install_dismissed","1");}
function showInstallInstructions(){
  if(deferredPrompt){deferredPrompt.prompt();deferredPrompt.userChoice.then(()=>{deferredPrompt=null;closeBanner();});return;}
  if(isIOS()){alert("Pour installer Dawam :\n\n1. Appuie sur le bouton Partager (□↑) en bas de Safari\n2. Choisis \"Sur l'écran d'accueil\"\n3. Appuie sur \"Ajouter\"\n\nDawam apparaîtra comme une vraie app !");return;}
  showToast("Utilise le menu de ton navigateur → Installer l'application");
}

// ═══ SERVICE WORKER ═══
let _swWaiting=null;
// PREPROD : service worker désactivé (pas de cache)
if(false && "serviceWorker" in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("sw.js").then(reg=>{
      const doUpdate = (sw) => {
        _swWaiting = sw;
        sw.postMessage("skipWaiting");
      };
      // Nouvelle version en cours d'installation → mise à jour auto
      reg.addEventListener("updatefound",()=>{
        const nw=reg.installing;
        nw.addEventListener("statechange",()=>{
          if(nw.state==="installed"&&navigator.serviceWorker.controller){
            doUpdate(nw);
          }
        });
      });
      // SW déjà en attente au chargement → mise à jour auto
      if(reg.waiting&&navigator.serviceWorker.controller){
        doUpdate(reg.waiting);
      }
      // iOS natif : vérifie les mises à jour du SW à chaque retour au premier plan
      if(window.isNativeIOSApp){
        document.addEventListener('visibilitychange',()=>{
          if(!document.hidden) reg.update();
        });
      }
    }).catch(()=>{});
    // Recharger quand le nouveau SW prend le contrôle
    let _refreshing=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{
      if(!_refreshing){_refreshing=true;location.reload();}
    });
  });
}
function applyUpdate(){
  if(_swWaiting){_swWaiting.postMessage("skipWaiting");}
  else{location.reload();}
}

// ═══ PRAYER TIMES ═══
const PT_CACHE_KEY="dawam_pt";
function parseTime(t){if(!t)return 0;const[h,m]=t.split(":").map(Number);return h*60+m;}
async function fetchPrayerTimes(city){
  if(!city)return null;
  const today=new Date();
  const dateStr=`${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;
  const cacheRaw=localStorage.getItem(PT_CACHE_KEY);
  if(cacheRaw){try{const c=JSON.parse(cacheRaw);if(c.date===dateStr&&c.city===city)return c.timings;}catch{}}
  try{
    const url=`https://api.aladhan.com/v1/timingsByAddress/${dateStr}?address=${encodeURIComponent(city)}&method=2`;
    const r=await fetch(url);const data=await r.json();
    if(data.code===200){const timings=data.data.timings;localStorage.setItem(PT_CACHE_KEY,JSON.stringify({date:dateStr,city,timings}));return timings;}
  }catch{}
  return null;
}

// ═══ VERSETS MÉRITOIRES ═══
const VERSETS_CATALOG=[
  {id:'fatiha',title:'Al-Fātiḥa',ref:'[1]',merit:'La mère du Coran — récitée dans chaque prière.',
    arabic:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿١﴾ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿٢﴾ الرَّحْمَٰنِ الرَّحِيمِ ﴿٣﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾',
    phonetic:'Bismillāhi r-raḥmāni r-raḥīm. Al-ḥamdu lillāhi rabbi l-ʿālamīn. Ar-raḥmāni r-raḥīm. Māliki yawmi d-dīn. Iyyāka naʿbudu wa iyyāka nastaʿīn. Ihdinā ṣ-ṣirāṭa l-mustaqīm. Ṣirāṭa lladhīna anʿamta ʿalayhim ghayri l-maghḍūbi ʿalayhim wa lā ḍ-ḍāllīn.',
    french:'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux. Louange à Allah, Seigneur des univers, le Tout Miséricordieux, le Très Miséricordieux, Maître du Jour de la rétribution. C\'est Toi que nous adorons et c\'est Toi dont nous implorons le secours. Guide-nous dans le droit chemin — le chemin de ceux que Tu as comblés de bienfaits, non pas de ceux qui ont encouru Ta colère, ni des égarés.'},
  {id:'baqara_1_5',title:'Al-Baqara 1–5',ref:'[2:1-5]',merit:'Les premiers versets de la plus longue sourate — une lumière pour les pieux.',
    arabic:'الم ﴿١﴾ ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ ﴿٢﴾ الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ ﴿٣﴾ وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ ﴿٤﴾ أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ ﴿٥﴾',
    phonetic:'Alif Lām Mīm. Dhālika l-kitābu lā rayba fīh, hudan li-l-muttaqīn. Alladhīna yuʾminūna bi-l-ghaybi wa yuqīmūna ṣ-ṣalāta wa mimmā razaqnāhum yunfiqūn. Wa lladhīna yuʾminūna bi-mā unzila ilayka wa mā unzila min qablika wa bi-l-ākhirati hum yūqinūn. Ulāʾika ʿalā hudan min rabbihim wa ulāʾika humu l-mufliḥūn.',
    french:'Alif Lam Mim. C\'est le Livre au sujet duquel il n\'y a aucun doute, c\'est un guide pour les pieux — ceux qui croient à l\'Invisible, établissent la prière et dépensent de ce que Nous leur avons attribué. Et ceux qui croient en ce qui t\'a été révélé et ce qui a été révélé avant toi, et qui ont certitude en la Vie future. Ceux-là sont sur un chemin directeur venant de leur Seigneur, et ce sont eux qui réussissent.'},
  {id:'ayat_kursi',title:'Āyat al-Kursī',ref:'[2:255]',merit:'Récitée après chaque prière — protection absolue jusqu\'à la prochaine. — Nasa\'i',
    arabic:'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    phonetic:'Allāhu lā ilāha illā Huw, al-Ḥayyu l-Qayyūm. Lā taʾkhudhuhu sinatun wa lā nawm. Lahu mā fi s-samāwāti wa mā fi l-arḍ. Man dhā lladhī yashfaʿu ʿindahu illā bi-idhnih. Yaʿlamu mā bayna aydīhim wa mā khalfahum wa lā yuḥīṭūna bi-shayʾin min ʿilmihi illā bi-mā shāʾ. Wasiʿa kursiyyuhu s-samāwāti wa l-arḍ wa lā yaʾūduhu ḥifẓuhumā wa Huwa l-ʿAliyyu l-ʿAẓīm.',
    french:'Allah ! Nul dieu en dehors de Lui, le Vivant, le Subsistant. Ni somnolence ni sommeil ne Le saisissent. À Lui appartient ce qui est dans les cieux et sur la terre. Qui peut intercéder auprès de Lui sans Sa permission ? Il sait ce qui est devant eux et ce qui est derrière eux. Ils n\'embrassent de Sa science que ce qu\'Il veut. Son Trône s\'étend sur les cieux et la terre, dont la garde ne Lui coûte aucune peine. Et c\'est Lui le Très-Haut, l\'Immense.'},
  {id:'baqara_285_286',title:'Al-Baqara 285–286',ref:'[2:285-286]',merit:'Ces deux versets suffisent à celui qui les récite le soir. — Bukhari',
    arabic:'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ ﴿٢٨٥﴾ لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ ﴿٢٨٦﴾',
    phonetic:'Āmana r-rasūlu bi-mā unzila ilayhi min rabbih wal-muʾminūn. Kullun āmana billāhi wa malāʾikatihi wa kutubihi wa rusulihi lā nufarriqu bayna aḥadin min rusulihi wa qālū samiʿnā wa aṭaʿnā ghufranaka Rabbanā wa ilayka l-maṣīr. Lā yukallifu llāhu nafsan illā wusʿahā...',
    french:'Le Messager croit en ce qui lui a été révélé de son Seigneur, et les croyants aussi. Chacun croit en Allah, en Ses anges, en Ses livres et en Ses messagers. Ils ont dit : Nous avons entendu et obéi. Accorde-nous Ton pardon, Seigneur, et c\'est vers Toi le retour. Allah n\'impose à aucune âme une charge supérieure à sa capacité. Seigneur, ne nous châtie pas si nous oublions ou si nous commettons une erreur. Seigneur, ne nous impose pas un fardeau comme Tu l\'as imposé à ceux avant nous. Seigneur, ne nous charge pas de ce que nous ne pouvons pas supporter. Efface nos fautes, pardonne-nous, aie pitié de nous. Tu es notre Maître — accorde-nous la victoire sur le peuple des mécréants.'},
  {id:'kahf',title:'Al-Kahf',ref:'[18]',merit:'Récitée le vendredi — elle illumine entre les deux vendredis et protège du Dajjal.',longSura:true,instruction:'Lis la sourate Al-Kahf dans ton Muṣḥaf. Commence par Bismillāh. Lis lentement, avec présence du cœur.'},
  {id:'yasin',title:'Yā-Sīn',ref:'[36]',merit:'Le cœur du Coran. Sa récitation vaut 10 Corans récités. — Tirmidhi',longSura:true,instruction:'Lis la sourate Yā-Sīn dans ton Muṣḥaf. Commence par Bismillāh.'},
  {id:'waqia',title:'Al-Wāqi\'a',ref:'[56]',merit:'Celui qui la récite chaque nuit ne connaîtra jamais la misère. — Ibn Masʿūd',longSura:true,instruction:'Lis la sourate Al-Wāqiʿa dans ton Muṣḥaf. Commence par Bismillāh.'},
  {id:'mulk',title:'Al-Mulk',ref:'[67]',merit:'Elle protège du châtiment de la tombe chaque nuit. — Tirmidhi',longSura:true,instruction:'Lis la sourate Al-Mulk dans ton Muṣḥaf. Commence par Bismillāh.'},
  {id:'ikhlas_falaq_nas',title:'Al-Ikhlāṣ + Al-Falaq + An-Nās',ref:'[112–114]',merit:'×3 chacune au matin et au soir — protection contre tout mal. — Abu Dawud',repeat:3,
    arabic:'قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ﴿٤﴾',
    arabic2:'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾',
    arabic3:'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾',
    phonetic:'Qul Huwa llāhu Aḥad, Allāhu ṣ-Ṣamad, lam yalid wa lam yūlad, wa lam yakun lahu kufuwan aḥad. (×3) — Qul aʿūdhu bi-Rabbi l-falaq... (×3) — Qul aʿūdhu bi-Rabbi n-nās... (×3).',
    french:'Al-Ikhlāṣ : Dis : Il est Allah, Unique. Allah, le Seul à qui on s\'adresse. Il n\'engendre pas et n\'est pas engendré. Et nul n\'est égal à Lui. (×3) — Al-Falaq : Dis : Je cherche refuge auprès du Seigneur de l\'aube naissante, contre le mal de ce qu\'Il a créé... (×3) — An-Nās : Dis : Je cherche refuge auprès du Seigneur des hommes, Roi des hommes, Dieu des hommes... (×3)'},
  {id:'zalzala_asr_kafirun',title:'Az-Zalzala + Al-ʿAṣr + Al-Kāfirūn',ref:'[99·103·109]',merit:'Az-Zalzala ×4 vaut la moitié du Coran, Al-Kāfirūn ×4 le quart. — Tirmidhi',
    arabic:'إِذَا زُلْزِلَتِ الْأَرْضُ زِلْزَالَهَا ﴿١﴾ وَأَخْرَجَتِ الْأَرْضُ أَثْقَالَهَا ﴿٢﴾ وَقَالَ الْإِنسَانُ مَا لَهَا ﴿٣﴾ يَوْمَئِذٍ تُحَدِّثُ أَخْبَارَهَا ﴿٤﴾ بِأَنَّ رَبَّكَ أَوْحَىٰ لَهَا ﴿٥﴾ يَوْمَئِذٍ يَصْدُرُ النَّاسُ أَشْتَاتًا لِّيُرَوْا أَعْمَالَهُمْ ﴿٦﴾ فَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَرَهُ ﴿٧﴾ وَمَن يَعْمَلْ مِثْقَالَ ذَرَّةٍ شَرًّا يَرَهُ ﴿٨﴾',
    arabic2:'وَالْعَصْرِ ﴿١﴾ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ ﴿٢﴾ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ ﴿٣﴾',
    arabic3:'قُلْ يَا أَيُّهَا الْكَافِرُونَ ﴿١﴾ لَا أَعْبُدُ مَا تَعْبُدُونَ ﴿٢﴾ وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ ﴿٣﴾ وَلَا أَنَا عَابِدٌ مَا عَبَدتُّمْ ﴿٤﴾ وَلَا أَنتُمْ عَابِدُونَ مَا أَعْبُدُ ﴿٥﴾ لَكُمْ دِينُكُمْ وَلِيَ دِينِ ﴿٦﴾',
    phonetic:'Az-Zalzala (×4) : Idhā zulzilati l-arḍu zilzālahā... Quiconque fait le poids d\'un atome de bien le verra. — Al-ʿAṣr (×2) : Wa l-ʿaṣr... — Al-Kāfirūn (×4) : Qul yā ayyuha l-kāfirūn...',
    french:'Az-Zalzala (×4) : Quand la terre sera secouée d\'un violent séisme, qu\'elle expulsera ses fardeaux... Quiconque fait le poids d\'un atome de bien le verra, et quiconque fait le poids d\'un atome de mal le verra. — Al-ʿAṣr (×2) : Par le Temps ! L\'être humain est en perdition, sauf ceux qui croient, accomplissent les bonnes œuvres et s\'exhortent à la vérité et à l\'endurance. — Al-Kāfirūn (×4) : Dis : Ô vous les mécréants ! Je n\'adore pas ce que vous adorez... À vous votre religion, à moi la mienne.'},
];

// ═══ DU'A RABITA ═══
const DUA_RABITA_STEPS=[
  {step:1,emoji:'📖',title:'Al-Fātiḥa',
    desc:'Commence par la Fātiḥa — pour toi, pour tes proches, pour la Oumma.',
    arabic:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿١﴾ الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿٢﴾ الرَّحْمَٰنِ الرَّحِيمِ ﴿٣﴾ مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾',
    phonetic:'Bismillāhi r-raḥmāni r-raḥīm. Al-ḥamdu lillāhi rabbi l-ʿālamīn. Ar-raḥmāni r-raḥīm. Māliki yawmi d-dīn. Iyyāka naʿbudu wa iyyāka nastaʿīn. Ihdinā ṣ-ṣirāṭa l-mustaqīm. Ṣirāṭa lladhīna anʿamta ʿalayhim ghayri l-maghḍūbi ʿalayhim wa lā ḍ-ḍāllīn.',
    french:'Récite avec l\'intention d\'offrir cette récitation à tes frères et sœurs en Islam.'},
  {step:2,emoji:'💚',title:'Salawat sur le Prophète ﷺ',
    desc:'Dix salawat — chacune t\'en vaut 10 d\'Allah.',
    arabic:'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ النَّبِيِّ وَأَزْوَاجِهِ أُمَّهَاتِ الْمُؤْمِنِينَ وَذُرِّيَّتِهِ وَأَهْلِ بَيْتِهِ كَمَا صَلَّيْتَ عَلَى سَيِّدِنَا إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    phonetic:'Allāhumma ṣalli ʿalā Sayyidinā Muḥammadin n-nabiyyi wa azwājihi ummahāti l-muʾminīn wa dhurriyyatihi wa ahli baytihi kamā ṣallayta ʿalā Sayyidinā Ibrāhīm, innaka Ḥamīdun Majīd.',
    french:'Ô Allah, prie sur notre maître Muhammad le prophète, ses épouses mères des croyants, sa descendance et les gens de sa maison, comme Tu as prié sur notre maître Ibrahim. Tu es certes Digne de louange, Glorieux.',repeat:10},
  {step:3,emoji:'🤲',title:'Ta supplication personnelle',
    desc:'Invoque Allah pour ceux que tu aimes — par leurs noms. Demande-Lui de les guider, de les préserver, de les réunir sur Son amour.',
    tip:'Il n\'y a pas de mots imposés. Parle à Allah depuis ton cœur — en arabe, en français, dans ta langue. Il entend et comprend.'},
  {step:4,emoji:'💚',title:'Salawat sur le Prophète ﷺ',
    desc:'Encadre ta dua par les salawat — l\'invocation ainsi encadrée monte vers Allah et n\'est pas rejetée.',
    arabic:'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ النَّبِيِّ وَأَزْوَاجِهِ أُمَّهَاتِ الْمُؤْمِنِينَ وَذُرِّيَّتِهِ وَأَهْلِ بَيْتِهِ كَمَا صَلَّيْتَ عَلَى سَيِّدِنَا إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    phonetic:'Allāhumma ṣalli ʿalā Sayyidinā Muḥammadin n-nabiyyi...',
    french:'Répète 10 fois.',repeat:10},
  {step:5,emoji:'📖',title:'Sourate Al-ʿAṣr',
    desc:'Le Prophète ﷺ la récitait avec ses compagnons avant de se séparer — un rappel du temps qui passe et de la solidarité dans la foi.',
    arabic:'وَالْعَصْرِ ﴿١﴾ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ ﴿٢﴾ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ ﴿٣﴾',
    phonetic:'Wa l-ʿaṣr. Inna l-insāna lafī khusr. Illā lladhīna āmanū wa ʿamilū ṣ-ṣāliḥāti wa tawāṣaw bi-l-ḥaqqi wa tawāṣaw bi-ṣ-ṣabr.',
    french:'Par le Temps ! L\'être humain est en perdition — sauf ceux qui croient, accomplissent les bonnes œuvres, s\'exhortent mutuellement à la vérité et s\'exhortent mutuellement à l\'endurance.'},
  {step:6,emoji:'🌟',title:'Invocation finale',
    desc:'Clôture ta séance par cette glorification extraite du Coran.',
    arabic:'سُبْحَانَ رَبِّكَ رَبِّ الْعِزَّةِ عَمَّا يَصِفُونَ ﴿١٨٠﴾ وَسَلَامٌ عَلَى الْمُرْسَلِينَ ﴿١٨١﴾ وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿١٨٢﴾',
    phonetic:'Subḥāna Rabbika Rabbi l-ʿizzati ʿammā yaṣifūn, wa salāmun ʿalā l-mursalīn, wa l-ḥamdu lillāhi Rabbi l-ʿālamīn.',
    french:'Gloire à Ton Seigneur, Seigneur de la Puissance, au-delà de ce qu\'ils décrivent ! Paix sur les Messagers ! Et louange à Allah, Seigneur des Univers !'},
];

function playAubeBeep(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const osc=ctx.createOscillator();const gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.frequency.value=880;osc.type="sine";
    gain.gain.setValueAtTime(0.3,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.2);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+1.2);
  }catch{}
}

// ═══ SÉANCE DE L'AUBE ═══
let _sa={phase:null,invocStep:0,versetStep:0,duaStep:0};

function openSeanceGuidee(){
  if(!S.premium){showPremiumGate();return;}
  if(!S.versetSelection)S.versetSelection=[];
  _sa={phase:'invocations',invocStep:0,versetStep:0,duaStep:0};
  _saLastPhase=null;
  document.getElementById('seance-aube').classList.add('show');
  renderSeancePhase();
}

function closeSeanceAube(){
  document.getElementById('seance-aube').classList.remove('show');
  setTimeout(()=>{document.getElementById('sa-body').innerHTML='';},420);
}

function seanceCta(){
  if(_sa.phase==='invocations')seanceNextInvoc();
  else if(_sa.phase==='versets_select')seanceConfirmVersets();
  else if(_sa.phase==='versets_read')seanceNextVerset();
  else if(_sa.phase==='dua_rabita')seanceNextDua();
  else if(_sa.phase==='chourouk')seanceFinish();
  else if(_sa.phase==='done')closeSeanceAube();
}

function seanceSkip(){
  if(_sa.phase==='versets_read'){_sa.phase='versets_select';renderSeancePhase();}
  else if(_sa.phase==='chourouk')seanceFinish();
}

function seanceNextInvoc(){
  _sa.invocStep++;
  if(_sa.invocStep>=ADHKAR.matin.length){
    if(!S.versetSelection||S.versetSelection.length===0)_sa.phase='versets_select';
    else{_sa.versetStep=Math.min(S.versetLastStep||0,S.versetSelection.length-1);_sa.phase='versets_read';}
  }
  renderSeancePhase();
}

function seanceConfirmVersets(){
  if(!S.versetSelection||S.versetSelection.length===0){showToast('Sélectionne au moins un verset pour continuer.');return;}
  _sa.versetStep=0;S.versetLastStep=0;save();
  _sa.phase='versets_read';renderSeancePhase();
}

function seanceNextVerset(){
  _sa.versetStep++;
  const sel=S.versetSelection||[];
  if(_sa.versetStep>=sel.length){S.versetLastStep=0;_sa.phase='dua_rabita';_sa.duaStep=0;}
  else{S.versetLastStep=_sa.versetStep;}
  save();renderSeancePhase();
}

function seanceNextDua(){
  _sa.duaStep++;
  if(_sa.duaStep>=DUA_RABITA_STEPS.length)_sa.phase='chourouk';
  renderSeancePhase();
}

function seanceFinish(){
  if(!S.checklist[2])toggleItem(2);
  _sa.phase='done';renderSeancePhase();
}

function toggleVersetSel(id){
  if(!S.versetSelection)S.versetSelection=[];
  const idx=S.versetSelection.indexOf(id);
  if(idx>=0)S.versetSelection.splice(idx,1);else S.versetSelection.push(id);
  save();renderSeancePhase();
}

const SA_PHASES=[
  {key:'invocations',emoji:'📿',label:'Invocations',intro:'Les invocations du matin',sub:'Récite-les une par une, avec présence du cœur.'},
  {key:'versets',emoji:'📖',label:'Versets',intro:'Versets méritoires',sub:'Les versets qui protègent et illuminent la journée.'},
  {key:'dua',emoji:'💚',label:"Du'a",intro:"Du'a ar-Rābiṭa",sub:'Invoque pour tes frères et sœurs dans l\'amour d\'Allah.'},
  {key:'chourouk',emoji:'☀️',label:'Chourouk',intro:'Attente du Chourouk',sub:'Reste assis jusqu\'au lever du soleil — récompense d\'un pèlerinage.'},
];
function phaseKey(phase){
  if(phase==='versets_select'||phase==='versets_read')return'versets';
  if(phase==='dua_rabita')return'dua';
  return phase;
}
function renderSaStepper(){
  const cur=phaseKey(_sa.phase);
  const curIdx=SA_PHASES.findIndex(p=>p.key===cur);
  document.getElementById('sa-stepper').innerHTML=SA_PHASES.map((p,i)=>{
    const state=i<curIdx?'done':i===curIdx?'active':'';
    return`<div class="sa-step${state?' '+state:''}">
      <div class="sa-step-dot">${i<curIdx?'✓':p.emoji}</div>
      <div class="sa-step-label">${p.label}</div>
    </div>`;
  }).join('');
}
let _saLastPhase=null;
function renderSeancePhase(){
  const body=document.getElementById('sa-body');
  const cta=document.getElementById('sa-cta');
  const skip=document.getElementById('sa-skip');
  const fill=document.getElementById('sa-progress-fill');
  skip.style.display='none';
  const curKey=phaseKey(_sa.phase);
  const phaseChanged=_saLastPhase!==null&&phaseKey(_saLastPhase)!==curKey;
  _saLastPhase=_sa.phase;
  renderSaStepper();
  if(phaseChanged){
    const meta=SA_PHASES.find(p=>p.key===curKey);
    body.innerHTML=`<div class="sa-phase-transition">
      <div class="sa-phase-transition-emoji">${meta.emoji}</div>
      <div class="sa-phase-transition-title">${meta.intro}</div>
      <div class="sa-phase-transition-sub">${meta.sub}</div>
    </div>`;
    cta.textContent='Commencer →';
    cta.onclick=()=>{cta.onclick=()=>seanceCta();renderSeancePhaseContent();};
    return;
  }
  renderSeancePhaseContent();
}
function renderSeancePhaseContent(){
  const body=document.getElementById('sa-body');
  const cta=document.getElementById('sa-cta');
  const skip=document.getElementById('sa-skip');
  const fill=document.getElementById('sa-progress-fill');
  skip.style.display='none';

  if(_sa.phase==='invocations'){
    const invocs=ADHKAR.matin;
    const i=_sa.invocStep;
    const inv=invocs[i];
    const isLast=i>=invocs.length-1;
    fill.style.width=Math.round(i/invocs.length*25)+'%';
    const palierLow=S.palier<=2;
    body.innerHTML=`<div class="sa-card">
      <div class="sa-card-counter">${i+1} / ${invocs.length}</div>
      ${inv.repeat>1?`<div class="sa-card-repeat">× ${inv.repeat}</div>`:''}
      <div class="sa-card-arabic">${inv.arabic}</div>
      <div class="sa-card-phonetic">${inv.phonetic}</div>
      <div class="sa-card-french">${inv.french}</div>
      ${inv.source?`<div class="sa-card-source">${inv.source}</div>`:''}
      ${inv.note?`<div class="sa-card-note">📍 ${inv.note}</div>`:''}
      ${palierLow&&i===0?`<div class="sa-card-tip">💡 Lis chaque invocation au moins une fois — la constance prime sur la quantité.</div>`:''}
    </div>`;
    cta.textContent=isLast?'Terminer les invocations →':'Suivant →';
  }
  else if(_sa.phase==='versets_select'){
    fill.style.width='25%';
    const sel=S.versetSelection||[];
    body.innerHTML=`<div class="sa-verset-select">
      <div class="sa-verset-select-title">Quels versets lis-tu le matin ?</div>
      <p class="sa-verset-select-sub">L'app mémorise ta sélection et te permettra de reprendre là où tu t'es arrêté.</p>
      ${VERSETS_CATALOG.map(v=>`<div class="sa-verset-item${sel.includes(v.id)?' selected':''}" onclick="toggleVersetSel('${v.id}')">
        <div class="sa-verset-check">${sel.includes(v.id)?'✓':''}</div>
        <div>
          <div class="sa-verset-item-title">${v.title}</div>
          <div class="sa-verset-item-ref">${v.ref}</div>
          <div class="sa-verset-item-merit">${v.merit}</div>
        </div>
      </div>`).join('')}
    </div>`;
    const n=sel.length;
    cta.textContent=n>0?`Commencer (${n} sélectionné${n>1?'s':''}) →`:'Sélectionne tes versets →';
  }
  else if(_sa.phase==='versets_read'){
    const sel=S.versetSelection||[];
    const i=_sa.versetStep;
    if(i>=sel.length){seanceNextVerset();return;}
    const v=VERSETS_CATALOG.find(x=>x.id===sel[i]);
    if(!v){seanceNextVerset();return;}
    const isLast=i>=sel.length-1;
    fill.style.width=(25+Math.round(i/sel.length*25))+'%';
    let inner='';
    if(v.longSura){
      inner=`<div class="sa-card-verset-title">${v.title} <span class="sa-card-ref">${v.ref}</span></div>
        <div class="sa-card-merit">🌟 ${v.merit}</div>
        <div class="sa-card-instruction">${v.instruction}</div>`;
    }else if(v.arabic2){
      inner=`<div class="sa-card-verset-title">${v.title} <span class="sa-card-ref">${v.ref}</span></div>
        <div class="sa-card-merit">🌟 ${v.merit}</div>
        ${v.repeat?`<div class="sa-card-repeat">× ${v.repeat} chacune</div>`:''}
        <div class="sa-card-arabic">${v.arabic}</div>
        <div class="sa-card-sep"></div>
        <div class="sa-card-arabic">${v.arabic2}</div>
        ${v.arabic3?`<div class="sa-card-sep"></div><div class="sa-card-arabic">${v.arabic3}</div>`:''}
        <div class="sa-card-phonetic">${v.phonetic}</div>
        <div class="sa-card-french">${v.french}</div>`;
    }else{
      inner=`<div class="sa-card-verset-title">${v.title} <span class="sa-card-ref">${v.ref}</span></div>
        <div class="sa-card-merit">🌟 ${v.merit}</div>
        <div class="sa-card-arabic">${v.arabic}</div>
        <div class="sa-card-phonetic">${v.phonetic}</div>
        <div class="sa-card-french">${v.french}</div>`;
    }
    body.innerHTML=`<div class="sa-card"><div class="sa-card-counter">Verset ${i+1} / ${sel.length}</div>${inner}</div>`;
    skip.style.display='block';skip.textContent='Modifier ma sélection';
    cta.textContent=isLast?'Terminer les versets →':'Suivant →';
  }
  else if(_sa.phase==='dua_rabita'){
    const i=_sa.duaStep;
    const step=DUA_RABITA_STEPS[i];
    const isLast=i>=DUA_RABITA_STEPS.length-1;
    fill.style.width=(50+Math.round(i/DUA_RABITA_STEPS.length*25))+'%';
    body.innerHTML=`<div class="sa-card">
      <div class="sa-card-counter">Étape ${i+1} / ${DUA_RABITA_STEPS.length}</div>
      <div class="sa-card-big-emoji">${step.emoji}</div>
      <div class="sa-card-step-title">${step.title}</div>
      <div class="sa-card-desc">${step.desc}</div>
      ${step.arabic?`<div class="sa-card-arabic">${step.arabic}</div>`:''}
      ${step.phonetic?`<div class="sa-card-phonetic">${step.phonetic}</div>`:''}
      ${step.french?`<div class="sa-card-french">${step.french}</div>`:''}
      ${step.repeat?`<div class="sa-card-repeat">× ${step.repeat}</div>`:''}
      ${step.tip?`<div class="sa-card-tip">💡 ${step.tip}</div>`:''}
    </div>`;
    cta.textContent=isLast?"Terminer le Du'a rabita →":"C'est fait →";
  }
  else if(_sa.phase==='chourouk'){
    fill.style.width='75%';
    pill.textContent='Chourouk';
    const pt=S.prayerTimes;
    let chouroukHtml='';
    if(pt&&pt.Sunrise){
      const now=new Date();
      const cur=now.getHours()*60+now.getMinutes();
      const sunrise=parseTime(pt.Sunrise);
      const diff=sunrise-cur;
      if(diff>15){
        const h=Math.floor(diff/60),m=diff%60;
        chouroukHtml=`<div class="sa-chourouk-block">
          <div class="sa-chourouk-icon">🌅</div>
          <div class="sa-chourouk-label">Chourouk dans</div>
          <div class="sa-chourouk-countdown">${h>0?h+'h ':''} ${m} min</div>
          <div class="sa-chourouk-time">${pt.Sunrise}</div>
        </div>
        <p class="sa-chourouk-desc">Reste en dhikr ou récitation jusqu'au lever du soleil. Attends encore 10–15 min après, puis prie tes 2 raka'at.</p>`;
      }else if(diff>-45){
        chouroukHtml=`<div class="sa-chourouk-block">
          <div class="sa-chourouk-icon">☀️</div>
          <div class="sa-chourouk-label">${diff>0?'Lever du soleil imminent — dans '+diff+' min':"C'est l'heure du Chourouk"}</div>
        </div>
        <p class="sa-chourouk-desc">Prie maintenant tes 2 raka'at du Chourouk. Récompense égale à un pèlerinage et une ʿumra complète, complète, complète. ﷺ</p>`;
      }else{
        chouroukHtml=`<div class="sa-chourouk-block">
          <div class="sa-chourouk-icon">☀️</div>
          <div class="sa-chourouk-label">Chourouk passé</div>
        </div>
        <p class="sa-chourouk-desc">Le moment idéal est passé — tu peux quand même prier 2 raka'at nafl pour clôturer ta séance. L'intention sincère compte.</p>`;
      }
    }else{
      chouroukHtml=`<div class="sa-chourouk-block">
        <div class="sa-chourouk-icon">☀️</div>
        <div class="sa-chourouk-label">Prière du Chourouk</div>
      </div>
      <p class="sa-chourouk-desc">10 à 15 min après le lever du soleil — prie 2 raka'at. Récompense d'un pèlerinage et d'une ʿumra complète.</p>`;
    }
    body.innerHTML=`<div class="sa-card">${chouroukHtml}
      <div class="sa-card-hadith">« Celui qui prie le Fajr en communauté, puis reste assis à faire dhikr jusqu'au lever du soleil, puis prie 2 raka'at, aura la récompense d'un ḥajj et d'une ʿumra — complète, complète, complète. »<br><small>At-Tirmidhī — Ḥasan</small></div>
    </div>`;
    skip.style.display='block';skip.textContent='Terminer sans le Chourouk';
    cta.textContent="J'ai fait mes 2 raka'at ✓";
  }
  else if(_sa.phase==='done'){
    fill.style.width='100%';
    renderSaStepper();
    const msgs=['Que Allah l\'accepte de toi.','Barakallahu fik.','Petit mais constant — c\'est le secret.','Les anges sont témoins de ta constance.','Continue ainsi — chaque jour compte.'];
    body.innerHTML=`<div class="sa-done-block">
      <div class="sa-done-emoji">✨</div>
      <div class="sa-done-title">Séance accomplie</div>
      <div class="sa-done-sub">${msgs[Math.floor(Math.random()*msgs.length)]}</div>
      <div style="display:flex;gap:10px;margin-top:8px;flex-wrap:wrap;justify-content:center">
        ${SA_PHASES.map(p=>`<div style="background:var(--bg-card);border:.5px solid var(--green);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;color:var(--green)">${p.emoji} ${p.label}</div>`).join('')}
      </div>
    </div>`;
    cta.textContent='Fermer →';
    cta.onclick=()=>closeSeanceAube();
  }
}

// ═══ GUIDED ═══
const GUIDED_FLOWS = {
  1:{ type:'steps', steps:[
    {emoji:'⏰',title:'Réveille-toi',desc:'Commence par dire Alhamdulillah. La nuit appartient à ceux qui la saisissent.',tip:'Si c\'est difficile de te lever — pose ton alarme loin du lit. Le premier pas est le plus courageux.'},
    {emoji:'💧',title:'Fais les ablutions',desc:'Prends ton temps. Les ablutions préparent l\'extérieur pour préparer l\'intérieur.'},
    {emoji:'🤲',title:'2 raka\'at légères pour commencer',desc:'C\'est la Sunna d\'ouvrir la prière de nuit. Courtes, pour réveiller le corps et le cœur.',tip:'Pour les débutants : ces 2 raka\'at + Witr suffisent. Augmente progressivement.'},
    {emoji:'📿',title:'Continue 2 par 2',desc:'Autant que tu peux — 2, 4, 6, 8 raka\'at. Chaque paire compte.'},
    {emoji:'🌙',title:'Termine par le Witr',desc:'1 raka\'a minimum. Le Prophète ﷺ ne l\'abandonnait jamais — ni en voyage ni à la maison.',arabic:'اللَّهُمَّ إِنَّا نَسْتَعِينُكَ',phonetic:'Allāhumma innā nasta\'īnuk'},
    {emoji:'🌟',title:'Istighfar après le Witr',desc:'Reste assis. Demande pardon. C\'est l\'heure la plus proche de la miséricorde divine.',tip:'« Ceux qui demandent pardon à l\'aurore » — sourate Adh-Dhāriyāt, verset 18'},
  ]},
  2:{ type:'steps', steps:[
    {emoji:'🧘',title:'Reste assis après Fajr',desc:'Ne te lève pas encore. Reste sur ton tapis, mains posées, cœur présent.',tip:'« Celui qui reste assis jusqu\'au lever du soleil aura la récompense d\'un pèlerinage complet. » — At-Tirmidhī'},
    {emoji:'📿',title:'Invocations du matin',desc:'Récite les invocations du matin à voix basse. Demande de pardon, puis les invocations habituelles.'},
    {emoji:'📖',title:'Versets méritoires',desc:'Al-Fātiḥa, Āyat al-Kursī, les 3 dernières sourates. Ces versets sont ton bouclier du matin.'},
    {emoji:'🔗',title:'Du\'a ar-Rābiṭa',desc:'Invoque pour tes frères et sœurs en Islam. En silence, intérieurement. La sincérité prime.',tip:'Invoque par leurs noms si tu peux. Cette invocation relie les cœurs dans l\'amour d\'Allah.'},
    {emoji:'☀️',title:'Attends le lever du soleil',desc:'Puis prie 2 à 8 raka\'at du Chourouk — récompense égale à un pèlerinage, complète, complète.'},
  ]},
  3:{ type:'steps', steps:[
    {emoji:'🕌',title:'2 raka\'at sunna avant Fajr',desc:'Ces 2 raka\'at ne s\'abandonnent jamais. Plus aimées du Prophète ﷺ que le monde entier.',tip:'« Les 2 raka\'at de l\'aube valent mieux que le monde et ce qu\'il contient. » — Muslim'},
    {emoji:'🤲',title:'Fajr — 2 raka\'at obligatoires',desc:'Avec présence du cœur. Pense à ce que tu récites, verset par verset.'},
    {emoji:'☀️',title:'Prière du Chourouk',desc:'10 à 15 min après le lever du soleil — 2 à 8 raka\'at. C\'est là que la journée prend racine.'},
  ]},
  4:{ type:'checklist', title:'Les rawatib que tu fais aujourd\'hui', items:[
    '2 raka\'at sunna avant le Fajr',
    '2 raka\'at après les ablutions (sunna de Bilāl)',
    '4 raka\'at avant le Dhuhr + 2 après',
    '2 raka\'at avant le \'Asr',
    '2 raka\'at avant le Maghrib + 6 après (Awwābīn)',
    '2 raka\'at avant le \'Ishāʾ + 4 après',
    'Chourouk : 2–8 raka\'at après le lever du soleil',
  ]},
  5:{ type:'timer', label:'Lecture du Coran', mode:'up', canFinishEarly:true,
    arabic:'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    phonetic:'Bismillāhi r-raḥmāni r-raḥīm',
    prompt:'Ouvre ton Coran à ton wird du jour. Lis lentement, avec présence du cœur.',
  },
  6:{ type:'checklist', title:'Sourates méritoires du matin', items:[
    'Al-Fātiḥa [1]',
    'Al-Baqara 1–5 · Āyat al-Kursī 255–257 · 285–286',
    'Al-Kahf [18]',
    'Yā-Sīn [36]',
    'Al-Wāqi\'a [56]',
    'Al-Mulk [67]',
    'Al-Ikhlāṣ ×3 + Al-Falaq + An-Nās',
    'Az-Zalzala ×4 · Al-\'Aṣr ×2 · Al-Kāfirūn ×4',
  ]},
  7:{ type:'timer', label:'Tahlil', mode:'down', sessions:3, duration:900,
    arabic:'لَا إِلَهَ إِلَّا اللَّهُ',
    phonetic:'Lā ilāha illa Llāh',
    french:'Il n\'y a de divinité qu\'Allah',
  },
  8:{ type:'counter', target:300, milestone:100,
    arabic:'اللَّهُمَّ صَلِّ عَلَى سَيِّدِنَا مُحَمَّدٍ النَّبِيِّ',
    phonetic:'Allāhumma ṣalli \'alā Sayyidinā Muḥammad',
    french:'Ô Allah, prie sur notre maître Muhammad le prophète ﷺ',
  },
  9:{ type:'steps', steps:[
    {emoji:'📋',title:'Bilan de ta journée',desc:'Qu\'as-tu accompli ? Qu\'as-tu manqué ? Sois honnête, sans sévérité excessive.',tip:'Al-Hassan al-Basri : « Que chaque croyant se tienne des comptes plus sévèrement que ne le ferait un associé avare. »'},
    {emoji:'🤲',title:'Renouvelle ta tawba',desc:'Demande sincèrement pardon pour les manquements. Allah est Tawwāb — Il se retourne vers celui qui revient vers Lui.'},
    {emoji:'💧',title:'Fais les ablutions',desc:'Pour dormir en état de pureté. L\'ange prie pour toi toute la nuit.',tip:'« Celui qui dort en état de pureté — un ange l\'accompagne et dit : Ô Allah, pardonne à Ton serviteur. » — Ibn Ḥibbān'},
    {emoji:'📿',title:'Invocations du sommeil',desc:'Āyat al-Kursī, les 3 dernières sourates, la supplication du sommeil. Fais-les à voix basse.'},
    {emoji:'🌙',title:'Dors sur le côté droit',desc:'Et que ta dernière pensée consciente soit une confidence adressée à ton Seigneur. Remets-toi à Lui.'},
  ]},
  10:{ type:'steps', steps:[
    {emoji:'📚',title:'Après tes adorations — tes études',desc:'C\'est ton jihad de l\'époque. Tes études sont un acte d\'adoration si tu les orientes vers le bien.',tip:'« Dis-moi ce que tu lis, je te dirai qui tu es. »'},
    {emoji:'🎯',title:'Une tâche précise aujourd\'hui',desc:'Choisis une chose à accomplir. Une seule. Fais-la bien plutôt que de survoler plusieurs.'},
    {emoji:'✅',title:'C\'est accompli',desc:'Tu l\'as fait. Chaque journée d\'effort honnête compte. Continue demain, même petitement.'},
  ]},
  11:{ type:'steps', steps:[
    {emoji:'🤝',title:'Contacte un frère ou une sœur pieux(se)',desc:'Un message, un appel, une visite. La bonne compagnie est l\'un des plus grands leviers de la foi.',tip:'« L\'homme est sur la religion de son ami intime. » — Abū Dāwūd'},
    {emoji:'🕌',title:'Un cercle de rappel aujourd\'hui',desc:'Khutba, cours, podcast islamique de qualité. Cherche à nourrir ton cœur régulièrement.'},
    {emoji:'💡',title:'Ce que tu retiens',desc:'Une parole, un hadith, une idée. Ce qu\'on note, on le retient. Ce qu\'on oublie, c\'est comme s\'il n\'avait pas eu lieu.'},
  ]},
  12:{ type:'steps', steps:[
    {emoji:'📗',title:'Ouvre ton livre de science',desc:'Croyance, fiqh, hadith, tafsir — là où tu en es. Avance à ton rythme.',tip:'« Celui à qui Dieu veut du bien, Il lui donne la compréhension de la religion. » — Al-Bukhāri'},
    {emoji:'🔍',title:'Un chapitre, compris et retenu',desc:'Lis lentement. Ne passe pas à la suite si tu n\'as pas compris. La lenteur ici est une vertu.'},
    {emoji:'✍️',title:'Note l\'essentiel',desc:'Une définition, une règle, une phrase. Ce que tu notes, tu le retiens. Ce que tu retiens, tu peux l\'appliquer.'},
  ]},
  13:{ type:'steps', steps:[
    {emoji:'🗓',title:'Planifie ta journée',desc:'Au réveil ou la veille — qu\'est-ce qui doit être fait ? Qu\'est-ce qui peut attendre ?'},
    {emoji:'📵',title:'Identifie les temps gaspillés',desc:'Réseaux, distractions, procrastination. Honnêteté sans culpabilité.',tip:'« Deux bienfaits dont beaucoup de gens sont floués : la santé et le temps libre. » — Al-Bukhāri'},
    {emoji:'⚡',title:'Une chose à changer demain',desc:'Pas tout. Une chose. Les habitudes durables se construisent une décision à la fois.'},
  ]},
  14:{ type:'steps', steps:[
    {emoji:'🤫',title:'Installe-toi dans le calme',desc:'Seul, en silence, après la séance de l\'aube. Cette invocation se fait intérieurement.'},
    {emoji:'💚',title:'Invoque pour tes frères et sœurs',desc:'Par leurs noms si tu peux. Demande à Allah de les guider, de les préserver, de les réunir sur Son amour.'},
    {emoji:'🤲',title:'Demande à Allah de réunir les cœurs',desc:'Sur Son amour. Sur l\'obéissance à Lui. Sur la miséricorde mutuelle entre croyants.',arabic:'اللَّهُمَّ أَلِّفْ بَيْنَ قُلُوبِنَا',phonetic:'Allāhumma allif bayna qulūbinā'},
    {emoji:'📖',title:'Termine par Al-Fātiḥa',desc:'Pour eux et pour toi. Que cette invocation scelle ta séance matinale.'},
  ]},
  16:{ type:'steps', steps:[
    {emoji:'🌆',title:'Installe-toi pour la soirée',desc:'Quelques minutes avant ou après Isha. Coupe les distractions. Ce moment est ton ancrage du soir.',tip:'Le croyant ne laisse pas sa journée se fermer sans un retour vers Allah.'},
    {emoji:'📿',title:'Invocations du soir',desc:'Récite les invocations du soir avec présence du cœur. Elles sont ton bouclier jusqu\'au matin.',tip:'Ouvre l\'onglet Invocations → Soir si tu veux les lire une par une.'},
    {emoji:'📖',title:'Versets protecteurs',desc:'Āyat al-Kursī, les 3 dernières sourates (×3 chacune). Ton bouclier de la nuit.',arabic:'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',phonetic:'Allāhu lā ilāha illā Huw, al-Ḥayyu l-Qayyūm...'},
    {emoji:'📋',title:'Bilan de ta journée',desc:'Qu\'as-tu accompli ? Qu\'as-tu manqué ? Sois honnête, sans sévérité excessive.',tip:'« Que chaque croyant se tienne des comptes plus sévèrement que ne le ferait un associé avare. » — Al-Ḥasan al-Baṣrī'},
    {emoji:'🤲',title:'Renouvelle ta demande de pardon',desc:'Pour les manquements d\'aujourd\'hui. Allah est Tawwāb — Il se retourne vers celui qui revient vers Lui.',arabic:'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',phonetic:'Rabi ghfir lī wa tub ʿalayya innaka anta t-Tawwābu r-Raḥīm'},
  ]},
};

let _gId=null,_gStep=0,_gChecked=new Set(),_gCount=0,_gTimerSec=0,_gTimerTotal=0,_gSession=0,_gInterval=null,_gRunning=false;

function openGuided(id){
  const item=PROGRAM.find(p=>p.id===id)||getPrayerItems().find(p=>p.id===id);
  const flow=GUIDED_FLOWS[id]||getPrayerFlow(id);
  if(!item||!flow){openDetail(id);return;}
  _gId=id;_gStep=0;_gChecked=new Set();_gCount=0;_gSession=0;_gRunning=false;
  if(_gInterval){clearInterval(_gInterval);_gInterval=null;}
  // Coran: adapter la durée au profil
  if(id===5){
    const g=S.profile?.quranGoal||'try';
    const dur=g==='hizb'?25*60:g==='pages'?20*60:g==='1page'?10*60:5*60;
    GUIDED_FLOWS[5].duration=dur;
  }
  _gTimerSec=flow.mode==='up'?0:(flow.duration||0);
  _gTimerTotal=flow.duration||0;
  document.getElementById('guided-screen').classList.add('show');
  renderGuided();
}

function renderGuided(){
  const flow=GUIDED_FLOWS[_gId]||getPrayerFlow(_gId); if(!flow)return;
  const body=document.getElementById('guided-body');
  const cta=document.getElementById('guided-cta');
  const dots=document.getElementById('guided-dots');
  const skipBtn=document.getElementById('guided-skip');
  if(skipBtn) skipBtn.style.display=(flow.type==='timer')?'block':'none';

  if(flow.type==='steps'){
    const steps=flow.steps,total=steps.length;
    dots.innerHTML=steps.map((_,i)=>`<div class="guided-dot${i<_gStep?' done':i===_gStep?' active':''}"></div>`).join('');
    if(_gStep>=total){renderGuidedDone();return;}
    const s=steps[_gStep];
    body.innerHTML=`<div class="guided-step fade-up">
      <div class="guided-step-num">Étape ${_gStep+1} / ${total}</div>
      <div class="guided-step-emoji">${s.emoji}</div>
      <div class="guided-step-title">${s.title}</div>
      <div class="guided-step-desc">${s.desc}</div>
      ${s.arabic?`<div class="guided-step-arabic">${s.arabic}</div><div class="guided-step-phonetic">${s.phonetic}</div>`:''}
      ${s.tip?`<div class="guided-step-tip">💡 ${s.tip}</div>`:''}
    </div>`;
    cta.textContent=_gStep<total-1?'C\'est fait, continuer →':'Terminer la séance ✓';
    cta.onclick=()=>{_gStep++;renderGuided();};
  }
  else if(flow.type==='counter'){
    dots.innerHTML='';
    const C=2*Math.PI*66,pct=Math.min(_gCount/flow.target,1),offset=C*(1-pct);
    body.innerHTML=`<div class="guided-counter fade-up">
      <div class="guided-counter-arabic">${flow.arabic}</div>
      <div class="guided-counter-phonetic">${flow.phonetic}</div>
      <div class="guided-counter-french">${flow.french}</div>
      <div class="guided-count-ring-wrap">
        <svg class="guided-count-ring-svg" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="66" fill="none" stroke="var(--border)" stroke-width="8"/>
          <circle id="guided-ring-arc" cx="80" cy="80" r="66" fill="none" stroke="var(--accent)" stroke-width="8"
            stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
            stroke-linecap="round" transform="rotate(-90 80 80)" style="transition:stroke-dashoffset .2s"/>
        </svg>
        <div class="guided-count-info">
          <div class="guided-count-val" id="guided-count-val">${_gCount}</div>
          <div class="guided-count-target">/ ${flow.target}</div>
        </div>
      </div>
      <button class="guided-tap-btn" onclick="guidedTap()">＋ Appuie pour compter</button>
    </div>`;
    cta.textContent=_gCount>=flow.target?'Terminer ✓':'Terminer (avant la fin)';
    cta.onclick=()=>renderGuidedDone();
  }
  else if(flow.type==='timer'){
    const sessions=flow.sessions||1;
    dots.innerHTML=Array.from({length:sessions},(_,i)=>`<div class="guided-dot${i<_gSession?' done':i===_gSession?' active':''}"></div>`).join('');
    const displaySec=flow.mode==='up'?_gTimerSec:_gTimerSec;
    const mm=String(Math.floor(displaySec/60)).padStart(2,'0'),ss=String(displaySec%60).padStart(2,'0');
    const pct=_gTimerTotal>0?(flow.mode==='up'?_gTimerSec/_gTimerTotal:1-_gTimerSec/_gTimerTotal)*100:0;
    body.innerHTML=`<div class="guided-timer fade-up">
      ${sessions>1?`<div class="guided-timer-session-label">Session ${_gSession+1} / ${sessions}</div><div class="guided-session-dots">${Array.from({length:sessions},(_,i)=>`<div class="guided-session-dot${i<_gSession?' done':i===_gSession?' current':''}"></div>`).join('')}</div>`:''}
      <div class="guided-timer-arabic">${flow.arabic}</div>
      <div class="guided-timer-phonetic">${flow.phonetic}</div>
      ${flow.french?`<p style="font-size:13px;color:var(--text-secondary);text-align:center;margin-bottom:12px">${flow.french}</p>`:''}
      ${flow.prompt?`<p style="font-size:14px;color:var(--text-secondary);text-align:center;line-height:1.5;margin-bottom:16px;max-width:280px">${flow.prompt}</p>`:''}
      <div class="guided-timer-display${_gRunning?' running':''}" id="guided-timer-display">${mm}:${ss}</div>
      <div class="guided-timer-bar"><div class="guided-timer-fill" id="guided-timer-fill" style="width:${pct.toFixed(1)}%"></div></div>
    </div>`;
    if(!_gRunning){
      cta.textContent='▶ Commencer';
      cta.onclick=()=>guidedTimerStart();
    } else if(flow.canFinishEarly){
      cta.textContent='J\'ai terminé ma lecture ✓';
      cta.onclick=()=>{guidedTimerStop();renderGuidedDone();};
    } else {
      cta.textContent='⏸ Pause';
      cta.onclick=()=>guidedTimerPause();
    }
  }
  else if(flow.type==='checklist'){
    dots.innerHTML='';
    const items=flow.items,allChecked=items.length>0&&items.every((_,i)=>_gChecked.has(i));
    body.innerHTML=`<div class="guided-checklist fade-up">
      <p class="guided-cl-title">${flow.title}</p>
      ${items.map((label,i)=>`<div class="guided-cl-item${_gChecked.has(i)?' checked':''}" onclick="guidedCheckItem(${i})">
        <div class="guided-cl-box">${_gChecked.has(i)?'✓':''}</div>
        <div class="guided-cl-label">${label}</div>
      </div>`).join('')}
    </div>`;
    cta.textContent=allChecked?'Terminer ✓':'J\'ai fait ce que je pouvais →';
    cta.onclick=()=>renderGuidedDone();
  }
}

function guidedSkip(){
  guidedTimerStop();
  renderGuidedDone();
}

function guidedTap(){
  const flow=GUIDED_FLOWS[_gId]||getPrayerFlow(_gId); if(!flow||flow.type!=='counter')return;
  _gCount++;
  const valEl=document.getElementById('guided-count-val'); if(valEl)valEl.textContent=_gCount;
  const C=2*Math.PI*66,pct=Math.min(_gCount/flow.target,1);
  const arc=document.getElementById('guided-ring-arc'); if(arc)arc.setAttribute('stroke-dashoffset',(C*(1-pct)).toFixed(1));
  if(flow.milestone&&_gCount>0&&_gCount%flow.milestone===0){
    showToast(_gCount>=flow.target?'Ma sha Allah ! ✨ '+flow.target+'/'+flow.target:'⭐ '+_gCount+' — Continue !');
  }
  const cta=document.getElementById('guided-cta');
  if(cta&&_gCount>=flow.target){cta.textContent='Terminer ✓';}
  if(_gCount>=flow.target)setTimeout(()=>renderGuidedDone(),600);
}

function guidedCheckItem(i){
  if(_gChecked.has(i))_gChecked.delete(i);else _gChecked.add(i);
  renderGuided();
}

function guidedTimerStart(){
  const flow=GUIDED_FLOWS[_gId]||getPrayerFlow(_gId); if(!flow)return;
  _gRunning=true;
  _gInterval=setInterval(()=>{
    if(flow.mode==='up'){
      _gTimerSec++;
      const el=document.getElementById('guided-timer-display');
      const fill=document.getElementById('guided-timer-fill');
      if(el){const mm=String(Math.floor(_gTimerSec/60)).padStart(2,'0'),ss=String(_gTimerSec%60).padStart(2,'0');el.textContent=`${mm}:${ss}`;el.classList.add('running');}
      if(fill&&_gTimerTotal>0){const pct=Math.min(_gTimerSec/_gTimerTotal*100,100);fill.style.width=pct+'%';}
    } else {
      _gTimerSec--;
      const el=document.getElementById('guided-timer-display');
      const fill=document.getElementById('guided-timer-fill');
      if(el){const mm=String(Math.floor(_gTimerSec/60)).padStart(2,'0'),ss=String(_gTimerSec%60).padStart(2,'0');el.textContent=`${mm}:${ss}`;el.classList.add('running');}
      if(fill&&_gTimerTotal>0){fill.style.width=((1-_gTimerSec/_gTimerTotal)*100).toFixed(1)+'%';}
      if(_gTimerSec<=0){
        clearInterval(_gInterval);_gInterval=null;_gRunning=false;
        _gSession++;playAubeBeep();
        if(_gSession>=(flow.sessions||1)){renderGuidedDone();}
        else{_gTimerSec=flow.duration;_gTimerTotal=flow.duration;showToast('Session '+_gSession+' terminée 🌟');setTimeout(()=>renderGuided(),600);}
      }
    }
  },1000);
  renderGuided();
}

function guidedTimerPause(){
  if(_gInterval){clearInterval(_gInterval);_gInterval=null;}
  _gRunning=false; renderGuided();
}

function guidedTimerStop(){
  if(_gInterval){clearInterval(_gInterval);_gInterval=null;}
  _gRunning=false;
}

function renderGuidedDone(){
  guidedTimerStop();
  const item=PROGRAM.find(p=>p.id===_gId)||getPrayerItems().find(p=>p.id===_gId); if(!item)return;
  // toggleItem gère : save, patchAfterToggle, toast, renderPathSmooth, fireCompletionOverlay
  if(!S.checklist[_gId]) toggleItem(_gId);
  document.getElementById('guided-dots').innerHTML='';
  document.getElementById('guided-xp-tag').textContent='';
  const msgs=['Que Allah l\'accepte de toi.','Barakallahu fik.','Petit mais constant — c\'est le secret.','Les anges sont témoins de ta constance.','Continue ainsi — chaque jour compte.'];
  document.getElementById('guided-body').innerHTML=`<div class="guided-done fade-up">
    <div class="guided-done-emoji">✨</div>
    <div class="guided-done-title">Accompli !</div>
    <div class="guided-done-sub">${msgs[Math.floor(Math.random()*msgs.length)]}</div>
  </div>`;
  const cta=document.getElementById('guided-cta');
  if((_gId===3||_gId===100)&&!S.checklist[2]){
    cta.textContent='Commencer la séance →';
    cta.onclick=()=>{closeGuided();setTimeout(()=>openSeanceGuidee(),450);};
  }else{
    cta.textContent='Retour →';
    cta.onclick=()=>closeGuided();
  }
}

function closeGuided(){
  guidedTimerStop();
  document.getElementById('guided-screen').classList.remove('show');
  setTimeout(()=>{document.getElementById('guided-body').innerHTML='';_gId=null;renderPath();},420);
}

// ═══ SÉANCE DHIKR ═══
const _SD_EMOJIS=['📿','💚','✨'];
let _sdTimes=[5,5,5],_sdStep=0,_sdSec=0,_sdTotal=0,_sdInterval=null;

function openSeanceDhikr(){
  if(!S.premium){showPremiumGate();return;}
  _sdTimes=[5,5,5];
  renderSdmRows();
  document.getElementById('seance-dhikr-modal').classList.add('show');
}
function closeSdmModal(){
  document.getElementById('seance-dhikr-modal').classList.remove('show');
}
function renderSdmRows(){
  document.getElementById('sdm-rows').innerHTML=DHIKR_LIST.map((d,i)=>`
    <div class="sdm-row">
      <div class="sdm-info">
        <div class="sdm-row-title">${_SD_EMOJIS[i]} ${d.title.split('—')[0].trim()}</div>
        <div class="sdm-row-arabic">${d.arabic}</div>
      </div>
      <div class="sdm-stepper">
        <div class="sdm-btn" onclick="sdmAdjust(${i},-1)">−</div>
        <div class="sdm-val" id="sdm-val-${i}">${_sdTimes[i]} min</div>
        <div class="sdm-btn" onclick="sdmAdjust(${i},1)">+</div>
      </div>
    </div>`).join('');
  updateSdmTotal();
}
function sdmAdjust(i,delta){
  _sdTimes[i]=Math.max(1,Math.min(30,_sdTimes[i]+delta));
  document.getElementById('sdm-val-'+i).textContent=_sdTimes[i]+' min';
  updateSdmTotal();
}
function updateSdmTotal(){
  document.getElementById('sdm-total').textContent=_sdTimes.reduce((a,b)=>a+b,0)+' min';
}
function startSeanceDhikr(){
  closeSdmModal();
  _sdStep=0;
  setTimeout(()=>{document.getElementById('seance-dhikr-screen').classList.add('show');renderSeanceStep();},320);
}
function renderSeanceStep(){
  if(_sdStep>=DHIKR_LIST.length){renderSeanceDone();return;}
  const d=DHIKR_LIST[_sdStep];
  _sdSec=_sdTimes[_sdStep]*60;_sdTotal=_sdSec;
  // dots
  document.getElementById('sds-dots').innerHTML=DHIKR_LIST.map((_,i)=>
    `<div class="sds-dot${i<_sdStep?' done':i===_sdStep?' active':''}"></div>`).join('');
  // body
  document.getElementById('sds-body').innerHTML=`
    <div class="sds-step-label">${_SD_EMOJIS[_sdStep]} · ${_sdStep+1} / ${DHIKR_LIST.length}</div>
    <div class="sds-arabic">${d.arabic}</div>
    <div class="sds-phonetic">${d.phonetic}</div>
    <div class="sds-french">${d.french}</div>
    <div class="sds-countdown" id="sds-countdown">${fmtSds(_sdSec)}</div>
    <div class="sds-bar"><div class="sds-fill" id="sds-fill" style="width:100%"></div></div>`;
  // cta
  const isLast=_sdStep===DHIKR_LIST.length-1;
  const cta=document.getElementById('sds-cta');
  cta.textContent=isLast?'Terminer ✓':'Passer au suivant →';
  cta.onclick=()=>{clearInterval(_sdInterval);_sdStep++;renderSeanceStep();};
  // timer
  if(_sdInterval)clearInterval(_sdInterval);
  _sdInterval=setInterval(()=>{
    _sdSec--;
    const cd=document.getElementById('sds-countdown');
    const fill=document.getElementById('sds-fill');
    if(!cd){clearInterval(_sdInterval);return;}
    cd.textContent=fmtSds(_sdSec);
    cd.classList.toggle('urgent',_sdSec<=10&&_sdSec>0);
    if(fill)fill.style.width=((_sdSec/_sdTotal)*100).toFixed(1)+'%';
    document.getElementById('sds-timer-top').textContent=fmtSds(_sdSec);
    if(_sdSec<=0){
      clearInterval(_sdInterval);
      if(navigator.vibrate)navigator.vibrate([80,40,80]);
      _sdStep++;
      setTimeout(()=>renderSeanceStep(),500);
    }
  },1000);
}
function renderSeanceDone(){
  if(_sdInterval){clearInterval(_sdInterval);_sdInterval=null;}
  document.getElementById('sds-dots').innerHTML=DHIKR_LIST.map(()=>`<div class="sds-dot done"></div>`).join('');
  document.getElementById('sds-timer-top').textContent='';
  document.getElementById('sds-body').innerHTML=`
    <div class="guided-done">
      <div class="guided-done-emoji">📿</div>
      <div class="guided-done-title">Séance accomplie</div>
      <div class="guided-done-sub">barakAllahu fik — que cette assise soit agréée.</div>
    </div>`;
  const cta=document.getElementById('sds-cta');
  cta.textContent='Fermer';
  cta.onclick=()=>closeSeanceDhikr();
}
function closeSeanceDhikr(){
  if(_sdInterval){clearInterval(_sdInterval);_sdInterval=null;}
  document.getElementById('seance-dhikr-screen').classList.remove('show');
}
function fmtSds(s){const m=Math.floor(Math.max(s,0)/60),sec=Math.max(s,0)%60;return m+':'+(sec+'').padStart(2,'0');}
document.getElementById('seance-dhikr-modal').addEventListener('click',e=>{if(e.target===e.currentTarget)closeSdmModal();});

// ═══ ANALYTICS ═══
function getUid() {
  const user = _auth.currentUser;
  if (user) return user.uid;
  let uid = localStorage.getItem('_dawam_uid');
  if (!uid) { uid = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('_dawam_uid', uid); }
  return uid;
}
function track(event) { /* PREPROD : telemetry désactivée */ }

// ═══ INIT ═══
function launchApp(){
  loadTheme();
  showScreen("path");
  document.getElementById("bottom-nav").classList.add("visible");
  document.getElementById("tab-path").classList.add("active");
  renderPath();
  if(S.profile&&S.profile.city){
    fetchPrayerTimes(S.profile.city).then(pt=>{if(pt){S.prayerTimes=pt;save();renderPath();}});
  }
  setTimeout(showInstallBanner,3000);
  // Premier lancement : mettre en avant la première action
  if(!S.history.length&&!S._firstStepShown){
    S._firstStepShown=true;save();
    setTimeout(()=>{
      const items=getActiveItems();
      const first=items.find(i=>!S.checklist[i.id]);
      if(first)showToast(`Commence maintenant → ${first.emoji} ${first.titleFr}`);
    },900);
  }
  // Groupes : charger le groupe actif
  initGroupes();
  // Vérifie l'abonnement actif côté Apple (restore silencieux au lancement)
  verifySubscription();
}
function dismissNotifPrompt(){
  document.getElementById('notif-prompt').classList.remove('show');
  S.notifAsked=true;save();
  renderPathSmooth();
}
async function activateNotifsFromPrompt(){
  const btn=document.querySelector('#notif-prompt .btn-primary');
  btn.textContent='Activation…';btn.disabled=true;
  if(window.isNativeIOSApp){
    window.webkit.messageHandlers.requestNotifPermission.postMessage({});
    return;
  }
  try{
    if(!('Notification' in window)||!('PushManager' in window))throw new Error('unsupported');
    const perm=await Notification.requestPermission();
    if(perm!=='granted')throw new Error('denied');
    const sub=await subscribePush();
    await fetch(`${PUSH_WORKER}/subscribe`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...sub.toJSON(),city:S.profile?.city||'',fajrOffset:S.profile?.fajrOffset??15,palier:S.palier||1,prayers:S.profile?.prayers||[]})});
    S.notifs={pushSub:sub.endpoint};save();
    showToast('Rappels activés ✓');
  }catch(e){
    showToast(e.message==='denied'?'Permission refusée':'Notifications non disponibles');
  }
  dismissNotifPrompt();
}

// confirm() universel : bridge Swift sur iOS natif, confirm() standard ailleurs
function nativeConfirm(message) {
  if (window.isNativeIOSApp) {
    return new Promise(resolve => {
      const id = '_confirm_' + Date.now();
      window[id] = resolve;
      window.webkit.messageHandlers.showConfirm.postMessage({
        message,
        ok:     `window['${id}'](true)`,
        cancel: `window['${id}'](false)`,
      });
    });
  }
  return Promise.resolve(confirm(message));
}

// Callback appelé par Swift après demande de permission APNs
window.nativeNotifResult = function(granted, apnsToken) {
  const btn = document.querySelector('#notif-prompt .btn-primary');
  if (btn) { btn.textContent = 'Activer les rappels'; btn.disabled = false; }
  if (!granted) {
    showToast('Permission refusée — active-la dans Réglages > Dawam');
    dismissNotifPrompt();
    return;
  }
  S.notifs = { pushSub: 'apns:' + apnsToken };
  save();
  renderNotifToggle();
  showToast('Rappels activés ✓');
  dismissNotifPrompt();
  // Enregistre le token APNs sur le serveur
  if (apnsToken && apnsToken !== 'simulator-token') {
    fetch(PUSH_WORKER + '/subscribe-apns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceToken: apnsToken,
        city:    S.profile?.city    || '',
        palier:  S.palier           || 1,
        prayers: S.profile?.prayers || [],
      }),
    }).catch(() => {});
  }
};

// ═══ INIT ═══
load();

// ── Loader GSAP ──
const _loaderStart = Date.now();
const _LOADER_MIN = 2200; // ms minimum d'affichage
(function _playLoader() {
  gsap.set('#al-ring',  { strokeDashoffset: 326 });
  gsap.set('#al-ring2', { strokeDashoffset: 264 });
  gsap.set('#al-star',  { opacity: 0, scale: .4, transformOrigin: 'center' });
  gsap.set('.al-l',     { opacity: 0, y: 18 });
  gsap.set('#al-tag',   { opacity: 0, y: 6 });
  gsap.set(['#al-dot1','#al-dot2','#al-dot3','#al-dot4'], { opacity: 0, scale: 0, transformOrigin: 'center' });
  const tl = gsap.timeline();
  tl.to('#al-ring',  { strokeDashoffset: 0, duration: .9, ease: 'power2.inOut' })
    .to('#al-ring2', { strokeDashoffset: 0, duration: .6, ease: 'power2.out' }, '-=.5')
    .to(['#al-dot1','#al-dot2','#al-dot3','#al-dot4'], { opacity: 1, scale: 1, duration: .3, stagger: .08, ease: 'back.out(3)' }, '-=.3')
    .to('#al-star',  { opacity: 1, scale: 1, duration: .45, ease: 'back.out(2.5)', transformOrigin: '50% 50%' }, '-=.15')
    .to('.al-l',     { opacity: 1, y: 0, duration: .35, stagger: .07, ease: 'back.out(1.8)' }, '-=.1')
    .to('#al-tag',   { opacity: 1, y: 0, duration: .4 }, '-=.05')
    .to('#al-svg',   { rotation: 8, duration: 2, ease: 'power1.inOut', yoyo: true, repeat: 1 }, '-=.8');
})();

function _hideLoader() {
  const elapsed = Date.now() - _loaderStart;
  const delay = Math.max(0, _LOADER_MIN - elapsed);
  setTimeout(() => {
    const loader = document.getElementById('auth-loader');
    loader.classList.add('hiding');
    setTimeout(() => loader.style.display = 'none', 380);
  }, delay);
}

// PREPROD : pas d'auth — onboarding si premier lancement, sinon app directe
window._isPreprod = true;
(function(){
  _hideLoader();
  if (typeof load === 'function') load();
  if (S.name) {
    if (typeof launchApp === 'function') launchApp();
  } else {
    showScreen('splash');
  }
})();

// ═══ ABONNEMENT PREMIUM ═══

function verifySubscription() {
  if (!window.isNativeIOSApp) return;
  try { window.webkit.messageHandlers.restorePurchases.postMessage({}); } catch(_) {}
}

window.restoreResult = function(active) {
  if (active && !S.premium) { S.premium = true; save(); renderPath(); }
};

// Callback IAP — redéfini par onboarding.js pendant l'onboarding,
// puis reprend cette version pour les achats depuis l'app
window.iapResult = function(success, detail) {
  if (success) {
    S.premium = true; save();
    showToast('Premium activé ✓');
    renderPath();
  } else if (detail !== 'cancelled') {
    showToast('Achat non disponible pour le moment.');
  }
};

function showPremiumGate() {
  if (window.isNativeIOSApp) {
    try { window.webkit.messageHandlers.purchaseSubscription.postMessage({}); } catch(_) {}
  } else {
    showToast('Fonctionnalité Premium · disponible après abonnement.');
  }
}

// ═══ iOS NATIVE DETECTION ═══
if (window.isNativeIOSApp) {
  document.body.classList.add('ios-native');
  document.getElementById('auth-apple-block').style.display = 'block';
  document.getElementById('auth-google-block').style.display = 'none';
}

// ═══ TAB INDICATOR (Liquid Glass) ═══
(function() {
  'use strict';
  const TABS = ['path', 'invocations', 'groupes', 'profil'];
  const nav  = document.getElementById('bottom-nav');
  const ind  = document.getElementById('nav-indicator');
  if (!nav || !ind) return;

  let currentX = 0;

  const tw  = () => nav.offsetWidth / 4;
  const lft = i  => i * tw();

  function getActiveIdx() {
    for (let i = 0; i < TABS.length; i++)
      if (document.getElementById('tab-' + TABS[i])?.classList.contains('active')) return i;
    return 0;
  }

  function slideTo(newX) {
    ind.style.transition = 'transform 380ms cubic-bezier(.34,1.2,.64,1)';
    ind.style.transform  = `translateX(${newX}px)`;
    currentX = newX;
  }

  function jumpTo(newX) { slideTo(newX); }

  const _orig = window.showTab;
  if (typeof _orig === 'function') {
    window.showTab = function(id, el) {
      const tabIds = ['tab-path', 'tab-invocations', 'tab-groupes', 'tab-profil'];
      const idx    = tabIds.indexOf(el?.id ?? '');
      _orig.call(this, id, el);
      if (idx >= 0) jumpTo(lft(idx));
    };
  }

  currentX = lft(getActiveIdx());
  ind.style.transition = 'none';
  ind.style.transform  = `translateX(${currentX}px)`;

  // Couche de texture verre dépoli (grain SVG sur dégradé clair)
  const tex = document.createElement('div');
  tex.style.cssText = [
    'position:absolute',
    'inset:0',
    'border-radius:inherit',
    'background:linear-gradient(145deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,.04) 50%,rgba(255,255,255,.13) 100%)',
    'filter:url(#lqg)',
    'pointer-events:none',
    'z-index:1'
  ].join(';');
  ind.appendChild(tex);
})();
