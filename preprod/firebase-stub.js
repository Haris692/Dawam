(function(){
  // ── Stub firebase minimal ──
  const noop = () => {};
  const chain = new Proxy(function(){}, {
    get: () => chain,
    apply: () => chain,
    construct: () => chain
  });
  const fakeUser = null;
  const fakeAuth = {
    setPersistence: () => Promise.resolve(),
    onAuthStateChanged: (cb) => { setTimeout(() => cb(fakeUser), 0); return noop; },
    getRedirectResult: () => Promise.resolve({ user: null }),
    signInWithPopup: () => Promise.reject(new Error('preprod: auth désactivée')),
    signInWithRedirect: () => Promise.reject(new Error('preprod: auth désactivée')),
    signInWithEmailAndPassword: () => Promise.reject(new Error('preprod: auth désactivée')),
    signInWithCredential: () => Promise.reject(new Error('preprod: auth désactivée')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('preprod: auth désactivée')),
    sendPasswordResetEmail: () => Promise.reject(new Error('preprod: auth désactivée')),
    signOut: () => Promise.resolve(),
    currentUser: null,
    Persistence: { LOCAL: 'local', SESSION: 'session', NONE: 'none' }
  };
  const fakeDoc = {
    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    onSnapshot: () => noop,
    collection: () => fakeCollection
  };
  const fakeCollection = {
    doc: () => fakeDoc,
    add: () => Promise.resolve({ id: 'preprod' }),
    where: function(){ return this; },
    orderBy: function(){ return this; },
    limit: function(){ return this; },
    get: () => Promise.resolve({ empty: true, docs: [], forEach: noop }),
    onSnapshot: () => noop
  };
  const fakeDb = {
    collection: () => fakeCollection,
    doc: () => fakeDoc,
    runTransaction: (fn) => Promise.resolve(fn({ get: () => Promise.resolve({ exists: false, data: () => ({}) }), set: noop, update: noop, delete: noop }))
  };
  window.firebase = {
    initializeApp: () => ({}),
    auth: Object.assign(() => fakeAuth, {
      Auth: { Persistence: fakeAuth.Persistence },
      GoogleAuthProvider: function(){ this.addScope = noop; },
      OAuthProvider: function(){ this.credential = () => ({}); }
    }),
    firestore: Object.assign(() => fakeDb, {
      FieldValue: {
        increment: (n) => n,
        arrayUnion: (...a) => a,
        arrayRemove: (...a) => a,
        serverTimestamp: () => new Date(),
        delete: () => null
      },
      Timestamp: { now: () => ({ toDate: () => new Date() }) }
    })
  };

  // ── Seed localStorage pour bypass splash/onboarding ──
  const STORAGE_KEY = 'dawam_v1';
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: 'Haris',
      profile: { salat: 5, quran: 1, witr: 1, type: 'worker', goal: ['fajr'], city: 'Paris' },
      palier: 2,
      weekNumber: 1,
      totalDays: 3,
      checklist: {},
      lastDate: null,
      history: [],
      customSteps: null,
      prayerTimes: null,
      versetSelection: [],
      versetLastStep: 0,
      _firstStepShown: true,
      notifAsked: true,
      notifBannerDismissed: true
    }));
  }
})();
