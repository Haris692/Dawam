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
const PUSH_MSGS = [
  { title: "Dawam 🌙", body: "Heure du Witr — commence ta journée avec Allah." },
  { title: "Dawam 🌄", body: "La séance de l'aube t'attend. Petit, mais constant." },
  { title: "Dawam 📿", body: "N'oublie pas ton programme spirituel aujourd'hui." },
  { title: "Dawam ☀️", body: "Une nouvelle journée, une nouvelle occasion de constance." },
  { title: "Dawam 💚", body: "Renouvelle ton intention et reprends là où tu t'es arrêté." },
];

self.addEventListener("push", e => {
  const msg = PUSH_MSGS[Math.floor(Math.random() * PUSH_MSGS.length)];
  e.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [200, 100, 200],
      tag: "dawam-daily",
      renotify: true,
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
