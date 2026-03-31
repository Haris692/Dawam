const CACHE = "dawam-v3";
const ASSETS = [
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  // Prendre le contrôle immédiatement (important pour migrer depuis une ancienne version sans bouton de mise à jour)
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// L'app envoie "skipWaiting" quand l'utilisateur accepte la mise à jour
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

// ── Push notification reçue du serveur ────────────────────────────────────
const PUSH_MSGS = {
  qiyam: {
    title: "Dawam 🌙",
    body: "L'heure du Witr approche. Lève-toi et commence ta journée avec Allah.",
  },
  aube: {
    title: "Dawam 🌄",
    body: "La séance de l'aube t'attend — Coran, adhkar, constance.",
  },
  journee: {
    title: "Dawam ☀️",
    body: "Rappel de journée : bénédictions sur le Prophète ﷺ et garde du temps.",
  },
  nuit: {
    title: "Dawam 🌙",
    body: "Avant de dormir — les convenances du sommeil t'attendent.",
  },
  default: {
    title: "Dawam 📿",
    body: "Ton programme spirituel t'attend. Petit, mais constant.",
  },
};

self.addEventListener("push", e => {
  let type = "default";
  if (e.data) {
    try { type = e.data.text().trim(); } catch (_) {}
  }
  const msg = PUSH_MSGS[type] ?? PUSH_MSGS.default;
  e.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [200, 100, 200],
      tag: "dawam-daily",
      renotify: true,
      data: { type },
    })
  );
});

// Clic sur la notification → ouvre l'app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) return clients[0].focus();
      return self.clients.openWindow("./");
    })
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const isHTML = url.pathname.endsWith(".html") || url.pathname.endsWith("/") || url.pathname === "";

  if (isHTML) {
    // Network-first pour index.html : toujours récupérer la dernière version
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Cache-first pour les assets (fonts, images…)
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        }).catch(() => caches.match("./index.html"));
      })
    );
  }
});
