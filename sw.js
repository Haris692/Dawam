const CACHE = "dawam-v19";
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
  aube: {
    title: "Dawam 🌄",
    body: "Ta séance de l'aube t'attend — Coran, adhkar du matin, constance.",
  },
  journee: {
    title: "Dawam ☀️",
    body: "Ta séance de la journée t'attend — maintiens ta constance.",
  },
  soir: {
    title: "Dawam 🌙",
    body: "Ta séance du soir t'attend — adhkar, actes avant le sommeil.",
  },
  aprem: {
    title: "Dawam ⏰",
    body: "Tes actions du jour t'attendent — quelques minutes suffisent.",
  },
  default: {
    title: "Dawam 📿",
    body: "Ton programme spirituel t'attend. Petit, mais constant.",
  },
};

self.addEventListener("push", e => {
  e.waitUntil((async () => {
    let type = "default";
    let customTitle = null, customBody = null;

    // 1. Essaie de lire le type depuis le payload (Android/Chrome)
    if (e.data) {
      try {
        const text = e.data.text().trim();
        try {
          const parsed = JSON.parse(text);
          type = parsed.type || text;
          if (parsed.title) customTitle = parsed.title;
          if (parsed.body) customBody = parsed.body;
        } catch (_) { type = text; }
      } catch (_) {}
    }

    // 2. Si pas de payload (iOS) ou type inconnu → demande au serveur selon heure + ville
    if (!PUSH_MSGS[type] || type === "default") {
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          const res = await fetch(
            "https://dawam-push.mydawam.workers.dev/notification-type?endpoint=" +
            encodeURIComponent(sub.endpoint)
          );
          const data = await res.json();
          if (data.type && data.type !== "default") {
            type = data.type;
            if (data.title) customTitle = data.title;
            if (data.body) customBody = data.body;
          }
        }
      } catch (_) {}
    }

    // 3. Telemetrie
    fetch("https://dawam-push.mydawam.workers.dev/push-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, hasData: !!e.data, ts: Date.now() }),
    }).catch(() => {});

    const fallback = PUSH_MSGS[type] ?? PUSH_MSGS.default;
    const title = customTitle || fallback.title;
    const body = customBody || fallback.body;
    await self.registration.showNotification(title, {
      body,
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      vibrate: [200, 100, 200],
      tag: "dawam-" + type,
      data: { type },
    });
  })());
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
